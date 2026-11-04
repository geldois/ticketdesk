import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedTestDatabase,
  queryRows,
} from "../../../test/database.ts";
import {
  createTicketChange,
  transitTicketChange,
} from "../../domain/lifecycle.ts";
import type {
  ListedTicket,
  ListTicketsQuery,
  TicketPosition,
} from "../../application/stored-ticket.ts";
import type {
  TicketChange,
  TicketChannel,
  TicketStatus,
} from "../../domain/ticket.ts";
import { createPgPool } from "../pool.ts";
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
  let pgPool: Pool;
  let repository: PgTicketRepository;

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
    pgPool = createPgPool(databaseUrl);
    repository = new PgTicketRepository(pgPool);
  });

  afterAll(async () => {
    await pgPool.end();
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

  describe("updateTicketChange", () => {
    async function storeTicket(customerName: string) {
      const change = newTicketChange(customerName);
      const stored = await repository.insertTicketChange(change);

      return { change, stored };
    }

    async function countEntries(ticketId: string): Promise<number> {
      const rows = await queryRows(
        databaseUrl,
        "SELECT id FROM ticket_history_entry WHERE ticket_id = $1",
        [ticketId],
      );

      return rows.length;
    }

    it("stores the new status and the next version, and adds the entry after the creation entry", async () => {
      const { change, stored } = await storeTicket("Update Ana");
      const transition = transitTicketChange(
        change.ticket,
        { to: "in_progress", resolutionNote: null, reopenReason: null },
        LATER_INSTANT,
      );

      const updated = await repository.updateTicketChange(
        stored.id,
        1,
        transition,
      );

      expect(updated).toEqual({ id: stored.id, version: 2 });
      await expect(repository.findTicketById(stored.id)).resolves.toEqual({
        ref: { id: stored.id, version: 2 },
        ticket: transition.ticket,
      });
      await expect(
        repository.listTicketHistoryEntries(stored.id),
      ).resolves.toEqual([
        change.ticketHistoryEntry,
        transition.ticketHistoryEntry,
      ]);
    });

    it("raises the version one by one through resolving and reopening, and moves the note to the resolution entry", async () => {
      const { change, stored } = await storeTicket("Cycle Ana");
      const inProgress = transitTicketChange(
        change.ticket,
        { to: "in_progress", resolutionNote: null, reopenReason: null },
        LATER_INSTANT,
      );
      const resolved = transitTicketChange(
        inProgress.ticket,
        {
          to: "resolved",
          resolutionNote: "Replaced the cable",
          reopenReason: null,
        },
        LATER_INSTANT,
      );
      const reopened = transitTicketChange(
        resolved.ticket,
        { to: "open", resolutionNote: null, reopenReason: "Broke again" },
        LATER_INSTANT,
      );

      const versions = [
        await repository.updateTicketChange(stored.id, 1, inProgress),
        await repository.updateTicketChange(stored.id, 2, resolved),
        await repository.updateTicketChange(stored.id, 3, reopened),
      ].map((ref) => ref?.version);

      expect(versions).toEqual([2, 3, 4]);

      const found = await repository.findTicketById(stored.id);
      expect(found?.ticket.resolutionNote).toBeNull();

      const entries = await repository.listTicketHistoryEntries(stored.id);
      expect(entries.map((entry) => entry.to)).toEqual([
        "open",
        "in_progress",
        "resolved",
        "open",
      ]);
      expect(entries[2]?.resolutionNote).toBe("Replaced the cable");
      expect(entries[3]?.reopenReason).toBe("Broke again");
    });

    it("leaves the ticket and the history as they were when the entry is refused by the database", async () => {
      const { change, stored } = await storeTicket("Refused Ana");
      const refusedChange: TicketChange = {
        ticket: {
          ...change.ticket,
          status: "in_progress",
        },
        ticketHistoryEntry: {
          from: "open",
          to: "resolved",
          resolutionNote: "x",
          reopenReason: null,
          at: LATER_INSTANT,
        },
      };

      await expect(
        repository.updateTicketChange(stored.id, 1, refusedChange),
      ).rejects.toMatchObject({ code: "23514" });

      await expect(repository.findTicketById(stored.id)).resolves.toEqual({
        ref: stored,
        ticket: change.ticket,
      });
      expect(await countEntries(stored.id)).toBe(1);
    });

    it("returns null and changes nothing when the expected version is not the current one", async () => {
      const { change, stored } = await storeTicket("Stale Ana");
      const transition = transitTicketChange(
        change.ticket,
        { to: "in_progress", resolutionNote: null, reopenReason: null },
        LATER_INSTANT,
      );

      await expect(
        repository.updateTicketChange(stored.id, 2, transition),
      ).resolves.toBeNull();

      await expect(repository.findTicketById(stored.id)).resolves.toEqual({
        ref: stored,
        ticket: change.ticket,
      });
      expect(await countEntries(stored.id)).toBe(1);
    });

    it("returns null and changes nothing when the version is right but the entry starts from another status", async () => {
      const { change, stored } = await storeTicket("Origin Ana");
      const fromOtherStatus: TicketChange = {
        ticket: {
          ...change.ticket,
          status: "resolved",
          resolutionNote: "Done",
        },
        ticketHistoryEntry: {
          from: "in_progress",
          to: "resolved",
          resolutionNote: "Done",
          reopenReason: null,
          at: LATER_INSTANT,
        },
      };

      await expect(
        repository.updateTicketChange(stored.id, 1, fromOtherStatus),
      ).resolves.toBeNull();

      await expect(repository.findTicketById(stored.id)).resolves.toEqual({
        ref: stored,
        ticket: change.ticket,
      });
      expect(await countEntries(stored.id)).toBe(1);
    });

    it("returns null for an id that does not exist", async () => {
      const change = newTicketChange("Unknown Ana");
      const transition = transitTicketChange(
        change.ticket,
        { to: "in_progress", resolutionNote: null, reopenReason: null },
        LATER_INSTANT,
      );

      await expect(
        repository.updateTicketChange(UNKNOWN_TICKET_ID, 1, transition),
      ).resolves.toBeNull();
    });

    it("leaves no transaction open on the connection it returns to the pool after a null", async () => {
      const { change, stored } = await storeTicket("Open Transaction Ana");
      const transition = transitTicketChange(
        change.ticket,
        { to: "in_progress", resolutionNote: null, reopenReason: null },
        LATER_INSTANT,
      );

      await repository.updateTicketChange(stored.id, 9, transition);

      const openTransactions = await queryRows(
        databaseUrl,
        "SELECT pid FROM pg_stat_activity WHERE datname = current_database() AND state = 'idle in transaction'",
      );
      expect(openTransactions).toEqual([]);
    });

    it("ends two concurrent updates at the same version with one winner, the next version and only the winner's entry", async () => {
      for (let round = 0; round < 20; round++) {
        const { change, stored } = await storeTicket(
          `Concurrent Ana ${round.toString()}`,
        );

        const transitedTicketChange = transitTicketChange(
          change.ticket,
          { to: "in_progress", resolutionNote: null, reopenReason: null },
          INSTANT,
        );
        const transitedTicketChangeLater = transitTicketChange(
          change.ticket,
          { to: "in_progress", resolutionNote: null, reopenReason: null },
          LATER_INSTANT,
        );

        const results = await Promise.all([
          repository.updateTicketChange(
            stored.id,
            stored.version,
            transitedTicketChange,
          ),
          repository.updateTicketChange(
            stored.id,
            stored.version,
            transitedTicketChangeLater,
          ),
        ]);

        const winnerAt = results[0] === null ? LATER_INSTANT : INSTANT;
        expect(results.filter((result) => result === null)).toHaveLength(1);
        expect(results.find((result) => result !== null)).toEqual({
          id: stored.id,
          version: 2,
        });
        await expect(
          repository.findTicketById(stored.id),
        ).resolves.toMatchObject({
          ref: { id: stored.id, version: 2 },
        });
        const entries = await repository.listTicketHistoryEntries(stored.id);
        expect(entries.map((entry) => entry.to)).toEqual([
          "open",
          "in_progress",
        ]);
        expect(entries[1]?.at).toEqual(winnerAt);
      }
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

  describe("listTickets", () => {
    interface SeedRow {
      readonly id: string;
      readonly createdAt: string;
      readonly status: TicketStatus;
      readonly channel: TicketChannel;
    }

    let listDatabaseUrl: string;
    let listPgPool: Pool;
    let listRepository: PgTicketRepository;
    let counter = 0;

    function seedRow(
      createdAt: string,
      extra: { status?: TicketStatus; channel?: TicketChannel } = {},
    ): SeedRow {
      counter += 1;

      return {
        id: `019a0000-0000-7000-8000-${counter.toString(16).padStart(12, "0")}`,
        createdAt,
        status: extra.status ?? "open",
        channel: extra.channel ?? "chat",
      };
    }

    async function seed(rows: readonly SeedRow[]): Promise<void> {
      await queryRows(listDatabaseUrl, "DELETE FROM ticket");

      for (const row of rows) {
        await queryRows(
          listDatabaseUrl,
          "INSERT INTO ticket (id, customer_name, description, channel, priority, status, created_at, resolution_note) VALUES ($1, 'Seed', 'x', $2, 'low', $3, $4, $5)",
          [
            row.id,
            row.channel,
            row.status,
            row.createdAt,
            row.status === "resolved" ? "done" : null,
          ],
        );
      }
    }

    function list(
      query: Partial<ListTicketsQuery> = {},
    ): Promise<ListedTicket[]> {
      return listRepository.listTickets({
        status: null,
        channel: null,
        afterPosition: null,
        limit: 100,
        ...query,
      });
    }

    function idsOf(listedTickets: readonly ListedTicket[]): string[] {
      return listedTickets.map((listedTicket) => listedTicket.ref.id);
    }

    // O texto ISO de largura fixa compara como instante; empate desfaz pelo id.
    function expectedIds(rows: readonly SeedRow[]): string[] {
      return [...rows]
        .sort((a, b) =>
          a.createdAt === b.createdAt
            ? b.id.localeCompare(a.id)
            : b.createdAt.localeCompare(a.createdAt),
        )
        .map((row) => row.id);
    }

    async function walk(
      limit: number,
      filters: Partial<ListTicketsQuery> = {},
    ): Promise<ListedTicket[]> {
      const walked: ListedTicket[] = [];
      let afterPosition: TicketPosition | null = null;

      for (;;) {
        const page: ListedTicket[] = await list({
          ...filters,
          afterPosition,
          limit,
        });
        const last = page[page.length - 1];

        if (last === undefined) {
          return walked;
        }

        walked.push(...page);
        afterPosition = last.position;
      }
    }

    const DISTINCT = [
      seedRow("2026-03-01T10:00:00.000003Z"),
      seedRow("2026-03-05T10:00:00.000000Z"),
      seedRow("2026-03-02T10:00:00.000000Z"),
      seedRow("2026-03-04T10:00:00.000000Z"),
      seedRow("2026-03-03T10:00:00.000000Z"),
    ];

    const TIES_AND_MICROSECONDS = [
      seedRow("2026-03-02T10:00:00.123455Z"),
      seedRow("2026-03-02T10:00:00.123456Z"),
      seedRow("2026-03-02T10:00:00.123456Z"),
      seedRow("2026-03-02T10:00:00.123456Z"),
      seedRow("2026-03-02T10:00:00.123457Z"),
      seedRow("2026-03-02T10:00:00.123000Z"),
      seedRow("2026-03-02T10:00:00.124000Z"),
      seedRow("2026-03-01T23:59:59.999999Z"),
    ];

    const MIXED = [
      seedRow("2026-03-06T10:00:00.000000Z", {
        status: "open",
        channel: "chat",
      }),
      seedRow("2026-03-05T10:00:00.000000Z", {
        status: "resolved",
        channel: "chat",
      }),
      seedRow("2026-03-04T10:00:00.000000Z", {
        status: "open",
        channel: "email",
      }),
      seedRow("2026-03-03T10:00:00.000000Z", {
        status: "resolved",
        channel: "email",
      }),
      seedRow("2026-03-02T10:00:00.000000Z", {
        status: "open",
        channel: "chat",
      }),
      seedRow("2026-03-01T10:00:00.000000Z", {
        status: "open",
        channel: "chat",
      }),
    ];

    beforeAll(async () => {
      listDatabaseUrl = await createMigratedTestDatabase();
      listPgPool = createPgPool(listDatabaseUrl);
      listRepository = new PgTicketRepository(listPgPool);
    });

    afterAll(async () => {
      await listPgPool.end();
    });

    it("returns an empty list for an empty table", async () => {
      await seed([]);

      await expect(list()).resolves.toEqual([]);
    });

    it("lists the tickets from the newest to the oldest whatever the insertion order", async () => {
      await seed(DISTINCT);

      expect(idsOf(await list())).toEqual(expectedIds(DISTINCT));
    });

    it("cuts the list at the requested number, and a larger number lists every ticket", async () => {
      await seed(DISTINCT);

      expect(idsOf(await list({ limit: 2 }))).toEqual(
        expectedIds(DISTINCT).slice(0, 2),
      );
      expect(await list({ limit: 50 })).toHaveLength(DISTINCT.length);
    });

    it("lists the greater id first among tickets with the same created_at", async () => {
      const tie = [
        seedRow("2026-03-02T10:00:00.123456Z"),
        seedRow("2026-03-02T10:00:00.123456Z"),
      ];
      await seed(tie);

      expect(idsOf(await list())).toEqual(expectedIds(tie));
    });

    it("carries the version, the fields and the position of each ticket", async () => {
      const only = seedRow("2026-03-01T10:00:00.000001Z", {
        status: "resolved",
        channel: "email",
      });
      await seed([only]);
      await queryRows(
        listDatabaseUrl,
        "UPDATE ticket SET version = 3 WHERE id = $1",
        [only.id],
      );

      const [listedTicket] = await list();

      expect(listedTicket?.ref).toEqual({ id: only.id, version: 3 });
      expect(listedTicket?.ticket).toMatchObject({
        customerName: "Seed",
        channel: "email",
        status: "resolved",
        resolutionNote: "done",
      });
      expect(listedTicket?.position).toEqual({
        createdAt: "2026-03-01T10:00:00.000001Z",
        id: only.id,
      });
    });

    it.each([1, 2, 3])(
      "walks pages of %i over ties and microsecond neighbours, repeating and skipping none",
      async (limit) => {
        await seed(TIES_AND_MICROSECONDS);

        const single = await list();
        const walked = await walk(limit);

        expect(idsOf(single)).toEqual(expectedIds(TIES_AND_MICROSECONDS));
        expect(idsOf(walked)).toEqual(idsOf(single));
      },
    );

    it("continues with the next tied ticket from the position of a ticket in the middle of a tie", async () => {
      await seed(TIES_AND_MICROSECONDS);
      const order = expectedIds(TIES_AND_MICROSECONDS);

      const firstPage = await list({ limit: 3 });
      const nextPage = await list({
        limit: 2,
        afterPosition: firstPage[2]?.position ?? null,
      });

      expect(idsOf(nextPage)).toEqual(order.slice(3, 5));
    });

    it("continues the list from a position whose ticket no longer exists", async () => {
      await seed(DISTINCT);
      const order = expectedIds(DISTINCT);
      const [first] = await list({ limit: 1 });
      await queryRows(listDatabaseUrl, "DELETE FROM ticket WHERE id = $1", [
        first?.ref.id,
      ]);

      const next = await list({ afterPosition: first?.position ?? null });

      expect(idsOf(next)).toEqual(order.slice(1));
    });

    it("lists only the tickets of the status asked for, in order", async () => {
      await seed(MIXED);

      const listed = await list({ status: "resolved" });

      expect(idsOf(listed)).toEqual(
        expectedIds(MIXED.filter((row) => row.status === "resolved")),
      );
    });

    it("lists only the tickets of the channel asked for, in order", async () => {
      await seed(MIXED);

      const listed = await list({ channel: "email" });

      expect(idsOf(listed)).toEqual(
        expectedIds(MIXED.filter((row) => row.channel === "email")),
      );
    });

    it("lists only the tickets that match both filters, in order", async () => {
      await seed(MIXED);

      const listed = await list({ status: "open", channel: "chat" });

      expect(idsOf(listed)).toEqual(
        expectedIds(
          MIXED.filter(
            (row) => row.status === "open" && row.channel === "chat",
          ),
        ),
      );
    });

    it("lists nothing when no ticket matches the filters", async () => {
      await seed(MIXED.filter((row) => row.status === "open"));

      await expect(list({ status: "resolved" })).resolves.toEqual([]);
    });

    it.each([
      { status: "open", channel: null },
      { status: null, channel: "chat" },
      { status: "open", channel: "chat" },
    ] as const)(
      "walks filtered pages of 2 listing each matching ticket once (%o)",
      async (filters) => {
        await seed(MIXED);
        const matching = MIXED.filter(
          (row) =>
            (filters.status === null || row.status === filters.status) &&
            (filters.channel === null || row.channel === filters.channel),
        );

        const walked = await walk(2, filters);

        expect(idsOf(walked)).toEqual(expectedIds(matching));
      },
    );
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
