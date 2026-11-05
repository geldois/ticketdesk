import { describe, expect, it } from "vitest";

import { createMigratedTestDatabase, queryRows } from "../../test/database.ts";
import { createTicketChange } from "../domain/lifecycle.ts";
import { createPgStorage } from "./pg-storage.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");

describe("PgStorage", () => {
  it("opens a unit of work whose confirmed writes are visible from another connection", async () => {
    const databaseUrl = await createMigratedTestDatabase();
    const storage = createPgStorage(databaseUrl);

    try {
      {
        await using uow = await storage.openUnitOfWork();

        await uow.ticketRepository.insertTicketChange(
          createTicketChange(
            {
              customerName: "Storage Ana",
              description: "Printer is down",
              channel: "chat",
              priority: "low",
            },
            INSTANT,
          ),
        );
        await uow.commit();
      }

      const rows = await queryRows(
        databaseUrl,
        "SELECT customer_name FROM ticket",
      );
      expect(rows).toEqual([{ customer_name: "Storage Ana" }]);
    } finally {
      await storage.close();
    }
  });

  it("is ready while the database answers", async () => {
    const storage = createPgStorage(await createMigratedTestDatabase());

    try {
      await expect(storage.isReady()).resolves.toBe(true);
    } finally {
      await storage.close();
    }
  });

  it("is no longer ready, and refuses to open a unit of work, after it is closed", async () => {
    const storage = createPgStorage(await createMigratedTestDatabase());

    await storage.close();

    await expect(storage.isReady()).resolves.toBe(false);
    await expect(storage.openUnitOfWork()).rejects.toThrow();
  });
});
