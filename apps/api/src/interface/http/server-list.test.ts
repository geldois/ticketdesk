import type { TicketResponse } from "@ticketdesk/contract";
import Fastify, {
  type FastifyInstance,
  type LightMyRequestResponse,
} from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createMigratedTestDatabase } from "../../../test/database.ts";
import { InvalidLimitError } from "../../application/errors.ts";
import { buildContainer } from "../../config/container.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { handleError } from "./error-handler.ts";
import { encodeCursor } from "./cursor.ts";
import { buildServer } from "./server.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const UNREACHABLE_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:1/db";
const POSITION = {
  createdAt: "2026-03-01T10:00:00.000000Z",
  id: "019a0000-0000-7000-8000-000000000001",
} as const;

function problem(status: number, code: string) {
  return {
    statusCode: status,
    mediaType: "application/problem+json",
    fields: ["code", "detail", "status", "title", "type"],
    status,
    code,
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

describe("GET /tickets", () => {
  let pgPool: Pool;
  let server: FastifyInstance;
  let counter = 0;

  beforeAll(async () => {
    pgPool = createPgPool(await createMigratedTestDatabase());
    server = buildServer(buildContainer({ now: () => INSTANT, pgPool }));
  });

  afterAll(async () => {
    await server.close();
    await pgPool.end();
  });

  beforeEach(async () => {
    await pgPool.query("DELETE FROM ticket");
  });

  // Semeia `count` tickets de created_at crescente e devolve os ids do mais novo ao mais antigo, a ordem da lista.
  async function seed(
    count: number,
    traitsOf: (index: number) => {
      status?: string;
      channel?: string;
    } = () => ({}),
  ): Promise<string[]> {
    const ids: string[] = [];

    for (let index = 0; index < count; index++) {
      counter += 1;
      const id = `019a0000-0000-7000-8000-${counter.toString(16).padStart(12, "0")}`;
      const { status = "open", channel = "chat" } = traitsOf(index);
      const createdAt = `2026-03-01T10:00:00.${String(index + 1).padStart(6, "0")}Z`;

      await pgPool.query(
        "INSERT INTO ticket (id, customer_name, description, channel, priority, status, created_at, resolution_note) VALUES ($1, 'Seed', 'x', $2, 'low', $3, $4, $5)",
        [id, channel, status, createdAt, status === "resolved" ? "done" : null],
      );
      ids.push(id);
    }

    return ids.reverse();
  }

  function get(url: string): Promise<LightMyRequestResponse> {
    return server.inject({ method: "GET", url });
  }

  function idsOf(response: LightMyRequestResponse): string[] {
    return response.json<TicketResponse[]>().map((ticket) => ticket.id);
  }

  async function follow(url: string): Promise<string[]> {
    const followed: string[] = [];
    let target: string | undefined = url;

    while (target !== undefined) {
      const response = await get(target);

      followed.push(...idsOf(response));
      target = readNextTarget(response);
    }

    return followed;
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
    const one = (await get(`/tickets/${newest ?? ""}`)).json<TicketResponse>();

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
    expect(new URL(target, "http://localhost").searchParams.get("limit")).toBe(
      "20",
    );
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
    expect(byStatus.every((ticket) => ticket.status === "resolved")).toBe(true);
    expect(byChannel).toHaveLength(2);
    expect(byChannel.every((ticket) => ticket.channel === "email")).toBe(true);
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
    const unreachablePgPool = createPgPool(UNREACHABLE_DATABASE_URL);
    const unreachableServer = buildServer(
      buildContainer({ now: () => INSTANT, pgPool: unreachablePgPool }),
    );

    try {
      const response = await unreachableServer.inject({
        method: "GET",
        url: "/tickets",
      });

      expect(readProblem(response)).toEqual(problem(500, "internal_error"));
      expect(response.body).not.toMatch(/ECONNREFUSED|127\.0\.0\.1/);
    } finally {
      await unreachableServer.close();
      await unreachablePgPool.end();
    }
  });

  it("lists each ticket once when the Link is followed from page to page, with and without filters", async () => {
    const traitsOf = (index: number) => ({
      status: index % 2 === 0 ? "open" : "resolved",
      channel: index % 3 === 0 ? "email" : "chat",
    });
    const order = await seed(45, traitsOf);
    const matching = (predicate: (index: number) => boolean) =>
      order.filter((_id, position) => predicate(44 - position));

    expect(await follow("/tickets")).toEqual(order);
    expect(await follow("/tickets?status=open")).toEqual(
      matching((index) => index % 2 === 0),
    );
    expect(await follow("/tickets?channel=email&limit=7")).toEqual(
      matching((index) => index % 3 === 0),
    );
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
