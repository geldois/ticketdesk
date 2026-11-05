import { createServer, type Server, type Socket } from "node:net";

import type { FastifyInstance, LightMyRequestResponse } from "fastify";
import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMigratedTestDatabase } from "../../../../test/database.ts";
import { buildContainer } from "../../../config/container.ts";
import { createPgPool } from "../../../infrastructure/pool.ts";
import { buildServer } from "../server.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const UNKNOWN_TICKET_ID = "019a0000-0000-7000-8000-000000000000";
const REFUSED_DATABASE_URL = "postgres://postgres:postgres@127.0.0.1:1/db";

function readProblem(response: LightMyRequestResponse) {
  const body = response.json<Record<string, unknown>>();

  return {
    statusCode: response.statusCode,
    mediaType: String(response.headers["content-type"]).split(";")[0],
    status: body["status"],
    code: body["code"],
  };
}

describe("the health routes", () => {
  const pools: Pool[] = [];
  const servers: FastifyInstance[] = [];
  const sockets: Socket[] = [];
  let silentDatabase: Server;
  let upServer: FastifyInstance;
  let closedServer: FastifyInstance;
  let refusedServer: FastifyInstance;
  let silentServer: FastifyInstance;

  function buildServerOver(pgPool: Pool): FastifyInstance {
    const server = buildServer({
      container: buildContainer({ now: () => INSTANT, pgPool }),
      webDistDir: null,
    });

    pools.push(pgPool);
    servers.push(server);

    return server;
  }

  beforeAll(async () => {
    const closedPool = createPgPool(await createMigratedTestDatabase());

    await closedPool.end();

    silentDatabase = createServer((socket) => {
      sockets.push(socket);
    });
    await new Promise<void>((resolve) => {
      silentDatabase.listen(0, "127.0.0.1", resolve);
    });

    const address = silentDatabase.address();

    if (address === null || typeof address === "string") {
      throw new Error("the silent database has no port");
    }

    upServer = buildServerOver(
      createPgPool(await createMigratedTestDatabase()),
    );
    closedServer = buildServerOver(closedPool);
    refusedServer = buildServerOver(createPgPool(REFUSED_DATABASE_URL));
    silentServer = buildServerOver(
      createPgPool(
        `postgres://postgres:postgres@127.0.0.1:${String(address.port)}/db`,
      ),
    );
  });

  afterAll(async () => {
    for (const socket of sockets) {
      socket.destroy();
    }

    await Promise.all(servers.map(async (server) => server.close()));
    await Promise.all(
      pools
        .filter((pgPool) => !pgPool.ended)
        .map(async (pgPool) => pgPool.end()),
    );
    await new Promise<void>((resolve) => {
      silentDatabase.close(() => {
        resolve();
      });
    });
  });

  describe("GET /health", () => {
    it("answers 200 with the exact body whatever state the database is in", async () => {
      for (const server of [
        upServer,
        closedServer,
        refusedServer,
        silentServer,
      ]) {
        const response = await server.inject({ method: "GET", url: "/health" });

        expect(response.statusCode).toBe(200);
        expect(response.json()).toStrictEqual({ status: "ok" });
      }
    });

    it("answers a HEAD with 200 and no body", async () => {
      const response = await upServer.inject({
        method: "HEAD",
        url: "/health",
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toBe("");
    });

    it("answers a POST with 404 route_not_found", async () => {
      const response = await upServer.inject({
        method: "POST",
        url: "/health",
      });

      expect(readProblem(response)).toStrictEqual({
        statusCode: 404,
        mediaType: "application/problem+json",
        status: 404,
        code: "route_not_found",
      });
    });
  });

  describe("GET /health/ready", () => {
    it("answers 200 with the exact body when the database answers", async () => {
      const response = await upServer.inject({
        method: "GET",
        url: "/health/ready",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toStrictEqual({ status: "ready" });
    });

    it("answers 503 not_ready when the pool is closed", async () => {
      const response = await closedServer.inject({
        method: "GET",
        url: "/health/ready",
      });

      expect(readProblem(response)).toStrictEqual({
        statusCode: 503,
        mediaType: "application/problem+json",
        status: 503,
        code: "not_ready",
      });
    });

    it("answers 503 not_ready when the database refuses the connection", async () => {
      const response = await refusedServer.inject({
        method: "GET",
        url: "/health/ready",
      });

      expect(readProblem(response)).toStrictEqual({
        statusCode: 503,
        mediaType: "application/problem+json",
        status: 503,
        code: "not_ready",
      });
    });

    it("answers 503 not_ready when the database accepts the connection and never answers", async () => {
      const response = await silentServer.inject({
        method: "GET",
        url: "/health/ready",
      });

      expect(readProblem(response)).toStrictEqual({
        statusCode: 503,
        mediaType: "application/problem+json",
        status: 503,
        code: "not_ready",
      });
    });

    it("answers 404 route_not_found for the trailing slash", async () => {
      const response = await upServer.inject({
        method: "GET",
        url: "/health/ready/",
      });

      expect(readProblem(response).code).toBe("route_not_found");
    });
  });

  it("leaves a ticket route answering 500 internal_error when the database is unreachable", async () => {
    const response = await refusedServer.inject({
      method: "GET",
      url: `/tickets/${UNKNOWN_TICKET_ID}`,
    });

    expect(readProblem(response)).toStrictEqual({
      statusCode: 500,
      mediaType: "application/problem+json",
      status: 500,
      code: "internal_error",
    });
  });
});
