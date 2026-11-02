import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedTestDatabase,
  queryRows,
} from "../../../test/database.ts";
import { createTicketChange } from "../../domain/lifecycle.ts";
import type { TicketChange } from "../../domain/ticket.ts";
import { createPool } from "../pool.ts";
import { PgTicketRepository } from "./pg-ticket-repository.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const LATER_INSTANT = new Date("2026-01-02T00:00:00.000Z");
const UNKNOWN_TICKET_ID = "019a0000-0000-7000-8000-000000000000";
const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function newTicketChange(customerName = "Ana"): TicketChange {
  return createTicketChange(
    {
      customerName,
      description: "Printer \u{1D49C} is down",
      channel: "chat",
      priority: "low",
    },
    INSTANT,
  );
}

describe("PgTicketRepository", () => {
  let databaseUrl: string;
  let pool: Pool;
  let repository: PgTicketRepository;

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
    pool = createPool(databaseUrl);
    repository = new PgTicketRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  describe("insertTicketChange", () => {
    it("stores the ticket at version 1 and its creation entry, and returns the generated id", async () => {
      const change = newTicketChange("Insert Ana");

      const stored = await repository.insertTicketChange(change);

      expect(stored.id).toMatch(UUID_V7);
      expect(stored.version).toBe(1);

      const tickets = await queryRows(
        databaseUrl,
        "SELECT customer_name, status, resolution_note, version, created_at FROM ticket WHERE id = $1",
        [stored.id],
      );
      expect(tickets).toEqual([
        {
          customer_name: "Insert Ana",
          status: "open",
          resolution_note: null,
          version: 1,
          created_at: INSTANT,
        },
      ]);

      const entries = await queryRows(
        databaseUrl,
        "SELECT from_status, to_status, resolution_note, reopen_reason, at FROM ticket_history_entry WHERE ticket_id = $1",
        [stored.id],
      );
      expect(entries).toEqual([
        {
          from_status: null,
          to_status: "open",
          resolution_note: null,
          reopen_reason: null,
          at: INSTANT,
        },
      ]);
    });

    it("leaves no ticket behind when the entry is refused by the database", async () => {
      const change = newTicketChange("Atomic Ana");
      const refusedChange: TicketChange = {
        ticket: change.ticket,
        ticketHistoryEntry: {
          ...change.ticketHistoryEntry,
          to: "in_progress",
        },
      };

      await expect(
        repository.insertTicketChange(refusedChange),
      ).rejects.toMatchObject({ code: "23514" });

      const tickets = await queryRows(
        databaseUrl,
        "SELECT id FROM ticket WHERE customer_name = $1",
        ["Atomic Ana"],
      );
      expect(tickets).toEqual([]);
    });

    it("keeps working after a refused insert, because the connection goes back to the pool", async () => {
      const change = newTicketChange("Recovery Ana");
      const refusedChange: TicketChange = {
        ticket: change.ticket,
        ticketHistoryEntry: {
          ...change.ticketHistoryEntry,
          to: "in_progress",
        },
      };

      await expect(
        repository.insertTicketChange(refusedChange),
      ).rejects.toMatchObject({ code: "23514" });

      await expect(
        repository.insertTicketChange(change),
      ).resolves.toMatchObject({ version: 1 });
    });
  });

  describe("findTicketById", () => {
    it("returns the stored reference and the ticket exactly as the domain produced it", async () => {
      const change = newTicketChange("  Find   Ana ");
      const stored = await repository.insertTicketChange(change);

      const found = await repository.findTicketById(stored.id);

      expect(found).toEqual({ ref: stored, ticket: change.ticket });
      expect(found?.ticket.customerName).toBe("Find Ana");
      expect(found?.ticket.createdAt.getTime()).toBe(INSTANT.getTime());
    });

    it("returns null for an id that does not exist", async () => {
      await expect(
        repository.findTicketById(UNKNOWN_TICKET_ID),
      ).resolves.toBeNull();
    });
  });

  describe("listTicketHistoryEntries", () => {
    it("returns the entries in the order they were written, with the domain fields only", async () => {
      const change = newTicketChange("History Ana");
      const stored = await repository.insertTicketChange(change);
      await queryRows(
        databaseUrl,
        `INSERT INTO ticket_history_entry (ticket_id, from_status, to_status, at)
         VALUES ($1, 'open', 'in_progress', $2)`,
        [stored.id, LATER_INSTANT],
      );

      const entries = await repository.listTicketHistoryEntries(stored.id);

      expect(entries).toEqual([
        change.ticketHistoryEntry,
        {
          from: "open",
          to: "in_progress",
          resolutionNote: null,
          reopenReason: null,
          at: LATER_INSTANT,
        },
      ]);
    });

    it("lists only the entries of the ticket it was asked about", async () => {
      const firstChange = newTicketChange("First Ana");
      const first = await repository.insertTicketChange(firstChange);
      await repository.insertTicketChange(newTicketChange("Second Ana"));

      const entries = await repository.listTicketHistoryEntries(first.id);

      expect(entries).toEqual([firstChange.ticketHistoryEntry]);
    });

    it("returns an empty list for an id with no entries", async () => {
      await expect(
        repository.listTicketHistoryEntries(UNKNOWN_TICKET_ID),
      ).resolves.toEqual([]);
    });
  });
});
