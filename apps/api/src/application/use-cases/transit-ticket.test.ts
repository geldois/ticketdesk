import type { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createMigratedTestDatabase } from "../../../test/database.ts";
import { DomainError } from "../../domain/errors.ts";
import { createPgPool } from "../../infrastructure/pool.ts";
import { PgTicketRepository } from "../../infrastructure/repositories/pg-ticket-repository.ts";
import {
  ApplicationError,
  TicketNotFoundError,
  VersionConflictError,
} from "../errors.ts";
import { CreateTicketUseCase } from "./create-ticket.ts";
import {
  type TransitTicketInput,
  TransitTicketUseCase,
} from "./transit-ticket.ts";

const INSTANT = new Date("2026-01-01T10:20:30.123Z");
const LATER_INSTANT = new Date("2026-01-02T00:00:00.000Z");
const UNKNOWN_TICKET_ID = "019a0000-0000-7000-8000-000000000000";
const TO_IN_PROGRESS: TransitTicketInput = {
  to: "in_progress",
  resolutionNote: null,
  reopenReason: null,
};

describe("TransitTicketUseCase", () => {
  let pgPool: Pool;
  let repository: PgTicketRepository;
  let createTicket: CreateTicketUseCase;
  let transitTicket: TransitTicketUseCase;

  beforeAll(async () => {
    const databaseUrl = await createMigratedTestDatabase();
    pgPool = createPgPool(databaseUrl);
    repository = new PgTicketRepository(pgPool);
    createTicket = new CreateTicketUseCase(repository);
    transitTicket = new TransitTicketUseCase(repository);
  });

  afterAll(async () => {
    await pgPool.end();
  });

  async function createOpenTicket() {
    return createTicket.execute(
      {
        customerName: "Ana",
        description: "Printer is down",
        channel: "chat",
        priority: "low",
      },
      INSTANT,
    );
  }

  async function failureOf(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(() => undefined).catch((error: unknown) => error);
  }

  it("returns the stored ticket at the next version, in the new status, and writes the entry stamped with the given instant", async () => {
    const created = await createOpenTicket();

    const transited = await transitTicket.execute(
      created.ref.id,
      1,
      TO_IN_PROGRESS,
      LATER_INSTANT,
    );

    expect(transited.ref).toEqual({ id: created.ref.id, version: 2 });
    expect(transited.ticket.status).toBe("in_progress");
    await expect(repository.findTicketById(created.ref.id)).resolves.toEqual(
      transited,
    );

    const entries = await repository.listTicketHistoryEntries(created.ref.id);
    expect(entries.map((entry) => entry.to)).toEqual(["open", "in_progress"]);
    expect(entries[1]?.at).toEqual(LATER_INSTANT);
  });

  it("throws TicketNotFoundError for an id that does not exist", async () => {
    const failure = await failureOf(
      transitTicket.execute(UNKNOWN_TICKET_ID, 1, TO_IN_PROGRESS, INSTANT),
    );

    expect(failure).toBeInstanceOf(TicketNotFoundError);
    expect(failure).toMatchObject({ code: "ticket_not_found" });
  });

  it("throws VersionConflictError carrying the current stored ticket when the version is old, and writes nothing", async () => {
    const created = await createOpenTicket();
    const current = await transitTicket.execute(
      created.ref.id,
      1,
      TO_IN_PROGRESS,
      INSTANT,
    );

    const failure = await failureOf(
      transitTicket.execute(
        created.ref.id,
        1,
        { to: "resolved", resolutionNote: "Done", reopenReason: null },
        LATER_INSTANT,
      ),
    );

    expect(failure).toBeInstanceOf(VersionConflictError);
    expect(failure).toBeInstanceOf(ApplicationError);
    expect(failure).not.toBeInstanceOf(DomainError);
    expect(failure).toMatchObject({
      code: "version_conflict",
      currentStoredTicket: current,
    });
    await expect(repository.findTicketById(created.ref.id)).resolves.toEqual(
      current,
    );
    await expect(
      repository.listTicketHistoryEntries(created.ref.id),
    ).resolves.toHaveLength(2);
  });

  it("throws the version conflict, not the domain error, when the version is old and the transition is also invalid", async () => {
    const created = await createOpenTicket();
    await transitTicket.execute(created.ref.id, 1, TO_IN_PROGRESS, INSTANT);

    const failure = await failureOf(
      transitTicket.execute(
        created.ref.id,
        1,
        { to: "resolved", resolutionNote: null, reopenReason: null },
        LATER_INSTANT,
      ),
    );

    expect(failure).toBeInstanceOf(VersionConflictError);
  });

  it.each([
    {
      name: "a resolution without a note",
      input: { to: "resolved", resolutionNote: null, reopenReason: null },
      code: "missing_resolution_note",
      setup: true,
    },
    {
      name: "a jump over a status",
      input: {
        to: "resolved",
        resolutionNote: "Done",
        reopenReason: null,
      },
      code: "invalid_transition",
      setup: false,
    },
    {
      name: "a status that does not exist",
      input: { to: "closed", resolutionNote: null, reopenReason: null },
      code: "invalid_transition",
      setup: false,
    },
  ])(
    "throws the domain error for $name at the right version, and writes nothing",
    async ({ input, code, setup }) => {
      const created = await createOpenTicket();
      const current = setup
        ? await transitTicket.execute(
            created.ref.id,
            1,
            TO_IN_PROGRESS,
            INSTANT,
          )
        : created;

      const failure = await failureOf(
        transitTicket.execute(
          created.ref.id,
          current.ref.version,
          input,
          LATER_INSTANT,
        ),
      );

      expect(failure).toBeInstanceOf(DomainError);
      expect(failure).toMatchObject({ code });
      await expect(repository.findTicketById(created.ref.id)).resolves.toEqual(
        current,
      );
    },
  );

  it("ends two concurrent transitions at the same version with one success and one version conflict that carries the winner", async () => {
    for (let round = 0; round < 20; round += 1) {
      const created = await createOpenTicket();

      const outcomes = await Promise.all([
        failureOf(
          transitTicket.execute(created.ref.id, 1, TO_IN_PROGRESS, INSTANT),
        ),
        failureOf(
          transitTicket.execute(
            created.ref.id,
            1,
            TO_IN_PROGRESS,
            LATER_INSTANT,
          ),
        ),
      ]);

      const conflicts = outcomes.filter(
        (outcome) => outcome instanceof VersionConflictError,
      );
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toMatchObject({
        currentStoredTicket: { ref: { version: 2 } },
      });
      await expect(
        repository.listTicketHistoryEntries(created.ref.id),
      ).resolves.toHaveLength(2);
    }
  });
});
