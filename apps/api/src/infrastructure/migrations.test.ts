import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createTestDatabase, queryRows } from "../../test/database.ts";
import { migrate } from "./migrations.ts";

const FIXTURE_MIGRATIONS_DIR = fileURLToPath(
  new URL("../../test/fixtures/migrations", import.meta.url),
);

const WIDGET_COLUMNS = `
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_name = 'widget'
  ORDER BY ordinal_position`;

describe("migrate", () => {
  it("applies, reverts and applies again the migrations of a directory", async () => {
    const databaseUrl = await createTestDatabase();

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
    const databaseUrl = await createTestDatabase();

    await migrate(databaseUrl, FIXTURE_MIGRATIONS_DIR, "up");
    await migrate(databaseUrl, FIXTURE_MIGRATIONS_DIR, "up");

    expect(await queryRows(databaseUrl, WIDGET_COLUMNS)).toHaveLength(2);
  });
});
