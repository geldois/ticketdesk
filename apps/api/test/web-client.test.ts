import { createServer, type Server } from "node:http";

import {
  TICKET_RESPONSE_SCHEMA,
  type TicketResponse,
  VERSION_CONFLICT_RESPONSE_SCHEMA,
} from "@ticketdesk/contract";
import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  ApiError,
  createTicket,
  getTicket,
  InvalidResponseError,
  listNextTickets,
  listTicketHistoryEntries,
  listTickets,
  NetworkError,
  type TicketPage,
  transitTicket,
} from "../../web/src/api/client.ts";
import { buildContainer } from "../src/config/container.ts";
import { PgStorage } from "../src/infrastructure/pg-storage.ts";
import { createPgPool } from "../src/infrastructure/pool.ts";
import { buildServer } from "../src/interface/http/server.ts";
import { createMigratedTestDatabase } from "./database.ts";

const JSON_HEADERS = { "content-type": "application/json" };
const UNKNOWN_TICKET_ID = "019a0000-0000-7000-8000-000000000000";
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
  nextTransitions: [{ to: "in_progress", requires: null }],
};
const ENTRY = {
  from: null,
  to: "open",
  resolutionNote: null,
  reopenReason: null,
  at: "2026-11-04T22:00:00.000Z",
};
const CHANNELS = ["chat", "email", "phone"] as const;
const PRIORITIES = ["low", "medium", "high"] as const;

interface RunningApi {
  readonly pool: Pool;
  readonly api: FastifyInstance;
  readonly origin: string;
}

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

async function startApi(): Promise<RunningApi> {
  const pool = createPgPool(await createMigratedTestDatabase());
  const api = buildServer({
    container: buildContainer({
      now: () => new Date(),
      storage: new PgStorage(pool),
    }),
    webDistDir: null,
    logger: { level: "silent" },
  });

  return {
    pool,
    api,
    origin: await api.listen({ host: "127.0.0.1", port: 0 }),
  };
}

async function stopApi({ api, pool }: RunningApi): Promise<void> {
  await api.close();
  await pool.end();
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

  origin = `http://127.0.0.1:${String(portOf(server))}`;

  return server;
}

function pick<Item>(items: readonly Item[], index: number): Item {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`no item at ${String(index)}`);
  }

  return item;
}

function portOf(server: Server): number {
  const address = server.address();

  if (typeof address !== "object" || address === null) {
    throw new Error("the local server has no port");
  }

  return address.port;
}

async function postJson(
  apiOrigin: string,
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  return realFetch(`${apiOrigin}${path}`, {
    method: "POST",
    headers: { ...JSON_HEADERS, ...headers },
    body: JSON.stringify(body),
  });
}

async function createTicketThroughApi(
  apiOrigin: string,
  customerName: string,
  channel = "chat",
  priority = "high",
): Promise<TicketResponse> {
  const response = await postJson(apiOrigin, "/tickets", {
    customerName,
    description: "Printer is down",
    channel,
    priority,
  });

  return TICKET_RESPONSE_SCHEMA.parse(await response.json());
}

async function transitThroughApi(
  apiOrigin: string,
  ticket: TicketResponse,
  to: string,
  resolutionNote: string | null,
  reopenReason: string | null,
): Promise<TicketResponse> {
  const response = await postJson(
    apiOrigin,
    `/tickets/${ticket.id}/transitions`,
    { to, resolutionNote, reopenReason },
    { "if-match": `"${String(ticket.version)}"` },
  );

  return TICKET_RESPONSE_SCHEMA.parse(await response.json());
}

async function failureOf(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
  } catch (error) {
    return error;
  }

  return null;
}

async function invalidResponseOf(
  action: () => Promise<unknown>,
): Promise<InvalidResponseError> {
  const failure = await failureOf(action);

  if (!(failure instanceof InvalidResponseError)) {
    throw new Error("the client did not throw InvalidResponseError");
  }

  return failure;
}

async function apiErrorOf(action: () => Promise<unknown>): Promise<ApiError> {
  const failure = await failureOf(action);

  if (!(failure instanceof ApiError)) {
    throw new Error("the client did not throw ApiError");
  }

  return failure;
}

async function collectPages(first: TicketPage): Promise<{
  readonly ids: readonly string[];
  readonly sizes: readonly number[];
  readonly lastLink: string | null;
}> {
  const ids: string[] = first.tickets.map(({ id }) => id);
  const sizes = [first.tickets.length];
  let link = first.nextLink;

  while (link !== null) {
    const page = await listNextTickets(link);

    ids.push(...page.tickets.map(({ id }) => id));
    sizes.push(page.tickets.length);
    link = page.nextLink;
  }

  return { ids, sizes, lastLink: link };
}

describe("the web client", () => {
  beforeAll(() => {
    vi.stubGlobal("fetch", fetchFromOrigin);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  describe("on an empty database", () => {
    let running: RunningApi;

    beforeAll(async () => {
      running = await startApi();
      origin = running.origin;
    });

    afterAll(async () => {
      await stopApi(running);
    });

    it("returns an empty list and no link for no tickets", async () => {
      origin = running.origin;

      const page = await listTickets({});

      expect(page.tickets).toEqual([]);
      expect(page.nextLink).toBeNull();
    });

    it("accepts the body of a conflict the api sent under its schema", async () => {
      origin = running.origin;

      const ticket = await createTicketThroughApi(running.origin, "Caio");
      const response = await postJson(
        running.origin,
        `/tickets/${ticket.id}/transitions`,
        { to: "in_progress", resolutionNote: null, reopenReason: null },
        { "if-match": '"99"' },
      );
      const parsed = VERSION_CONFLICT_RESPONSE_SCHEMA.safeParse(
        await response.json(),
      );

      expect(response.status).toBe(409);
      expect(parsed.success).toBe(true);
    });
  });

  describe("on a database with 45 tickets", () => {
    let running: RunningApi;
    let created: readonly TicketResponse[];
    let journey: TicketResponse;
    let resolvedChat: TicketResponse;
    let inProgressEmail: TicketResponse;

    beforeAll(async () => {
      running = await startApi();
      origin = running.origin;

      const seeded: TicketResponse[] = [];

      for (let index = 0; index < 45; index += 1) {
        seeded.push(
          await createTicketThroughApi(
            running.origin,
            `Customer ${String(index)}`,
            CHANNELS[index % 3],
            PRIORITIES[index % 3],
          ),
        );
      }

      created = seeded;

      const chat = created.filter(({ channel }) => channel === "chat");
      const email = created.filter(({ channel }) => channel === "email");

      journey = pick(chat, 0);
      resolvedChat = pick(chat, 1);
      inProgressEmail = pick(email, 0);

      let current = await transitThroughApi(
        running.origin,
        journey,
        "in_progress",
        null,
        null,
      );

      current = await transitThroughApi(
        running.origin,
        current,
        "resolved",
        "Replaced the cable",
        null,
      );
      await transitThroughApi(
        running.origin,
        current,
        "open",
        null,
        "It broke again",
      );
      await transitThroughApi(
        running.origin,
        await transitThroughApi(
          running.origin,
          resolvedChat,
          "in_progress",
          null,
          null,
        ),
        "resolved",
        "Done",
        null,
      );
      await transitThroughApi(
        running.origin,
        inProgressEmail,
        "in_progress",
        null,
        null,
      );
      await running.pool.query(
        "UPDATE ticket SET created_at = date_trunc('minute', created_at)",
      );
    });

    afterAll(async () => {
      await stopApi(running);
    });

    it("walks every page to the last one, with ties in created_at, without a repeated or a missing ticket", async () => {
      origin = running.origin;

      const first = await listTickets({});
      const limit = Number(
        new URL(first.nextLink ?? "/", "http://client").searchParams.get(
          "limit",
        ),
      );
      const walked = await collectPages(first);

      expect(first.nextLink).not.toBeNull();
      expect(first.tickets).toHaveLength(limit);
      expect(walked.ids).toHaveLength(45);
      expect([...walked.ids].sort()).toEqual(
        created.map(({ id }) => id).sort(),
      );
      expect(walked.lastLink).toBeNull();
      expect(walked.sizes.at(-1)).toBeGreaterThan(0);
      expect(walked.sizes.at(-1)).toBeLessThanOrEqual(limit);
    });

    it("returns only the tickets that match each filter and both together", async () => {
      origin = running.origin;

      const resolved = await listTickets({ status: "resolved" });
      const chat = await listTickets({ channel: "chat" });
      const both = await listTickets({
        status: "in_progress",
        channel: "email",
      });
      const none = await listTickets({ status: "resolved", channel: "email" });

      expect(resolved.tickets.map(({ id }) => id)).toEqual([resolvedChat.id]);
      expect(chat.tickets).toHaveLength(15);
      expect(chat.tickets.every(({ channel }) => channel === "chat")).toBe(
        true,
      );
      expect(both.tickets.map(({ id }) => id)).toEqual([inProgressEmail.id]);
      expect(none.tickets).toEqual([]);
      expect(none.nextLink).toBeNull();
    });

    it("returns a ticket with the values it was created with", async () => {
      origin = running.origin;

      const ticket = pick(created, 5);

      expect(await getTicket(ticket.id)).toMatchObject({
        id: ticket.id,
        customerName: "Customer 5",
        description: ticket.description,
        channel: ticket.channel,
        priority: ticket.priority,
        status: "open",
        resolutionNote: null,
        version: 1,
      });
    });

    it("returns the history oldest first, with the note and the reason in their places", async () => {
      origin = running.origin;

      const history = await listTicketHistoryEntries(journey.id);

      expect(history.map(({ from, to }) => [from, to])).toEqual([
        [null, "open"],
        ["open", "in_progress"],
        ["in_progress", "resolved"],
        ["resolved", "open"],
      ]);
      expect(history[2]).toMatchObject({
        resolutionNote: "Replaced the cable",
        reopenReason: null,
      });
      expect(history[3]).toMatchObject({
        resolutionNote: null,
        reopenReason: "It broke again",
      });
    });

    it("returns one entry with a null from for a ticket that was just created", async () => {
      origin = running.origin;

      const history = await listTicketHistoryEntries(pick(created, 7).id);

      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({ from: null, to: "open" });
    });

    it("throws ApiError with the status and the code of the api for an unknown id", async () => {
      origin = running.origin;

      const error = await apiErrorOf(() => getTicket(UNKNOWN_TICKET_ID));

      expect(error.status).toBe(404);
      expect(error.code).toBe("ticket_not_found");
      expect(error.detail).not.toBeNull();
    });

    it("throws ApiError with the status and the code of the api for a malformed id", async () => {
      origin = running.origin;

      const error = await apiErrorOf(() => getTicket("not-an-id"));

      expect(error.status).toBe(400);
      expect(error.code).toBe("invalid_ticket_id");
    });
  });

  describe("on the write operations", () => {
    let running: RunningApi;

    const NEW_TICKET = {
      customerName: "Ana",
      description: "Printer is down",
      channel: "chat",
      priority: "high",
    } as const;

    function transit(
      ticket: TicketResponse,
      to: string,
      resolutionNote: string | null = null,
      reopenReason: string | null = null,
    ): Promise<TicketResponse> {
      return transitTicket({
        id: ticket.id,
        version: ticket.version,
        to,
        resolutionNote,
        reopenReason,
      });
    }

    beforeAll(async () => {
      running = await startApi();
      origin = running.origin;
    });

    afterAll(async () => {
      await stopApi(running);
    });

    it("creates a ticket that opens at version 1 and reads back the same", async () => {
      origin = running.origin;

      const ticket = await createTicket(NEW_TICKET);

      expect(ticket).toMatchObject({
        customerName: "Ana",
        status: "open",
        version: 1,
        resolutionNote: null,
      });
      expect(await getTicket(ticket.id)).toEqual(ticket);
    });

    it("refuses an empty customer name with the code and the detail of the api and no current ticket", async () => {
      origin = running.origin;

      const error = await apiErrorOf(() =>
        createTicket({ ...NEW_TICKET, customerName: "" }),
      );

      expect(error.status).toBe(422);
      expect(error.code).toBe("invalid_customer_name");
      expect(error.detail).not.toBeNull();
      expect(error.currentTicket).toBeNull();
    });

    it("throws NetworkError when a write does not reach the api", async () => {
      const closed = await serveBody("");
      const port = portOf(closed);

      closed.close();
      origin = `http://127.0.0.1:${String(port)}`;

      expect(await failureOf(() => createTicket(NEW_TICKET))).toBeInstanceOf(
        NetworkError,
      );
      expect(
        await failureOf(() =>
          transitTicket({
            id: UNKNOWN_TICKET_ID,
            version: 1,
            to: "in_progress",
            resolutionNote: null,
            reopenReason: null,
          }),
        ),
      ).toBeInstanceOf(NetworkError);
    });

    it("moves a ticket through its statuses with the text each destination requires", async () => {
      origin = running.origin;

      const open = await createTicket(NEW_TICKET);
      const started = await transit(open, "in_progress");
      const resolved = await transit(started, "resolved", "Replaced the cable");
      const reopened = await transit(resolved, "open", null, "It broke again");
      const history = await listTicketHistoryEntries(open.id);

      expect(started).toMatchObject({ status: "in_progress", version: 2 });
      expect(resolved).toMatchObject({
        status: "resolved",
        version: 3,
        resolutionNote: "Replaced the cable",
      });
      expect(reopened).toMatchObject({
        status: "open",
        version: 4,
        resolutionNote: null,
      });
      expect(history[2]).toMatchObject({
        to: "resolved",
        resolutionNote: "Replaced the cable",
      });
      expect(history[3]).toMatchObject({
        to: "open",
        resolutionNote: null,
        reopenReason: "It broke again",
      });
    });

    it("throws ApiError 409 version_conflict carrying the current ticket for a stale version", async () => {
      origin = running.origin;

      const open = await createTicket(NEW_TICKET);
      const started = await transit(open, "in_progress");
      const error = await apiErrorOf(() => transit(open, "in_progress"));

      expect(error.status).toBe(409);
      expect(error.code).toBe("version_conflict");
      expect(error.currentTicket).toEqual(started);
      expect(error.currentTicket?.version).toBe(2);
    });

    it("throws ApiError 404 with no current ticket for an unknown id", async () => {
      origin = running.origin;

      const error = await apiErrorOf(() =>
        transitTicket({
          id: UNKNOWN_TICKET_ID,
          version: 1,
          to: "in_progress",
          resolutionNote: null,
          reopenReason: null,
        }),
      );

      expect(error.status).toBe(404);
      expect(error.code).toBe("ticket_not_found");
      expect(error.currentTicket).toBeNull();
    });

    it("lets one of two transitions fired together with the same version win and answers the other with a conflict, 20 rounds", async () => {
      origin = running.origin;

      for (let round = 0; round < 20; round += 1) {
        const open = await createTicket(NEW_TICKET);
        const results = await Promise.allSettled([
          transit(open, "in_progress"),
          transit(open, "in_progress"),
        ]);
        const fulfilled = results.filter(
          ({ status }) => status === "fulfilled",
        );
        const rejected = results.filter(({ status }) => status === "rejected");

        expect(fulfilled).toHaveLength(1);
        expect(rejected).toHaveLength(1);
        expect(rejected[0]).toMatchObject({
          reason: { status: 409, code: "version_conflict" },
        });
      }
    });

    it("refuses a jump over a status and a blank or an empty resolution note", async () => {
      origin = running.origin;

      const open = await createTicket(NEW_TICKET);
      const jump = await apiErrorOf(() => transit(open, "resolved", "Done"));
      const started = await transit(open, "in_progress");
      const blank = await apiErrorOf(() => transit(started, "resolved", "   "));
      const empty = await apiErrorOf(() => transit(started, "resolved", ""));

      expect([jump.status, jump.code]).toEqual([422, "invalid_transition"]);
      expect([blank.status, blank.code]).toEqual([
        422,
        "missing_resolution_note",
      ]);
      expect([empty.status, empty.code]).toEqual([
        422,
        "missing_resolution_note",
      ]);
    });
  });

  describe("on answers the api never sends", () => {
    it("throws ApiError with only the status for a failure that is not problem+json", async () => {
      const server = await serveBody("bad gateway", 502, "text/plain");

      try {
        const error = await apiErrorOf(() => getTicket(TICKET.id));

        expect(error.status).toBe(502);
        expect(error.code).toBeNull();
        expect(error.detail).toBeNull();
      } finally {
        server.close();
      }
    });

    it("throws NetworkError for a port with no server", async () => {
      const closed = await serveBody("");
      const port = portOf(closed);

      closed.close();
      origin = `http://127.0.0.1:${String(port)}`;

      expect(await failureOf(() => getTicket(TICKET.id))).toBeInstanceOf(
        NetworkError,
      );
    });

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
