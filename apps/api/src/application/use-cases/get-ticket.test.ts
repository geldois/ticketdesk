import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMigratedTestDatabase } from "../../../test/database.ts";
import { DomainError } from "../../domain/errors.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { PgUoW } from "../../infrastructure/pg-uow.ts";
import { ApplicationError, TicketNotFoundError } from "../errors.ts";
import { CreateTicketUseCase } from "./create-ticket.ts";
import { GetTicketUseCase } from "./get-ticket.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const UNKNOWN_TICKET_ID = "019a0000-0000-7000-8000-000000000000";

describe("GetTicketUseCase", () => {
  let pgPool: Pool;
  let createTicket: CreateTicketUseCase;
  let getTicket: GetTicketUseCase;

  beforeAll(async () => {
    const databaseUrl = await createMigratedTestDatabase();
    pgPool = createPgPool(databaseUrl);
    const uowFactory = (): Promise<PgUoW> => PgUoW.begin(pgPool);
    createTicket = new CreateTicketUseCase(uowFactory);
    getTicket = new GetTicketUseCase(uowFactory);
  });

  afterAll(async () => {
    await pgPool.end();
  });

  it("returns the stored ticket that creating returned", async () => {
    const created = await createTicket.execute(
      {
        customerName: "Ana",
        description: "Printer is down",
        channel: "email",
        priority: "high",
      },
      INSTANT,
    );

    expect(await getTicket.execute(created.ref.id)).toEqual(created);
  });

  it("throws TicketNotFoundError with the code ticket_not_found for an id that does not exist", async () => {
    const failure = await getTicket
      .execute(UNKNOWN_TICKET_ID)
      .then(() => undefined)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(TicketNotFoundError);
    expect(failure).toBeInstanceOf(ApplicationError);
    expect(failure).not.toBeInstanceOf(DomainError);
    expect(failure).toMatchObject({ code: "ticket_not_found" });
  });
});
