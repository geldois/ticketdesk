import { createServer, type Server, type Socket } from "node:net";

import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMigratedTestDatabase } from "../../../test/database.ts";
import { createPgPool } from "../pool.ts";
import { PgReadinessProbe } from "./pg-readiness-probe.ts";

describe("PgReadinessProbe", () => {
  const sockets: Socket[] = [];
  let silentDatabase: Server;
  let silentDatabaseUrl: string;
  let upPool: Pool;

  beforeAll(async () => {
    upPool = createPgPool(await createMigratedTestDatabase());
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

    silentDatabaseUrl = `postgres://postgres:postgres@127.0.0.1:${String(address.port)}/db`;
  });

  afterAll(async () => {
    for (const socket of sockets) {
      socket.destroy();
    }

    await upPool.end();
    await new Promise<void>((resolve) => {
      silentDatabase.close(() => {
        resolve();
      });
    });
  });

  it("is ready when the database answers", async () => {
    expect(await new PgReadinessProbe(upPool).isReady()).toBe(true);
  });

  it("is not ready, and does not throw, when the database refuses the connection", async () => {
    const refusedPool = createPgPool(
      "postgres://postgres:postgres@127.0.0.1:1/db",
    );

    expect(await new PgReadinessProbe(refusedPool).isReady()).toBe(false);

    await refusedPool.end();
  });

  it("is not ready, and does not throw, when the pool is closed", async () => {
    const closedPool = createPgPool(await createMigratedTestDatabase());

    await closedPool.end();

    expect(await new PgReadinessProbe(closedPool).isReady()).toBe(false);
  });

  it("is not ready, and gives the pool connection back, when the database accepts the connection and never answers", async () => {
    const silentPool = createPgPool(silentDatabaseUrl);

    expect(await new PgReadinessProbe(silentPool).isReady()).toBe(false);

    await expect.poll(() => silentPool.totalCount, { timeout: 9000 }).toBe(0);

    await silentPool.end();
  }, 15000);
});
