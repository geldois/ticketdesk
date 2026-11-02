import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedTestDatabase,
  queryRows,
} from "../../../test/database.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { PgTicketRepository } from "../../infrastructure/repositories/pg-ticket-repository.ts";
import { TicketNotFoundError } from "../errors.ts";
import type { CreateTicketInput } from "./create-ticket.ts";
import { CreateTicketUseCase } from "./create-ticket.ts";
import { ListTicketHistoryEntriesUseCase } from "./list-ticket-history-entries.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const LATER_INSTANT = new Date("2026-01-02T00:00:00.000Z");
const UNKNOWN_TICKET_ID = "019a0000-0000-7000-8000-000000000000";

const INPUT: CreateTicketInput = {
  customerName: "Ana",
  description: "Printer is down",
  channel: "phone",
  priority: "medium",
};

describe("ListTicketHistoryEntriesUseCase", () => {
  let databaseUrl: string;
  let pgPool: Pool;
  let createTicket: CreateTicketUseCase;
  let listTicketHistoryEntries: ListTicketHistoryEntriesUseCase;

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
    pgPool = createPgPool(databaseUrl);
    const repository = new PgTicketRepository(pgPool);
    createTicket = new CreateTicketUseCase(repository);
    listTicketHistoryEntries = new ListTicketHistoryEntriesUseCase(repository);
  });

  afterAll(async () => {
    await pgPool.end();
  });

  it("returns the creation entry of a new ticket", async () => {
    const created = await createTicket.execute(INPUT, INSTANT);

    expect(await listTicketHistoryEntries.execute(created.ref.id)).toEqual([
      {
        from: null,
        to: "open",
        resolutionNote: null,
        reopenReason: null,
        at: INSTANT,
      },
    ]);
  });

  it("returns the entries in the order they were written and none of another ticket", async () => {
    const created = await createTicket.execute(INPUT, INSTANT);
    await createTicket.execute(INPUT, INSTANT);
    await queryRows(
      databaseUrl,
      "INSERT INTO ticket_history_entry (ticket_id, from_status, to_status, at) VALUES ($1, 'open', 'in_progress', $2)",
      [created.ref.id, LATER_INSTANT],
    );

    const entries = await listTicketHistoryEntries.execute(created.ref.id);

    expect(entries.map(({ to, at }) => ({ to, at }))).toEqual([
      { to: "open", at: INSTANT },
      { to: "in_progress", at: LATER_INSTANT },
    ]);
  });

  it("throws TicketNotFoundError for an id that does not exist instead of returning an empty list", async () => {
    const failure = await listTicketHistoryEntries
      .execute(UNKNOWN_TICKET_ID)
      .then(() => undefined)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TicketNotFoundError);
    expect(failure).toMatchObject({ code: "ticket_not_found" });
  });
});
