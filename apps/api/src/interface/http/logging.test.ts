import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";

import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { createMigratedTestDatabase } from "../../../test/database.ts";
import { buildContainer } from "../../config/container.ts";
import type { LogLevel } from "../../config/settings.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { buildServer } from "./server.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const UNKNOWN_TICKET_ID = "019a0000-0000-7000-8000-000000000000";
const REFUSED_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:1/db";
const JSON_HEADERS = { "content-type": "application/json" };
const LOG_ENTRY_SCHEMA = z.record(z.string(), z.unknown());
const COMPLETION_FIELDS = [
  "durationMs",
  "level",
  "method",
  "path",
  "reqId",
  "status",
  "time",
];

interface Capture {
  readonly server: FastifyInstance;
  readonly lines: () => string[];
  readonly entries: () => Record<string, unknown>[];
  readonly completions: () => Record<string, unknown>[];
}

describe("the request log", () => {
  const pools: Pool[] = [];
  const servers: FastifyInstance[] = [];
  let webDistDir: string;
  let upPool: Pool;
  let refusedPool: Pool;

  function capture(pgPool: Pool, level: LogLevel, withWeb = false): Capture {
    const chunks: string[] = [];
    const destination = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    });
    const server = buildServer({
      container: buildContainer({ now: () => INSTANT, pgPool }),
      webDistDir: withWeb ? webDistDir : null,
      logger: { level, destination },
    });
    const lines = () =>
      chunks
        .join("")
        .split("\n")
        .filter((line) => line.trim() !== "");
    const entries = () =>
      lines().map((line) => LOG_ENTRY_SCHEMA.parse(JSON.parse(line)));

    servers.push(server);

    return {
      server,
      lines,
      entries,
      completions: () => entries().filter((entry) => "status" in entry),
    };
  }

  beforeAll(async () => {
    webDistDir = await mkdtemp(join(tmpdir(), "request-log-"));
    await writeFile(
      join(webDistDir, "index.html"),
      "<!doctype html><title>x</title>",
    );
    upPool = createPgPool(await createMigratedTestDatabase());
    refusedPool = createPgPool(REFUSED_DATABASE_URL);
    pools.push(upPool, refusedPool);
  });

  afterAll(async () => {
    await Promise.all(servers.map(async (server) => server.close()));
    await Promise.all(pools.map(async (pgPool) => pgPool.end()));
    await rm(webDistDir, { recursive: true, force: true });
  });

  it("writes no completion line for the health routes and one for a ticket route in the same stream", async () => {
    const { server, completions } = capture(upPool, "info");

    await server.inject({ method: "GET", url: "/health" });
    await server.inject({ method: "GET", url: "/health/ready" });

    expect(completions()).toHaveLength(0);

    await server.inject({ method: "GET", url: "/tickets" });

    expect(completions()).toHaveLength(1);
  });

  it("writes exactly one completion line per request, with the status of the response", async () => {
    const { server, completions } = capture(upPool, "info", true);

    await server.inject({
      method: "POST",
      url: "/tickets",
      headers: JSON_HEADERS,
      payload: {
        customerName: "Ana",
        description: "Printer is down",
        channel: "chat",
        priority: "high",
      },
    });
    await server.inject({
      method: "GET",
      url: `/tickets/${UNKNOWN_TICKET_ID}`,
    });
    await server.inject({
      method: "POST",
      url: "/tickets",
      headers: JSON_HEADERS,
      payload: "{not json",
    });
    await server.inject({ method: "GET", url: "/" });

    const lines = completions();

    expect(lines.map((line) => line["status"])).toStrictEqual([
      201, 404, 400, 200,
    ]);
    expect(lines.map((line) => line["method"])).toStrictEqual([
      "POST",
      "GET",
      "POST",
      "GET",
    ]);
    expect(lines.map((line) => line["path"])).toStrictEqual([
      "/tickets",
      `/tickets/${UNKNOWN_TICKET_ID}`,
      "/tickets",
      "/",
    ]);

    for (const line of lines) {
      expect(Object.keys(line).toSorted()).toStrictEqual(
        expect.arrayContaining(COMPLETION_FIELDS),
      );
      expect(typeof line["level"]).toBe("string");
      expect(typeof line["durationMs"]).toBe("number");
    }
  });

  it("logs a 4xx at warn and a 5xx at error", async () => {
    const { server, completions } = capture(refusedPool, "info");

    await server.inject({ method: "GET", url: "/nope" });
    await server.inject({
      method: "GET",
      url: `/tickets/${UNKNOWN_TICKET_ID}`,
    });

    expect(completions().map((line) => line["level"])).toStrictEqual([
      "warn",
      "error",
    ]);
  });

  describe("X-Request-Id", () => {
    it.each([
      ["a valid id", "abc_DEF-123"],
      ["an id of 1 character", "a"],
      ["an id of 128 characters", "a".repeat(128)],
    ])("comes back equal for %s", async (_name, value) => {
      const { server } = capture(upPool, "silent");
      const response = await server.inject({
        method: "GET",
        url: "/tickets",
        headers: { "x-request-id": value },
      });

      expect(response.headers["x-request-id"]).toBe(value);
    });

    it("is replaced by a distinct generated one for an empty, long, spaced, slashed, repeated or absent id", async () => {
      const { server } = capture(upPool, "silent");
      const sent: [string, string | string[] | undefined][] = [
        ["empty", ""],
        ["129 characters", "a".repeat(129)],
        ["with a space", "a b"],
        ["with a slash", "a/b"],
        ["repeated", ["one", "two"]],
        ["absent", undefined],
      ];
      const received: string[] = [];

      for (const [, value] of sent) {
        const response = await server.inject({
          method: "GET",
          url: "/tickets",
          ...(value === undefined
            ? {}
            : { headers: { "x-request-id": value } }),
        });
        const requestId = response.headers["x-request-id"];

        expect(typeof requestId).toBe("string");
        expect(requestId).not.toBe(value);
        received.push(String(requestId));
      }

      expect(new Set(received).size).toBe(sent.length);
    });

    it("is present on a 201, a 404, a 422 and the front page", async () => {
      const { server } = capture(upPool, "silent", true);
      const responses = [
        await server.inject({
          method: "POST",
          url: "/tickets",
          headers: JSON_HEADERS,
          payload: {
            customerName: "Ana",
            description: "x",
            channel: "chat",
            priority: "high",
          },
        }),
        await server.inject({ method: "GET", url: "/nope" }),
        await server.inject({
          method: "POST",
          url: "/tickets",
          headers: JSON_HEADERS,
          payload: {
            customerName: "",
            description: "x",
            channel: "chat",
            priority: "high",
          },
        }),
        await server.inject({ method: "GET", url: "/" }),
      ];

      expect(responses.map((response) => response.statusCode)).toStrictEqual([
        201, 404, 422, 200,
      ]);

      for (const response of responses) {
        expect(response.headers["x-request-id"]).toMatch(
          /^[A-Za-z0-9_-]{1,128}$/,
        );
      }
    });

    it("is the reqId of the completion line of the same request", async () => {
      const { server, completions } = capture(upPool, "info");
      const response = await server.inject({ method: "GET", url: "/tickets" });

      expect(completions()[0]?.["reqId"]).toBe(
        response.headers["x-request-id"],
      );
    });
  });

  describe("what a line never holds", () => {
    it("holds neither the free text of a created ticket, nor its body, nor the query string, at the most verbose level", async () => {
      const { server, lines } = capture(upPool, "trace");

      await server.inject({
        method: "POST",
        url: "/tickets",
        headers: JSON_HEADERS,
        payload: {
          customerName: "Zelda Fitzgerald",
          description: "Printer exploded secret-xyz",
          channel: "chat",
          priority: "high",
        },
      });
      await server.inject({
        method: "GET",
        url: "/tickets?status=open&limit=3",
      });
      await server.inject({ method: "GET", url: "/nope?token=hidden" });

      const everything = lines().join("\n");

      expect(everything).not.toMatch(
        /Zelda|Fitzgerald|exploded|secret-xyz|status=open|limit=3|token=hidden/,
      );
    });
  });

  describe("a 500", () => {
    it("is logged at error level with the stack while the response has neither", async () => {
      const { server, entries } = capture(refusedPool, "info");
      const response = await server.inject({
        method: "GET",
        url: `/tickets/${UNKNOWN_TICKET_ID}`,
      });
      const errors = entries().filter(
        (entry) => entry["level"] === "error" && "err" in entry,
      );

      expect(response.statusCode).toBe(500);
      expect(response.body).not.toMatch(/ECONNREFUSED|\bat /);
      expect(errors).toHaveLength(1);
      expect(JSON.stringify(errors[0])).toContain("ECONNREFUSED");
      expect(JSON.stringify(errors[0])).toContain("stack");
    });
  });

  it("writes no line at all at the silent level", async () => {
    const { server, lines } = capture(upPool, "silent");

    await server.inject({ method: "GET", url: "/tickets" });
    await server.inject({ method: "GET", url: "/nope" });

    expect(lines()).toHaveLength(0);
  });
});
