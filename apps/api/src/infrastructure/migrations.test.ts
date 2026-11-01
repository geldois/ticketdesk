import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createEmptyTestDatabase,
  MIGRATIONS_DIR,
  queryRows,
} from "../../test/database.ts";
import { migrate } from "./migrations.ts";

const FIXTURE_MIGRATIONS_DIR = fileURLToPath(
  new URL("../../test/fixtures/migrations", import.meta.url),
);

const WIDGET_COLUMNS = `
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'widget'
  ORDER BY ordinal_position`;

const SCHEMA_TABLES = `
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name <> 'pgmigrations'
  ORDER BY table_name`;

const SCHEMA_COLUMNS = `
  SELECT table_name, column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name <> 'pgmigrations'
  ORDER BY table_name, column_name`;

describe("migrate", () => {
  it("applies, reverts and applies again the migrations of a directory", async () => {
    const databaseUrl = await createEmptyTestDatabase();

    await migrate(databaseUrl, FIXTURE_MIGRATIONS_DIR, "up");
    const afterFirstUp = await queryRows(databaseUrl, WIDGET_COLUMNS);
    expect(afterFirstUp).toEqual([
      { column_name: "id", data_type: "integer", is_nullable: "NO" },
      { column_name: "name", data_type: "text", is_nullable: "NO" },
    ]);

    await migrate(databaseUrl, FIXTURE_MIGRATIONS_DIR, "down");
    expect(await queryRows(databaseUrl, WIDGET_COLUMNS)).toEqual([]);

    await migrate(databaseUrl, FIXTURE_MIGRATIONS_DIR, "up");
    expect(await queryRows(databaseUrl, WIDGET_COLUMNS)).toEqual(afterFirstUp);
  });

  it("leaves a second application with nothing pending", async () => {
    const databaseUrl = await createEmptyTestDatabase();

    await migrate(databaseUrl, FIXTURE_MIGRATIONS_DIR, "up");
    await migrate(databaseUrl, FIXTURE_MIGRATIONS_DIR, "up");

    expect(await queryRows(databaseUrl, WIDGET_COLUMNS)).toHaveLength(2);
  });

  it("applies, reverts and applies again the real migrations", async () => {
    const databaseUrl = await createEmptyTestDatabase();

    await migrate(databaseUrl, MIGRATIONS_DIR, "up");
    const tablesAfterFirstUp = await queryRows(databaseUrl, SCHEMA_TABLES);
    const columnsAfterFirstUp = await queryRows(databaseUrl, SCHEMA_COLUMNS);
    expect(tablesAfterFirstUp.map((row) => row["table_name"])).toEqual([
      "ticket",
      "ticket_history_entry",
    ]);

    await migrate(databaseUrl, MIGRATIONS_DIR, "down");
    expect(await queryRows(databaseUrl, SCHEMA_TABLES)).toEqual([]);

    await migrate(databaseUrl, MIGRATIONS_DIR, "up");
    expect(await queryRows(databaseUrl, SCHEMA_TABLES)).toEqual(
      tablesAfterFirstUp,
    );
    expect(await queryRows(databaseUrl, SCHEMA_COLUMNS)).toEqual(
      columnsAfterFirstUp,
    );
  });
});
