import { createServer, type Server } from "node:http";

import {
  TICKET_RESPONSE_SCHEMA,
  VERSION_CONFLICT_RESPONSE_SCHEMA,
} from "@ticketdesk/contract";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  getTicket,
  InvalidResponseError,
  listNextTickets,
  listTicketHistoryEntries,
  listTickets,
} from "../../web/src/api/client.ts";
import { buildContainer } from "../src/config/container.ts";
import { createPgPool } from "../src/infrastructure/pool.ts";
import { buildServer } from "../src/interface/http/server.ts";
import { createMigratedTestDatabase } from "./database.ts";

const JSON_HEADERS = { "content-type": "application/json" };
const TICKET = {
  id: "019a0000-0000-7000-8000-000000000001",
  customerName: "Ana",
  description: "Printer is down",
  channel: "chat",
  priority: "high",
  status: "open",
  resolutionNote: null,
  version: 1,
  createdAt: "2026-11-04T22:00:00.000Z",
};
const ENTRY = {
  from: null,
  to: "open",
  resolutionNote: null,
  reopenReason: null,
  at: "2026-11-04T22:00:00.000Z",
};

let pool: Pool;
let api: FastifyInstance;
let apiOrigin: string;
let origin = "";
const realFetch = globalThis.fetch;

// O cliente usa caminho relativo, como o navegador na origem da página; o teste só aponta a origem.
function fetchFromOrigin(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
): Promise<Response> {
  return realFetch(
    typeof input === "string" && input.startsWith("/")
      ? `${origin}${input}`
      : input,
    init,
  );
}

async function serveBody(
  body: string,
  status = 200,
  contentType = "application/json",
): Promise<Server> {
  const server = createServer((_, response) => {
    response.writeHead(status, { "content-type": contentType });
    response.end(body);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (typeof address !== "object" || address === null) {
    throw new Error("the local server has no port");
  }

  origin = `http://127.0.0.1:${String(address.port)}`;

  return server;
}

async function createTicketThroughApi(customerName: string): Promise<{
  readonly id: string;
  readonly version: number;
}> {
  const response = await realFetch(`${apiOrigin}/tickets`, {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({
      customerName,
      description: "Printer is down",
      channel: "chat",
      priority: "high",
    }),
  });

  return TICKET_RESPONSE_SCHEMA.parse(await response.json());
}

async function invalidResponseOf(
  action: () => Promise<unknown>,
): Promise<InvalidResponseError> {
  let failure: unknown = null;

  try {
    await action();
  } catch (error) {
    failure = error;
  }

  if (!(failure instanceof InvalidResponseError)) {
    throw new Error("the client did not throw InvalidResponseError");
  }

  return failure;
}

describe("the web client against the api and against bodies the api never sends", () => {
  beforeAll(async () => {
    pool = createPgPool(await createMigratedTestDatabase());
    api = buildServer({
      container: buildContainer({ now: () => new Date(), pgPool: pool }),
      webDistDir: null,
    });

    apiOrigin = await api.listen({ host: "127.0.0.1", port: 0 });
    origin = apiOrigin;
    vi.stubGlobal("fetch", fetchFromOrigin);
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    await api.close();
    await pool.end();
  });

  describe("with a body the api really sent", () => {
    it("returns a ticket, the list and the history with the values the api sent", async () => {
      origin = apiOrigin;

      const first = await createTicketThroughApi("Ana");
      const second = await createTicketThroughApi("Bia");
      const ticket = await getTicket(first.id);
      const page = await listTickets({});
      const history = await listTicketHistoryEntries(second.id);

      expect(ticket).toMatchObject({
        id: first.id,
        customerName: "Ana",
        status: "open",
        version: 1,
      });
      expect(page.nextLink).toBeNull();
      expect(page.tickets.map(({ id }) => id).sort()).toEqual(
        [first.id, second.id].sort(),
      );
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ from: null, to: "open" });
    });

    it("accepts the body of a conflict the api sent under its schema", async () => {
      origin = apiOrigin;

      const { id } = await createTicketThroughApi("Caio");
      const response = await realFetch(
        `${apiOrigin}/tickets/${id}/transitions`,
        {
          method: "POST",
          headers: { ...JSON_HEADERS, "if-match": '"99"' },
          body: JSON.stringify({
            to: "in_progress",
            resolutionNote: null,
            reopenReason: null,
          }),
        },
      );
      const parsed = VERSION_CONFLICT_RESPONSE_SCHEMA.safeParse(
        await response.json(),
      );

      expect(response.status).toBe(409);
      expect(parsed.success).toBe(true);
    });
  });

  describe("with a body outside the contract", () => {
    it("drops a key the contract does not know and returns the rest", async () => {
      const server = await serveBody(JSON.stringify({ ...TICKET, extra: "x" }));

      try {
        expect(await getTicket(TICKET.id)).toEqual(TICKET);
      } finally {
        server.close();
      }
    });

    it.each([
      ["a ticket without a status", { ...TICKET, status: undefined }, "status"],
      ["a version as text", { ...TICKET, version: "1" }, "version"],
      ["a status outside the set", { ...TICKET, status: "closed" }, "status"],
    ])(
      "throws InvalidResponseError naming the field for %s",
      async (_, body, path) => {
        const server = await serveBody(JSON.stringify(body));

        try {
          const error = await invalidResponseOf(() => getTicket(TICKET.id));

          expect(error.path).toBe(path);
          expect(error.message).toContain(path);
        } finally {
          server.close();
        }
      },
    );

    it("names the whole body when a list is not an array", async () => {
      const server = await serveBody(JSON.stringify({ tickets: [] }));

      try {
        const error = await invalidResponseOf(() => listTickets({}));

        expect(error.path).toBe("body");
      } finally {
        server.close();
      }
    });

    it("names the index and the field of the fourth ticket of a list", async () => {
      const tickets = [TICKET, TICKET, TICKET, { ...TICKET, customerName: 4 }];
      const server = await serveBody(JSON.stringify(tickets));

      try {
        const error = await invalidResponseOf(() =>
          listNextTickets("/tickets?x=1"),
        );

        expect(error.path).toBe("3.customerName");
      } finally {
        server.close();
      }
    });

    it("names the index and the field of the first history entry", async () => {
      const server = await serveBody(JSON.stringify([{ ...ENTRY, at: 12 }]));

      try {
        const error = await invalidResponseOf(() =>
          listTicketHistoryEntries("x"),
        );

        expect(error.path).toBe("0.at");
      } finally {
        server.close();
      }
    });

    it("names the whole body when a success answer is not JSON", async () => {
      const server = await serveBody("not json", 200, "text/plain");

      try {
        const error = await invalidResponseOf(() => getTicket(TICKET.id));

        expect(error.path).toBe("body");
      } finally {
        server.close();
      }
    });
  });
});
