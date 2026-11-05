import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  createMigratedTestDatabase,
  queryRows,
} from "../../../test/database.ts";
import { DomainError } from "../../domain/errors.ts";
import { PgTicketRepository } from "../../infrastructure/repositories/pg-ticket-repository.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { CreateTicketUseCase } from "./create-ticket.ts";
import type { CreateTicketInput } from "./create-ticket.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const UUID_V7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const INPUT: CreateTicketInput = {
  customerName: "  Ana   Lima ",
  description: "Printer \u{1D49C} is down",
  channel: "chat",
  priority: "low",
};

describe("CreateTicketUseCase", () => {
  let databaseUrl: string;
  let pgPool: Pool;
  let repository: PgTicketRepository;
  let createTicket: CreateTicketUseCase;

  async function countRows(table: string): Promise<number> {
    const rows = await queryRows(
      databaseUrl,
      `SELECT count(*)::int AS total FROM ${table}`,
    );
    return Number(rows[0]?.["total"]);
  }

  beforeAll(async () => {
    databaseUrl = await createMigratedTestDatabase();
    pgPool = createPgPool(databaseUrl);
    repository = new PgTicketRepository(pgPool);
    createTicket = new CreateTicketUseCase(repository);
  });

  afterAll(async () => {
    await pgPool.end();
  });

  it("returns the stored ticket: a generated id, version 1 and an open ticket with the normalized text", async () => {
    const stored = await createTicket.execute(INPUT, INSTANT);

    expect(stored.ref.id).toMatch(UUID_V7);
    expect(stored.ref.version).toBe(1);
    expect(stored.ticket).toEqual({
      customerName: "Ana Lima",
      description: "Printer \u{1D49C} is down",
      channel: "chat",
      priority: "low",
      status: "open",
      resolutionNote: null,
      createdAt: INSTANT,
    });
  });

  it("uses the instant passed as argument as the creation instant", async () => {
    const instant = new Date("2030-06-15T08:00:00.999Z");

    const stored = await createTicket.execute(INPUT, instant);

    expect(stored.ticket.createdAt.getTime()).toBe(instant.getTime());
  });

  it("persists what it returns, so reading the id back gives the same ticket and its creation entry", async () => {
    const stored = await createTicket.execute(INPUT, INSTANT);

    expect(await repository.findTicketById(stored.ref.id)).toEqual(stored);
    expect(await repository.listTicketHistoryEntries(stored.ref.id)).toEqual([
      {
        from: null,
        to: "open",
        resolutionNote: null,
        reopenReason: null,
        at: INSTANT,
      },
    ]);
  });

  it("lets the domain error of a refused input through and writes nothing", async () => {
    const ticketsBefore = await countRows("ticket");
    const entriesBefore = await countRows("ticket_history_entry");

    const failure = await createTicket
      .execute({ ...INPUT, customerName: "Ana \u0001" }, INSTANT)
      .then(() => undefined)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(DomainError);
    expect(failure).toMatchObject({ code: "invalid_customer_name" });
    expect(await countRows("ticket")).toBe(ticketsBefore);
    expect(await countRows("ticket_history_entry")).toBe(entriesBefore);
  });
});
