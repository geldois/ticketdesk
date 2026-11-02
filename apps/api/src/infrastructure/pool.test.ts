import { afterEach, describe, expect, it, vi } from "vitest";

import { createEmptyTestDatabase } from "../../test/database.ts";
import { createPool } from "./pool.ts";

const CURRENT_DATABASE = "SELECT current_database() AS name";

describe("createPool", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("connects to the database of the url it receives", async () => {
    const databaseUrl = await createEmptyTestDatabase();
    const pool = createPool(databaseUrl);

    try {
      const { rows } = await pool.query<{ name: string }>(CURRENT_DATABASE);

      expect(rows[0]?.name).toBe(new URL(databaseUrl).pathname.slice(1));
    } finally {
      await pool.end();
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
    const pool = createPool();

    try {
      const { rows } = await pool.query<{ name: string }>(CURRENT_DATABASE);

      expect(rows[0]?.name).toBe(parsedUrl.pathname.slice(1));
    } finally {
      await pool.end();
    }
  });
});
