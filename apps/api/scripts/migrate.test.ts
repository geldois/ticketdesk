import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createEmptyTestDatabase, queryRows } from "../test/database.ts";

const MIGRATE_SCRIPT = fileURLToPath(new URL("./migrate.ts", import.meta.url));
const REQUIRED_VARIABLES = [
  "PGHOST",
  "PGPORT",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
] as const;
const REQUIRED_VARIABLE_NAMES = new Set<string>(REQUIRED_VARIABLES);

const SCHEMA_TABLES = `
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name <> 'pgmigrations'
  ORDER BY table_name`;

function connectionVariables(databaseUrl: string): Record<string, string> {
  const parsedUrl = new URL(databaseUrl);

  return {
    PGHOST: parsedUrl.hostname,
    PGPORT: parsedUrl.port,
    PGUSER: decodeURIComponent(parsedUrl.username),
    PGPASSWORD: decodeURIComponent(parsedUrl.password),
    PGDATABASE: parsedUrl.pathname.slice(1),
  };
}

function runMigrateScript(variables: Record<string, string>): {
  status: number | null;
  stderr: string;
} {
  const inherited = Object.entries(process.env).filter(
    ([name]) => !REQUIRED_VARIABLE_NAMES.has(name),
  );

  const { status, stderr } = spawnSync(process.execPath, [MIGRATE_SCRIPT], {
    env: { ...Object.fromEntries(inherited), ...variables },
    encoding: "utf8",
  });

  return { status, stderr };
}

describe("the migrate image", () => {
  it("runs the Node version that .node-version declares", () => {
    const nodeVersion = readFileSync(
      new URL("../../../.node-version", import.meta.url),
      "utf8",
    ).trim();
    const dockerfile = readFileSync(
      new URL("../Dockerfile", import.meta.url),
      "utf8",
    );

    expect(dockerfile).toContain(`FROM node:${nodeVersion}-alpine\n`);
  });
});

describe("the migrate script", () => {
  it("applies the migrations to a new database and leaves the schema as it was when run again", async () => {
    const databaseUrl = await createEmptyTestDatabase();
    const variables = connectionVariables(databaseUrl);

    expect(runMigrateScript(variables).status).toBe(0);
    const tablesAfterFirstRun = await queryRows(databaseUrl, SCHEMA_TABLES);
    expect(tablesAfterFirstRun.map((row) => row["table_name"])).toEqual([
      "ticket",
      "ticket_history_entry",
    ]);

    expect(runMigrateScript(variables).status).toBe(0);
    expect(await queryRows(databaseUrl, SCHEMA_TABLES)).toEqual(
      tablesAfterFirstRun,
    );
  });

  it("exits with 1 when the database is unreachable", async () => {
    const variables = connectionVariables(await createEmptyTestDatabase());
    const { status, stderr } = runMigrateScript({ ...variables, PGPORT: "1" });

    expect(status).toBe(1);
    expect(stderr).not.toBe("");
  });

  it.each(REQUIRED_VARIABLES)(
    "exits with 1 and names %s when it is missing",
    async (name) => {
      const variables = connectionVariables(await createEmptyTestDatabase());
      const { status, stderr } = runMigrateScript({ ...variables, [name]: "" });

      expect(status).toBe(1);
      expect(stderr).toBe(`missing ${name}\n`);
    },
  );
});
