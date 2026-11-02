import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmptyTestDatabase } from "../../test/database.ts";
import { createPgPool } from "./pool.ts";

const CURRENT_DATABASE = "SELECT current_database() AS name";

describe("createPgPool", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("connects to the database of the url it receives", async () => {
    const databaseUrl = await createEmptyTestDatabase();
    const pgPool = createPgPool(databaseUrl);

    try {
      const { rows } = await pgPool.query<{ name: string }>(CURRENT_DATABASE);

      expect(rows[0]?.name).toBe(new URL(databaseUrl).pathname.slice(1));
    } finally {
      await pgPool.end();
    }
  });

  it("connects through the PG variables when it receives no url", async () => {
    const databaseUrl = await createEmptyTestDatabase();
    const parsedUrl = new URL(databaseUrl);

    vi.stubEnv("PGHOST", parsedUrl.hostname);
    vi.stubEnv("PGPORT", parsedUrl.port);
    vi.stubEnv("PGUSER", decodeURIComponent(parsedUrl.username));
    vi.stubEnv("PGPASSWORD", decodeURIComponent(parsedUrl.password));
    vi.stubEnv("PGDATABASE", parsedUrl.pathname.slice(1));
    const pgPool = createPgPool();

    try {
      const { rows } = await pgPool.query<{ name: string }>(CURRENT_DATABASE);

      expect(rows[0]?.name).toBe(parsedUrl.pathname.slice(1));
    } finally {
      await pgPool.end();
    }
  });
});
