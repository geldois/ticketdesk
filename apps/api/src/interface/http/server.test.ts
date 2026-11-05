import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  TicketHistoryEntryResponse,
  TicketResponse,
} from "@ticketdesk/contract";
import Fastify, {
  type FastifyInstance,
  type LightMyRequestResponse,
} from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createMigratedTestDatabase } from "../../../test/database.ts";
import { InvalidLimitError } from "../../application/errors.ts";
import { buildContainer } from "../../config/container.ts";
import { PgStorage } from "../../infrastructure/pg-storage.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { encodeCursor } from "./cursor.ts";
import { handleError } from "./error-handler.ts";
import { buildServer } from "./server.ts";
import { InvalidWebDistDirError } from "./web/errors.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const UNKNOWN_TICKET_ID = "019a0000-0000-7000-8000-000000000000";
const UNREACHABLE_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:1/db";
const POSITION = {
  createdAt: "2026-03-01T10:00:00.000000Z",
  id: "019a0000-0000-7000-8000-000000000001",
} as const;
const JSON_HEADERS = { "content-type": "application/json" };
const VALID_BODY = {
  customerName: "Ana",
  description: "Printer is down",
  channel: "chat",
  priority: "high",
};

const TO_IN_PROGRESS = {
  to: "in_progress",
  resolutionNote: null,
  reopenReason: null,
};
const TO_RESOLVED = {
  to: "resolved",
  resolutionNote: "Replaced the toner",
  reopenReason: null,
};
const PATH_TO_STATUS = {
  open: [],
  in_progress: [TO_IN_PROGRESS],
  resolved: [TO_IN_PROGRESS, TO_RESOLVED],
};

function readProblem(response: LightMyRequestResponse) {
  const body = response.json<Record<string, unknown>>();

  return {
    statusCode: response.statusCode,
    mediaType: String(response.headers["content-type"]).split(";")[0],
    fields: Object.keys(body).toSorted(),
    status: body["status"],
    code: body["code"],
    textFields: ["detail", "title", "type"].every(
      (field) => typeof body[field] === "string",
    ),
  };
}

function problem(status: number, code: string) {
  return {
    statusCode: status,
    mediaType: "application/problem+json",
    fields: ["code", "detail", "status", "title", "type"],
    status,
    code,
    textFields: true,
  };
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

// O alvo do Link rel="next", que a spec manda ser um caminho relativo.
function readNextTarget(response: LightMyRequestResponse): string | undefined {
  return /^<([^>]+)>; rel="next"$/.exec(String(response.headers.link))?.[1];
}

function readParamNames(target: string): string[] {
  return [...new URL(target, "http://localhost").searchParams.keys()];
}

describe("the HTTP server", () => {
  let pgPool: Pool;
  let unreachablePgPool: Pool;
  let server: FastifyInstance;
  let unreachableServer: FastifyInstance;

  beforeAll(async () => {
    pgPool = createPgPool(await createMigratedTestDatabase());
    unreachablePgPool = createPgPool(UNREACHABLE_DATABASE_URL);
    server = buildServer({
      container: buildContainer({
        now: () => INSTANT,
        storage: new PgStorage(pgPool),
      }),
      webDistDir: null,
      logger: { level: "silent" },
    });
    unreachableServer = buildServer({
      container: buildContainer({
        now: () => INSTANT,
        storage: new PgStorage(unreachablePgPool),
      }),
      webDistDir: null,
      logger: { level: "silent" },
    });
  });

  afterAll(async () => {
    await server.close();
    await unreachableServer.close();
    await pgPool.end();
    await unreachablePgPool.end();
  });

  async function countTickets(): Promise<number> {
    const result = await pgPool.query<{ total: string }>(
      "SELECT count(*) AS total FROM ticket",
    );

    return Number(result.rows[0]?.total);
  }

  function postTicket(
    payload: string,
    headers: Record<string, string> = JSON_HEADERS,
  ): Promise<LightMyRequestResponse> {
    return server.inject({ method: "POST", url: "/tickets", payload, headers });
  }

  describe("POST /tickets", () => {
    it("answers 201 with the Location of the ticket and the ten contract fields, open at version 1 and stamped by the clock", async () => {
      const response = await postTicket(JSON.stringify(VALID_BODY));
      const ticket = response.json<TicketResponse>();

      expect(response.statusCode).toBe(201);
      expect(response.headers.location).toBe(`/tickets/${ticket.id}`);
      expect(ticket).toEqual({
        id: ticket.id,
        customerName: "Ana",
        description: "Printer is down",
        channel: "chat",
        priority: "high",
        status: "open",
        resolutionNote: null,
        version: 1,
        createdAt: "2026-01-01T10:20:30.123Z",
        nextTransitions: [{ to: "in_progress", requires: null }],
      });
    });

    it.each([
      ["JSON with invalid syntax", "{"],
      ["an empty body sent as JSON", ""],
      ["a JSON null", "null"],
      ["a JSON array", "[]"],
      ["a JSON string", '"text"'],
      [
        "a body without customerName",
        { ...VALID_BODY, customerName: undefined },
      ],
      ["a body without description", { ...VALID_BODY, description: undefined }],
      ["a body without channel", { ...VALID_BODY, channel: undefined }],
      ["a body without priority", { ...VALID_BODY, priority: undefined }],
      ["a number in a text field", { ...VALID_BODY, priority: 1 }],
      ["an unknown field", { ...VALID_BODY, extra: "x" }],
    ])(
      "answers 400 invalid_request and stores nothing for %s",
      async (_name, payload) => {
        const before = await countTickets();

        const response = await postTicket(
          typeof payload === "string" ? payload : JSON.stringify(payload),
        );

        expect(readProblem(response)).toEqual(problem(400, "invalid_request"));
        expect(await countTickets()).toBe(before);
      },
    );

    it.each([
      ["no content-type", {}],
      ["application/xml", { "content-type": "application/xml" }],
    ])(
      "answers 415 invalid_request for a body with %s",
      async (_name, headers) => {
        const before = await countTickets();

        const response = await postTicket("<a/>", headers);

        expect(readProblem(response)).toEqual(problem(415, "invalid_request"));
        expect(await countTickets()).toBe(before);
      },
    );

    it("answers 413 invalid_request and stores nothing for a body over the limit", async () => {
      const before = await countTickets();

      const response = await postTicket(
        JSON.stringify({ ...VALID_BODY, description: "x".repeat(1_100_000) }),
      );

      expect(readProblem(response)).toEqual(problem(413, "invalid_request"));
      expect(await countTickets()).toBe(before);
    });

    it("answers 400 invalid_request, not 500, for another client error that Fastify raises", async () => {
      const response = await postTicket(JSON.stringify(VALID_BODY), {
        ...JSON_HEADERS,
        "content-length": "999",
      });

      expect(readProblem(response)).toEqual(problem(400, "invalid_request"));
    });

    it("answers 400 invalid_request for a text/plain body, which is not an object", async () => {
      const response = await postTicket("hello", {
        "content-type": "text/plain",
      });

      expect(readProblem(response)).toEqual(problem(400, "invalid_request"));
    });

    it.each([
      [
        "a customer name with a control character",
        { ...VALID_BODY, customerName: "Ana\u0001" },
        "invalid_customer_name",
      ],
      [
        "an empty description",
        { ...VALID_BODY, description: "" },
        "invalid_description",
      ],
      [
        "the channel fax",
        { ...VALID_BODY, channel: "fax" },
        "invalid_ticket_channel",
      ],
      [
        "the priority urgent",
        { ...VALID_BODY, priority: "urgent" },
        "invalid_ticket_priority",
      ],
    ])(
      "answers 422 with the domain code and stores nothing for %s",
      async (_name, payload, code) => {
        const before = await countTickets();

        const response = await postTicket(JSON.stringify(payload));

        expect(readProblem(response)).toEqual(problem(422, code));
        expect(await countTickets()).toBe(before);
      },
    );
  });

  describe("GET /tickets/:id", () => {
    it("answers 200 with the same body that creating answered", async () => {
      const created = await postTicket(JSON.stringify(VALID_BODY));
      const ticket = created.json<TicketResponse>();

      const response = await server.inject({
        method: "GET",
        url: `/tickets/${ticket.id}`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json<TicketResponse>()).toEqual(ticket);
    });

    it("answers the ETag equal to the version of the body, in quotes", async () => {
      const created = await postTicket(JSON.stringify(VALID_BODY));
      const ticket = created.json<TicketResponse>();
      await server.inject({
        method: "POST",
        url: `/tickets/${ticket.id}/transitions`,
        payload: JSON.stringify(TO_IN_PROGRESS),
        headers: { ...JSON_HEADERS, "if-match": '"1"' },
      });

      const response = await server.inject({
        method: "GET",
        url: `/tickets/${ticket.id}`,
      });

      expect(response.json<TicketResponse>().version).toBe(2);
      expect(response.headers.etag).toBe('"2"');
    });

    it("answers 400 invalid_ticket_id for an id that is not a UUID", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/tickets/abc",
      });

      expect(readProblem(response)).toEqual(problem(400, "invalid_ticket_id"));
    });

    it("answers 404 ticket_not_found for a UUID that does not exist", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/tickets/${UNKNOWN_TICKET_ID}`,
      });

      expect(readProblem(response)).toEqual(problem(404, "ticket_not_found"));
    });
  });

  describe("GET /tickets/:id/history", () => {
    it("answers 200 with the creation entry and no identifier of the database", async () => {
      const created = await postTicket(JSON.stringify(VALID_BODY));
      const ticket = created.json<TicketResponse>();

      const response = await server.inject({
        method: "GET",
        url: `/tickets/${ticket.id}/history`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json<TicketHistoryEntryResponse[]>()).toEqual([
        {
          from: null,
          to: "open",
          resolutionNote: null,
          reopenReason: null,
          at: ticket.createdAt,
        },
      ]);
    });

    it("answers 400 invalid_ticket_id for an id that is not a UUID", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/tickets/abc/history",
      });

      expect(readProblem(response)).toEqual(problem(400, "invalid_ticket_id"));
    });

    it("answers 404 ticket_not_found for a UUID that does not exist", async () => {
      const response = await server.inject({
        method: "GET",
        url: `/tickets/${UNKNOWN_TICKET_ID}/history`,
      });

      expect(readProblem(response)).toEqual(problem(404, "ticket_not_found"));
    });
  });

  describe("POST /tickets/:id/transitions", () => {
    async function createTicket(): Promise<TicketResponse> {
      const response = await postTicket(JSON.stringify(VALID_BODY));

      return response.json<TicketResponse>();
    }

    function transit(
      id: string,
      ifMatch: string | undefined,
      payload: unknown = TO_IN_PROGRESS,
    ): Promise<LightMyRequestResponse> {
      return server.inject({
        method: "POST",
        url: `/tickets/${id}/transitions`,
        payload:
          typeof payload === "string" ? payload : JSON.stringify(payload),
        headers: {
          ...JSON_HEADERS,
          ...(ifMatch === undefined ? {} : { "if-match": ifMatch }),
        },
      });
    }

    async function createTicketIn(status: keyof typeof PATH_TO_STATUS) {
      const ticket = await createTicket();
      const path = PATH_TO_STATUS[status];

      for (const [index, payload] of path.entries()) {
        await transit(ticket.id, `"${(index + 1).toString()}"`, payload);
      }

      return { id: ticket.id, version: path.length + 1 };
    }

    async function snapshot(id: string) {
      const ticket = await server.inject({
        method: "GET",
        url: `/tickets/${id}`,
      });
      const history = await server.inject({
        method: "GET",
        url: `/tickets/${id}/history`,
      });

      return { ticket: ticket.body, history: history.body };
    }

    it("answers 200 with the ticket in the new status, the ETag of the new version and the entry stamped by the clock", async () => {
      const ticket = await createTicket();

      const response = await transit(ticket.id, '"1"');

      expect(response.statusCode).toBe(200);
      expect(response.headers.etag).toBe('"2"');
      expect(response.json<TicketResponse>()).toEqual({
        ...ticket,
        status: "in_progress",
        version: 2,
        nextTransitions: [{ to: "resolved", requires: "resolutionNote" }],
      });
      const history = await server.inject({
        method: "GET",
        url: `/tickets/${ticket.id}/history`,
      });
      expect(history.json<TicketHistoryEntryResponse[]>()).toEqual([
        {
          from: null,
          to: "open",
          resolutionNote: null,
          reopenReason: null,
          at: ticket.createdAt,
        },
        {
          from: "open",
          to: "in_progress",
          resolutionNote: null,
          reopenReason: null,
          at: "2026-01-01T10:20:30.123Z",
        },
      ]);
    });

    it("answers 200 when resolving with a note and when reopening with a reason, and the note leaves the ticket on reopening", async () => {
      const { id } = await createTicketIn("in_progress");

      const resolved = await transit(id, '"2"', TO_RESOLVED);
      const reopened = await transit(id, '"3"', {
        to: "open",
        resolutionNote: null,
        reopenReason: "Jammed again",
      });

      expect(resolved.statusCode).toBe(200);
      expect(resolved.json<TicketResponse>().resolutionNote).toBe(
        "Replaced the toner",
      );
      expect(reopened.statusCode).toBe(200);
      expect(reopened.headers.etag).toBe('"4"');
      expect(reopened.json<TicketResponse>()).toMatchObject({
        status: "open",
        resolutionNote: null,
        version: 4,
      });
    });

    it("answers 428 missing_if_match and writes nothing without the If-Match header", async () => {
      const { id } = await createTicketIn("open");
      const before = await snapshot(id);

      const response = await transit(id, undefined);

      expect(readProblem(response)).toEqual(problem(428, "missing_if_match"));
      expect(await snapshot(id)).toEqual(before);
    });

    it.each([
      ["a number without quotes", "1"],
      ["a weak validator", 'W/"1"'],
      ["text in quotes", '"abc"'],
      ["zero", '"0"'],
      ["a negative number", '"-1"'],
      ["a decimal", '"1.5"'],
      ["a value too large to be exact", '"99999999999999999999"'],
      ["an empty value", ""],
    ])(
      "answers 400 invalid_if_match and writes nothing for %s",
      async (_name, ifMatch) => {
        const { id } = await createTicketIn("open");
        const before = await snapshot(id);

        const response = await transit(id, ifMatch);

        expect(readProblem(response)).toEqual(problem(400, "invalid_if_match"));
        expect(await snapshot(id)).toEqual(before);
      },
    );

    it.each([
      ["JSON with invalid syntax", "{"],
      ["an empty body sent as JSON", ""],
      ["a JSON array", "[]"],
      ["a body without to", { ...TO_IN_PROGRESS, to: undefined }],
      [
        "a body without resolutionNote",
        { ...TO_IN_PROGRESS, resolutionNote: undefined },
      ],
      [
        "a body without reopenReason",
        { ...TO_IN_PROGRESS, reopenReason: undefined },
      ],
      ["a null to", { ...TO_IN_PROGRESS, to: null }],
      ["a number in a text field", { ...TO_IN_PROGRESS, resolutionNote: 5 }],
      ["an unknown field", { ...TO_IN_PROGRESS, extra: "x" }],
    ])(
      "answers 400 invalid_request and writes nothing for %s",
      async (_name, payload) => {
        const { id } = await createTicketIn("open");
        const before = await snapshot(id);

        const response = await transit(id, '"1"', payload);

        expect(readProblem(response)).toEqual(problem(400, "invalid_request"));
        expect(await snapshot(id)).toEqual(before);
      },
    );

    it("answers 400 invalid_ticket_id for an id that is not a UUID, before looking at the headers", async () => {
      const response = await transit("abc", undefined);

      expect(readProblem(response)).toEqual(problem(400, "invalid_ticket_id"));
    });

    it("answers 404 ticket_not_found for a UUID that does not exist", async () => {
      const response = await transit(UNKNOWN_TICKET_ID, '"1"');

      expect(readProblem(response)).toEqual(problem(404, "ticket_not_found"));
    });

    it("checks the If-Match header, missing and then malformed, before the shape of the body", async () => {
      const { id } = await createTicketIn("open");

      const missing = await transit(id, undefined, {});
      const malformed = await transit(id, "1", {});

      expect(readProblem(missing)).toEqual(problem(428, "missing_if_match"));
      expect(readProblem(malformed)).toEqual(problem(400, "invalid_if_match"));
    });

    it("answers 409 version_conflict with the current ticket and writes nothing when the version is stale", async () => {
      const { id } = await createTicketIn("in_progress");
      const before = await snapshot(id);

      const response = await transit(id, '"1"', TO_RESOLVED);

      expect(readProblem(response)).toEqual({
        ...problem(409, "version_conflict"),
        fields: ["code", "detail", "status", "ticket", "title", "type"],
      });
      expect(JSON.stringify(response.json<{ ticket: unknown }>().ticket)).toBe(
        before.ticket,
      );
      expect(await snapshot(id)).toEqual(before);
    });

    it.each([
      ["open", [{ to: "in_progress", requires: null }]],
      ["in_progress", [{ to: "resolved", requires: "resolutionNote" }]],
      ["resolved", [{ to: "open", requires: "reopenReason" }]],
    ] as const)(
      "carries the next transitions of a ticket in %s when read, in the list and in the body of a 409",
      async (status, expected) => {
        const { id } = await createTicketIn(status);

        const one = await server.inject({
          method: "GET",
          url: `/tickets/${id}`,
        });
        const list = await server.inject({ method: "GET", url: "/tickets" });
        const conflict = await transit(id, '"99"');

        expect(one.json<TicketResponse>().nextTransitions).toEqual(expected);
        expect(
          list.json<TicketResponse[]>().find((listed) => listed.id === id)
            ?.nextTransitions,
        ).toEqual(expected);
        expect(
          conflict.json<{ ticket: TicketResponse }>().ticket.nextTransitions,
        ).toEqual(expected);
      },
    );

    it("answers 409 when the same transition is repeated with the same If-Match", async () => {
      const ticket = await createTicket();
      await transit(ticket.id, '"1"');

      const response = await transit(ticket.id, '"1"');

      expect(readProblem(response)).toMatchObject({
        statusCode: 409,
        code: "version_conflict",
      });
    });

    it.each([
      ["open", "resolving with a note", TO_RESOLVED, "invalid_transition"],
      [
        "open",
        "reopening with a reason",
        { to: "open", resolutionNote: null, reopenReason: "Again" },
        "invalid_transition",
      ],
      [
        "open",
        "starting with a note",
        { ...TO_IN_PROGRESS, resolutionNote: "Done" },
        "unexpected_resolution_note",
      ],
      [
        "open",
        "starting with a reason",
        { ...TO_IN_PROGRESS, reopenReason: "Again" },
        "unexpected_reopen_reason",
      ],
      [
        "open",
        "a status that does not exist",
        { ...TO_IN_PROGRESS, to: "closed" },
        "invalid_transition",
      ],
      [
        "in_progress",
        "resolving without a note",
        { ...TO_RESOLVED, resolutionNote: null },
        "missing_resolution_note",
      ],
      [
        "resolved",
        "reopening without a reason",
        { to: "open", resolutionNote: null, reopenReason: null },
        "missing_reopen_reason",
      ],
      [
        "resolved",
        "going back to in_progress",
        TO_IN_PROGRESS,
        "invalid_transition",
      ],
    ] as const)(
      "answers 422 with the domain code and writes nothing for a %s ticket %s",
      async (status, _name, payload, code) => {
        const { id, version } = await createTicketIn(status);
        const before = await snapshot(id);

        const response = await transit(id, `"${version.toString()}"`, payload);

        expect(readProblem(response)).toEqual(problem(422, code));
        expect(await snapshot(id)).toEqual(before);
      },
    );

    it("ends two concurrent requests with the same If-Match in one 200 and one 409, with a single new history entry", async () => {
      for (let round = 0; round < 20; round += 1) {
        const ticket = await createTicket();

        const responses = await Promise.all([
          transit(ticket.id, '"1"'),
          transit(ticket.id, '"1"'),
        ]);

        const statuses = responses
          .map((response) => response.statusCode)
          .toSorted((a, b) => a - b);
        expect(statuses).toEqual([200, 409]);
        const history = await server.inject({
          method: "GET",
          url: `/tickets/${ticket.id}/history`,
        });
        expect(
          history.json<TicketHistoryEntryResponse[]>().map((entry) => entry.to),
        ).toEqual(["open", "in_progress"]);
        const current = await server.inject({
          method: "GET",
          url: `/tickets/${ticket.id}`,
        });
        expect(current.json<TicketResponse>().version).toBe(2);
      }
    });
  });

  describe("GET /tickets", () => {
    // Banco próprio: a lista exige a tabela vazia a cada caso, e o histórico dos outros casos é imutável.
    let listPgPool: Pool;
    let listServer: FastifyInstance;
    let counter = 0;

    beforeAll(async () => {
      listPgPool = createPgPool(await createMigratedTestDatabase());
      listServer = buildServer({
        container: buildContainer({
          now: () => INSTANT,
          storage: new PgStorage(listPgPool),
        }),
        webDistDir: null,
        logger: { level: "silent" },
      });
    });

    afterAll(async () => {
      await listServer.close();
      await listPgPool.end();
    });

    beforeEach(async () => {
      await listPgPool.query("DELETE FROM ticket");
    });

    // Semeia `count` tickets de created_at crescente (ou o que `createdAtOf` fixar) e devolve os ids do mais novo ao mais
    // antigo, a ordem da lista. Um `createdAtOf` que nunca decresce com o índice mantém essa ordem, com empates.
    async function seed(
      count: number,
      traitsOf: (index: number) => {
        status?: string;
        channel?: string;
      } = () => ({}),
      createdAtOf: (index: number) => string = (index) =>
        `2026-03-01T10:00:00.${String(index + 1).padStart(6, "0")}Z`,
    ): Promise<string[]> {
      const ids: string[] = [];

      for (let index = 0; index < count; index++) {
        counter += 1;
        const id = `019a0000-0000-7000-8000-${counter.toString(16).padStart(12, "0")}`;
        const { status = "open", channel = "chat" } = traitsOf(index);

        await listPgPool.query(
          "INSERT INTO ticket (id, customer_name, description, channel, priority, status, created_at, resolution_note) VALUES ($1, 'Seed', 'x', $2, 'low', $3, $4, $5)",
          [
            id,
            channel,
            status,
            createdAtOf(index),
            status === "resolved" ? "done" : null,
          ],
        );
        ids.push(id);
      }

      return ids.reverse();
    }

    function get(url: string): Promise<LightMyRequestResponse> {
      return listServer.inject({ method: "GET", url });
    }

    function idsOf(response: LightMyRequestResponse): string[] {
      return response.json<TicketResponse[]>().map((ticket) => ticket.id);
    }

    // Segue o Link de página em página e devolve cada resposta, da primeira à última.
    async function follow(url: string): Promise<LightMyRequestResponse[]> {
      const pages: LightMyRequestResponse[] = [];
      let target: string | undefined = url;

      while (target !== undefined) {
        const response = await get(target);

        pages.push(response);
        target = readNextTarget(response);
      }

      return pages;
    }

    it("answers 200 with the tickets in the order of the list and no Link when everything fits in the page", async () => {
      const order = await seed(3);

      const response = await get("/tickets");

      expect(response.statusCode).toBe(200);
      expect(idsOf(response)).toEqual(order);
      expect(response.headers.link).toBeUndefined();
      expect(response.headers.etag).toBeUndefined();
    });

    it("answers each ticket exactly as GET /tickets/:id does", async () => {
      const [newest] = await seed(2);

      const list = (await get("/tickets")).json<TicketResponse[]>();
      const one = (
        await get(`/tickets/${newest ?? ""}`)
      ).json<TicketResponse>();

      expect(list[0]).toEqual(one);
    });

    it("answers 200 and an empty array when there are no tickets", async () => {
      const response = await get("/tickets");

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
      expect(response.headers.link).toBeUndefined();
    });

    it("answers 20 tickets and a Link when there are 21 and no limit was sent", async () => {
      await seed(21);

      const response = await get("/tickets");

      expect(response.json()).toHaveLength(20);
      expect(readNextTarget(response)).toBeDefined();
    });

    it("builds the Link as a relative target with status, channel, limit and cursor, in this order", async () => {
      await seed(3);

      const response = await get("/tickets?channel=chat&status=open&limit=2");
      const target = readNextTarget(response);

      expect(target).toMatch(/^\/tickets\?/);
      expect(readParamNames(target ?? "")).toEqual([
        "status",
        "channel",
        "limit",
        "cursor",
      ]);
    });

    it("builds the Link with only limit and cursor when no filter was sent, and shows the effective limit", async () => {
      await seed(21);

      const target = readNextTarget(await get("/tickets")) ?? "";

      expect(readParamNames(target)).toEqual(["limit", "cursor"]);
      expect(
        new URL(target, "http://localhost").searchParams.get("limit"),
      ).toBe("20");
    });

    it("answers the remaining ticket and no Link when the Link is followed", async () => {
      const order = await seed(3);
      const first = await get("/tickets?limit=2");

      const second = await get(readNextTarget(first) ?? "");

      expect(idsOf(first)).toEqual(order.slice(0, 2));
      expect(idsOf(second)).toEqual(order.slice(2));
      expect(second.headers.link).toBeUndefined();
    });

    it("lists only the tickets that match the status, the channel or both", async () => {
      await seed(6, (index) => ({
        status: index % 2 === 0 ? "open" : "resolved",
        channel: index % 3 === 0 ? "email" : "chat",
      }));

      const byStatus = (await get("/tickets?status=resolved")).json<
        TicketResponse[]
      >();
      const byChannel = (await get("/tickets?channel=email")).json<
        TicketResponse[]
      >();
      const byBoth = (await get("/tickets?status=open&channel=email")).json<
        TicketResponse[]
      >();

      expect(byStatus).toHaveLength(3);
      expect(byStatus.every((ticket) => ticket.status === "resolved")).toBe(
        true,
      );
      expect(byChannel).toHaveLength(2);
      expect(byChannel.every((ticket) => ticket.channel === "email")).toBe(
        true,
      );
      expect(byBoth).toHaveLength(1);
      expect(byBoth[0]).toMatchObject({ status: "open", channel: "email" });
    });

    it.each([1, 100])("limits the page to the limit %i", async (limit) => {
      await seed(3);

      const response = await get(`/tickets?limit=${limit.toString()}`);

      expect(idsOf(response)).toHaveLength(Math.min(limit, 3));
    });

    it.each([
      "limit=0",
      "limit=101",
      "limit=-1",
      "limit=%2B5",
      "limit=01",
      "limit=1e1",
      "limit=1.5",
      "limit=abc",
      "limit=",
      "limit=1&limit=2",
      "status=closed",
      "status=",
      "status=open&status=resolved",
      "channel=sms",
      "channel=",
      "channel=chat&channel=email",
      "foo=1",
    ])("answers 400 invalid_request for ?%s", async (query) => {
      const response = await get(`/tickets?${query}`);

      expect(readProblem(response)).toEqual(problem(400, "invalid_request"));
    });

    it.each([
      ["an empty cursor", "cursor="],
      ["a repeated cursor", "cursor=a&cursor=b"],
      ["text that is not base64url", "cursor=%25%25%25"],
      [
        "base64url of text that is not JSON",
        `cursor=${Buffer.from("nope").toString("base64url")}`,
      ],
      ["JSON that is not an object", `cursor=${encodeJson([1])}`],
      [
        "an object without createdAt",
        `cursor=${encodeJson({ id: POSITION.id })}`,
      ],
      [
        "an object without id",
        `cursor=${encodeJson({ createdAt: POSITION.createdAt })}`,
      ],
      [
        "an object with an extra key",
        `cursor=${encodeJson({ ...POSITION, extra: 1 })}`,
      ],
      [
        "an id that is not a UUID",
        `cursor=${encodeJson({ ...POSITION, id: "abc" })}`,
      ],
      [
        "a createdAt that is not a date",
        `cursor=${encodeJson({ ...POSITION, createdAt: "ontem" })}`,
      ],
      [
        "a createdAt without offset",
        `cursor=${encodeJson({ ...POSITION, createdAt: "2026-03-01T10:00:00" })}`,
      ],
    ])("answers 400 invalid_cursor for %s", async (_name, query) => {
      const response = await get(`/tickets?${query}`);

      expect(readProblem(response)).toEqual(problem(400, "invalid_cursor"));
    });

    it("checks the shape of the limit before the cursor", async () => {
      const response = await get("/tickets?limit=0&cursor=");

      expect(readProblem(response)).toEqual(problem(400, "invalid_request"));
    });

    it("answers 200 for a well formed cursor of a position that has no ticket", async () => {
      await seed(2);

      const response = await get(`/tickets?cursor=${encodeCursor(POSITION)}`);

      expect(response.statusCode).toBe(200);
    });

    it("accepts the cursor of a Link together with another combination of filters", async () => {
      await seed(6);
      const target = readNextTarget(await get("/tickets?limit=1")) ?? "";
      const cursor = new URL(target, "http://localhost").searchParams.get(
        "cursor",
      );

      const response = await get(`/tickets?status=open&cursor=${cursor ?? ""}`);

      expect(response.statusCode).toBe(200);
    });

    it("answers 500 internal_error without the original message when the database is unreachable", async () => {
      const response = await unreachableServer.inject({
        method: "GET",
        url: "/tickets",
      });

      expect(readProblem(response)).toEqual(problem(500, "internal_error"));
      expect(response.body).not.toMatch(/ECONNREFUSED|127\.0\.0\.1/);
    });

    it("lists each ticket once, in 3 pages of the list order, when the Link is followed over tickets that share the created_at, with and without filters", async () => {
      const traitsOf = (index: number) => ({
        status: index % 2 === 0 ? "open" : "resolved",
        channel: index % 3 === 0 ? "email" : "chat",
      });
      // Grupos de cinco tickets compartilham o created_at, e o id decide o desempate.
      const order = await seed(
        45,
        traitsOf,
        (index) =>
          `2026-03-01T10:00:00.${String(Math.floor(index / 5) + 1).padStart(6, "0")}Z`,
      );
      const matching = (predicate: (index: number) => boolean) =>
        order.filter((_id, position) => predicate(44 - position));

      const all = await follow("/tickets");
      const open = await follow("/tickets?status=open");
      const email = await follow("/tickets?channel=email&limit=7");

      expect(all.flatMap(idsOf)).toEqual(order);
      expect(all).toHaveLength(3);
      expect(open.flatMap(idsOf)).toEqual(matching((index) => index % 2 === 0));
      expect(email.flatMap(idsOf)).toEqual(
        matching((index) => index % 3 === 0),
      );
      for (const pages of [all, open, email]) {
        expect(pages.at(-1)?.headers.link).toBeUndefined();
        expect(
          pages.slice(0, -1).every((page) => page.headers.link !== undefined),
        ).toBe(true);
      }
    });
  });

  describe("failures that no route owns", () => {
    it.each([
      ["an unknown path", "GET", "/nowhere"],
      ["a known path with an unknown method", "DELETE", "/tickets"],
      ["the page when no web dist is served", "GET", "/"],
      ["an asset when no web dist is served", "GET", "/assets/app.js"],
    ] as const)(
      "answers 404 route_not_found for %s",
      async (_name, method, url) => {
        const response = await server.inject({ method, url });

        expect(readProblem(response)).toEqual(problem(404, "route_not_found"));
      },
    );

    it("answers 500 internal_error without the text or the stack of the original error when the database is unavailable", async () => {
      const response = await unreachableServer.inject({
        method: "POST",
        url: "/tickets",
        payload: JSON.stringify(VALID_BODY),
        headers: JSON_HEADERS,
      });

      expect(readProblem(response)).toEqual(problem(500, "internal_error"));
      expect(response.body).not.toMatch(
        /ECONNREFUSED|127\.0\.0\.1|node_modules|\.ts/,
      );
    });

    it("answers 500 internal_error without the text or the stack of the original error when a transition meets an unavailable database", async () => {
      const response = await unreachableServer.inject({
        method: "POST",
        url: `/tickets/${UNKNOWN_TICKET_ID}/transitions`,
        payload: JSON.stringify(TO_IN_PROGRESS),
        headers: { ...JSON_HEADERS, "if-match": '"1"' },
      });

      expect(readProblem(response)).toEqual(problem(500, "internal_error"));
      expect(response.body).not.toMatch(
        /ECONNREFUSED|127\.0\.0\.1|node_modules|\.ts/,
      );
    });
  });

  describe("with a web dist", () => {
    const INDEX_HTML = '<!doctype html><div id="root"></div>';
    const APP_JS = "console.log('ticketdesk');";
    let webDistDir: string;
    let webPgPool: Pool;
    let webServer: FastifyInstance;

    beforeAll(async () => {
      webDistDir = await mkdtemp(join(tmpdir(), "ticketdesk-web-dist-"));
      await mkdir(join(webDistDir, "assets"));
      await writeFile(join(webDistDir, "index.html"), INDEX_HTML);
      await writeFile(join(webDistDir, "assets", "app.js"), APP_JS);

      webPgPool = createPgPool(await createMigratedTestDatabase());
      webServer = buildServer({
        container: buildContainer({
          now: () => INSTANT,
          storage: new PgStorage(webPgPool),
        }),
        webDistDir,
        logger: { level: "silent" },
      });
    });

    afterAll(async () => {
      await webServer.close();
      await webPgPool.end();
      await rm(webDistDir, { recursive: true, force: true });
    });

    it("serves the index.html at / as text/html", async () => {
      const response = await webServer.inject("/");

      expect(response.statusCode).toBe(200);
      expect(String(response.headers["content-type"])).toMatch(/^text\/html/);
      expect(response.body).toBe(INDEX_HTML);
    });

    it("serves a file under assets/ with its own media type", async () => {
      const response = await webServer.inject("/assets/app.js");

      expect(response.statusCode).toBe(200);
      expect(String(response.headers["content-type"])).toMatch(/javascript/);
      expect(response.body).toBe(APP_JS);
    });

    it("keeps the ticket routes answering as before", async () => {
      const created = await webServer.inject({
        method: "POST",
        url: "/tickets",
        payload: JSON.stringify(VALID_BODY),
        headers: JSON_HEADERS,
      });
      const { id } = created.json<TicketResponse>();
      const read = await webServer.inject(`/tickets/${id}`);
      const listed = await webServer.inject("/tickets");

      expect(created.statusCode).toBe(201);
      expect(read.statusCode).toBe(200);
      expect(read.json()).toEqual(created.json());
      expect(listed.statusCode).toBe(200);
      expect(listed.json()).toEqual([created.json()]);
    });

    it.each([
      ["an unknown path", "/nowhere"],
      ["an unknown file under assets/", "/assets/missing.js"],
      ["a path that climbs out of the web dist", "/..%2Fpackage.json"],
    ])("answers 404 route_not_found for %s", async (_name, url) => {
      const response = await webServer.inject(url);

      expect(readProblem(response)).toEqual(problem(404, "route_not_found"));
    });

    it("answers 404 route_not_found to a method the web dist does not serve", async () => {
      const response = await webServer.inject({ method: "POST", url: "/" });

      expect(readProblem(response)).toEqual(problem(404, "route_not_found"));
    });

    it.each([
      ["a folder that does not exist", (dir: string) => join(dir, "missing")],
      ["a path that is a file", (dir: string) => join(dir, "index.html")],
    ])("is not ready when the web dist is %s", async (_name, pathOf) => {
      const unready = buildServer({
        container: buildContainer({
          now: () => INSTANT,
          storage: new PgStorage(webPgPool),
        }),
        webDistDir: pathOf(webDistDir),
        logger: { level: "silent" },
      });

      await expect(unready.ready()).rejects.toThrow(InvalidWebDistDirError);
      await unready.close();
    });
  });
});

describe("the error handler with an invalid_limit that no route lets through", () => {
  it("answers 400 invalid_limit", async () => {
    const server = Fastify();
    server.get("/limit", () => {
      throw new InvalidLimitError();
    });
    server.setErrorHandler(handleError);

    try {
      const response = await server.inject({ method: "GET", url: "/limit" });

      expect(readProblem(response)).toEqual(problem(400, "invalid_limit"));
    } finally {
      await server.close();
    }
  });
});
