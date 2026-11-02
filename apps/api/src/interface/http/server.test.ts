import type {
  TicketHistoryEntryResponse,
  TicketResponse,
} from "@ticketdesk/contract";
import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMigratedTestDatabase } from "../../../test/database.ts";
import { CreateTicketUseCase } from "../../application/use-cases/create-ticket.ts";
import { GetTicketUseCase } from "../../application/use-cases/get-ticket.ts";
import { ListTicketHistoryEntriesUseCase } from "../../application/use-cases/list-ticket-history-entries.ts";
import type { Container } from "../../config/container.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { PgTicketRepository } from "../../infrastructure/repositories/pg-ticket-repository.ts";
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

function buildContainer(pgPool: Pool): Container {
  const repository = new PgTicketRepository(pgPool);

  return {
    now: () => INSTANT,
    repositories: { ticketRepository: repository },
    useCases: {
      createTicketUseCase: new CreateTicketUseCase(repository),
      getTicketUseCase: new GetTicketUseCase(repository),
      listTicketHistoryEntriesUseCase: new ListTicketHistoryEntriesUseCase(
        repository,
      ),
    },
  };
}

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
    server = buildServer(buildContainer(pgPool));
    unreachableServer = buildServer(buildContainer(unreachablePgPool));
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
  });
});
