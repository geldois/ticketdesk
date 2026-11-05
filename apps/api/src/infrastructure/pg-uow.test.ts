import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { createMigratedTestDatabase, queryRows } from "../../test/database.ts";
import type { StoredTicketRef } from "../application/stored-ticket.ts";
import {
  createTicketChange,
  transitTicketChange,
} from "../domain/lifecycle.ts";
import type { TicketChange } from "../domain/ticket.ts";
import { PgUoW } from "./pg-uow.ts";
import { createPgPool } from "./pool.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const LATER_INSTANT = new Date("2026-01-02T00:00:00.000Z");

function newTicketChange(customerName: string): TicketChange {
  return createTicketChange(
    {
      customerName,
      description: "Printer is down",
      channel: "chat",
      priority: "low",
    },
    INSTANT,
  );
}

function refuseEntry(change: TicketChange): TicketChange {
  return {
    ticket: change.ticket,
    ticketHistoryEntry: { ...change.ticketHistoryEntry, to: "in_progress" },
  };
}

describe("PgUoW", () => {
  let databaseUrl: string;
  let pgPool: Pool;

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
    pgPool = createPgPool(databaseUrl);
  });

  afterAll(async () => {
    await pgPool.end();
  });

  async function countTickets(customerName: string): Promise<number> {
    const rows = await queryRows(
      databaseUrl,
      "SELECT id FROM ticket WHERE customer_name = $1",
      [customerName],
    );

    return rows.length;
  }

  async function countEntries(ticketId: string): Promise<number> {
    const rows = await queryRows(
      databaseUrl,
      "SELECT id FROM ticket_history_entry WHERE ticket_id = $1",
      [ticketId],
    );

    return rows.length;
  }

  async function countOpenTransactions(): Promise<number> {
    const rows = await queryRows(
      databaseUrl,
      "SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle in transaction'",
    );

    return rows.length;
  }

  async function storeTicket(
    customerName: string,
  ): Promise<{ change: TicketChange; ref: StoredTicketRef }> {
    const change = newTicketChange(customerName);

    await using uow = await PgUoW.begin(pgPool);
    const ref = await uow.ticketRepository.insertTicketChange(change);

    await uow.commit();

    return { change, ref };
  }

  describe("commit", () => {
    it("persists what was written, visible from another connection", async () => {
      const { ref } = await storeTicket("Commit Ana");

      const rows = await queryRows(
        databaseUrl,
        "SELECT version FROM ticket WHERE id = $1",
        [ref.id],
      );
      expect(rows).toEqual([{ version: 1 }]);
      expect(await countEntries(ref.id)).toBe(1);
    });

    it("keeps what was committed when it is called again, or followed by a rollback and the end of the block", async () => {
      const change = newTicketChange("Twice Ana");
      let ref: StoredTicketRef;

      {
        await using uow = await PgUoW.begin(pgPool);
        ref = await uow.ticketRepository.insertTicketChange(change);

        await uow.commit();
        await uow.commit();
        await uow.rollback();
      }

      expect(await countEntries(ref.id)).toBe(1);
      expect(await countTickets("Twice Ana")).toBe(1);
    });
  });

  describe("leaving the block without commit", () => {
    it("leaves nothing of what was written", async () => {
      {
        await using uow = await PgUoW.begin(pgPool);

        await uow.ticketRepository.insertTicketChange(
          newTicketChange("Forgotten Ana"),
        );
      }

      expect(await countTickets("Forgotten Ana")).toBe(0);
    });

    it("leaves nothing and still raises the exception to the caller when the block throws", async () => {
      const failure = await (async () => {
        await using uow = await PgUoW.begin(pgPool);

        await uow.ticketRepository.insertTicketChange(
          newTicketChange("Thrown Ana"),
        );

        throw new Error("block failed");
      })().catch((error: unknown) => error);

      expect(failure).toEqual(new Error("block failed"));
      expect(await countTickets("Thrown Ana")).toBe(0);
    });

    it("leaves no transaction open and no connection busy", async () => {
      {
        await using uow = await PgUoW.begin(pgPool);

        await uow.ticketRepository.findTicketById(
          "019a0000-0000-7000-8000-000000000000",
        );
      }

      expect(await countOpenTransactions()).toBe(0);
      expect(pgPool.totalCount - pgPool.idleCount).toBe(0);
    });
  });

  describe("rollback", () => {
    it("undoes what was written, and the end of the block does no harm afterwards", async () => {
      {
        await using uow = await PgUoW.begin(pgPool);

        await uow.ticketRepository.insertTicketChange(
          newTicketChange("Rolled Back Ana"),
        );
        await uow.rollback();
      }

      expect(await countTickets("Rolled Back Ana")).toBe(0);
    });
  });

  describe("atomicity of the writes", () => {
    it("leaves no ticket behind when the creation entry is refused by the database", async () => {
      const failure = await (async () => {
        await using uow = await PgUoW.begin(pgPool);

        await uow.ticketRepository.insertTicketChange(
          refuseEntry(newTicketChange("Atomic Ana")),
        );
        await uow.commit();
      })().catch((error: unknown) => error);

      expect(failure).toMatchObject({ code: "23514" });
      expect(await countTickets("Atomic Ana")).toBe(0);
    });

    it("keeps working after a refused creation, because the connection goes back to the pool", async () => {
      await (async () => {
        await using uow = await PgUoW.begin(pgPool);

        await uow.ticketRepository.insertTicketChange(
          refuseEntry(newTicketChange("Recovery Ana")),
        );
      })().catch(() => undefined);

      expect(await countOpenTransactions()).toBe(0);
      expect(pgPool.totalCount - pgPool.idleCount).toBe(0);

      const { ref } = await storeTicket("Recovery Ana");

      expect(ref.version).toBe(1);
    });

    it("leaves the ticket and the history as they were when the transition entry is refused by the database", async () => {
      const { change, ref } = await storeTicket("Refused Ana");
      const refusedChange: TicketChange = {
        ticket: { ...change.ticket, status: "in_progress" },
        ticketHistoryEntry: {
          from: "open",
          to: "resolved",
          resolutionNote: "x",
          reopenReason: null,
          at: LATER_INSTANT,
        },
      };

      const failure = await (async () => {
        await using uow = await PgUoW.begin(pgPool);

        await uow.ticketRepository.updateTicketChange(ref.id, 1, refusedChange);
        await uow.commit();
      })().catch((error: unknown) => error);

      expect(failure).toMatchObject({ code: "23514" });

      await using uow = await PgUoW.begin(pgPool);

      await expect(
        uow.ticketRepository.findTicketById(ref.id),
      ).resolves.toEqual({ ref, ticket: change.ticket });
      expect(await countEntries(ref.id)).toBe(1);
    });

    it("ends two concurrent units updating the same version with one winner, the next version and only the winner's entry", async () => {
      for (let round = 0; round < 20; round++) {
        const { change, ref } = await storeTicket(
          `Concurrent Ana ${round.toString()}`,
        );
        const earlier = transitTicketChange(
          change.ticket,
          { to: "in_progress", resolutionNote: null, reopenReason: null },
          INSTANT,
        );
        const later = transitTicketChange(
          change.ticket,
          { to: "in_progress", resolutionNote: null, reopenReason: null },
          LATER_INSTANT,
        );

        async function attempt(change: TicketChange) {
          await using uow = await PgUoW.begin(pgPool);
          const updated = await uow.ticketRepository.updateTicketChange(
            ref.id,
            ref.version,
            change,
          );

          if (updated !== null) {
            await uow.commit();
          }

          return updated;
        }

        const results = await Promise.all([attempt(earlier), attempt(later)]);

        const winnerAt = results[0] === null ? LATER_INSTANT : INSTANT;
        expect(results.filter((result) => result === null)).toHaveLength(1);
        expect(results.find((result) => result !== null)).toEqual({
          id: ref.id,
          version: 2,
        });

        await using uow = await PgUoW.begin(pgPool);
        const entries = await uow.ticketRepository.listTicketHistoryEntries(
          ref.id,
        );

        expect(entries.map((entry) => entry.to)).toEqual([
          "open",
          "in_progress",
        ]);
        expect(entries[1]?.at).toEqual(winnerAt);
      }
    });
  });

  describe("begin", () => {
    it("raises the error and gives the connection back to the pool when BEGIN fails", async () => {
      const brokenPool = createPgPool(databaseUrl);

      brokenPool.on("connect", (client) => {
        client.on("error", () => undefined);
        client
          .query("SELECT pg_terminate_backend(pg_backend_pid())")
          .catch(() => undefined);
      });

      try {
        await expect(PgUoW.begin(brokenPool)).rejects.toThrow();
        await vi.waitFor(() => {
          expect(brokenPool.totalCount).toBe(0);
        });
      } finally {
        await brokenPool.end();
      }
    });
  });
});
