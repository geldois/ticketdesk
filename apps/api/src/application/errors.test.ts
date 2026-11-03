import { describe, expect, it } from "vitest";

import { DomainError } from "../domain/errors.ts";
import {
  APPLICATION_ERROR_CODES,
  ApplicationError,
  TicketNotFoundError,
  VersionConflictError,
} from "./errors.ts";
import type { StoredTicket } from "./stored-ticket.ts";

const CURRENT_STORED_TICKET: StoredTicket = {
  ref: { id: "019a0000-0000-7000-8000-000000000000", version: 2 },
  ticket: {
    customerName: "Ana",
    description: "Printer is down",
    channel: "chat",
    priority: "low",
    status: "in_progress",
    resolutionNote: null,
    createdAt: new Date("2026-01-01T10:20:30.123Z"),
  },
};

const ERRORS = [
  { create: () => new TicketNotFoundError(), code: "ticket_not_found" },
  {
    create: () => new VersionConflictError(CURRENT_STORED_TICKET),
    code: "version_conflict",
  },
] as const;

describe("application errors", () => {
  it.each(ERRORS)(
    "$code is an ApplicationError and an Error that carries its own code",
    ({ create, code }) => {
      const thrown = create();

      expect(thrown).toBeInstanceOf(ApplicationError);
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown.code).toBe(code);
    },
  );

  it.each(ERRORS)(
    "$code is not a DomainError, so the two families tell apart",
    ({ create }) => {
      expect(create()).not.toBeInstanceOf(DomainError);
    },
  );

  it("version_conflict carries the current stored ticket it was given", () => {
    const thrown = new VersionConflictError(CURRENT_STORED_TICKET);

    expect(thrown.currentStoredTicket).toBe(CURRENT_STORED_TICKET);
  });

  it("has one error class for each code of the list", () => {
    const codes = ERRORS.map(({ code }) => code);

    expect(codes.toSorted((a, b) => a.localeCompare(b))).toEqual(
      APPLICATION_ERROR_CODES.toSorted((a, b) => a.localeCompare(b)),
    );
  });
});
