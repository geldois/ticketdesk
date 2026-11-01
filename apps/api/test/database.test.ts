import { describe, expect, it } from "vitest";

import { createTestDatabase, queryRows } from "./database.ts";

describe("createTestDatabase", () => {
  it("gives each test its own database, isolated from the others", async () => {
    const first = await createTestDatabase();
    const second = await createTestDatabase();

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
