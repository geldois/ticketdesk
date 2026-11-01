import { describe, expect, it } from "vitest";

import { createMigratedTestDatabase, queryRows } from "./database.ts";

describe("createMigratedTestDatabase", () => {
  it("gives each test its own database, isolated from the others", async () => {
    const first = await createMigratedTestDatabase();
    const second = await createMigratedTestDatabase();

    await queryRows(first, "CREATE TABLE marker (id integer)");

    expect(
      await queryRows(
        first,
        "SELECT 1 FROM pg_tables WHERE tablename = 'marker'",
      ),
    ).toHaveLength(1);
    expect(
      await queryRows(
        second,
        "SELECT 1 FROM pg_tables WHERE tablename = 'marker'",
      ),
    ).toEqual([]);
  });
});
