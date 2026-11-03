import type {
  TicketHistoryEntryResponse,
  TicketResponse,
} from "@ticketdesk/contract";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMigratedTestDatabase } from "../../../test/database.ts";
import { buildContainer } from "../../config/container.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { buildServer } from "./server.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const UNKNOWN_TICKET_ID = "019a0000-0000-7000-8000-000000000000";
const UNREACHABLE_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:1/db";
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

describe("the HTTP server", () => {
  let pgPool: Pool;
  let unreachablePgPool: Pool;
  let server: FastifyInstance;
  let unreachableServer: FastifyInstance;

  beforeAll(async () => {
    pgPool = createPgPool(await createMigratedTestDatabase());
    unreachablePgPool = createPgPool(UNREACHABLE_DATABASE_URL);
    server = buildServer(buildContainer({ now: () => INSTANT, pgPool }));
    unreachableServer = buildServer(
      buildContainer({ now: () => INSTANT, pgPool: unreachablePgPool }),
    );
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
    it("answers 201 with the Location of the ticket and the nine contract fields, open at version 1 and stamped by the clock", async () => {
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
        "a customer name with a symbol",
        { ...VALID_BODY, customerName: "Ana$" },
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

  describe("failures that no route owns", () => {
    it.each([
      ["an unknown path", "GET", "/nowhere"],
      ["a known path with an unknown method", "DELETE", "/tickets"],
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
});
