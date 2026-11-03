import type { StoredTicket } from "./stored-ticket.ts";

export const APPLICATION_ERROR_CODES = [
  "ticket_not_found",
  "version_conflict",
] as const;

export type ApplicationErrorCode = (typeof APPLICATION_ERROR_CODES)[number];

export abstract class ApplicationError extends Error {
  abstract readonly code: ApplicationErrorCode;
}

export class TicketNotFoundError extends ApplicationError {
  readonly code = "ticket_not_found";

  constructor() {
    super("ticket not found");
  }
}

export class VersionConflictError extends ApplicationError {
  readonly code = "version_conflict";
  readonly currentStoredTicket: StoredTicket;

  constructor(currentStoredTicket: StoredTicket) {
    super("ticket version does not match the expected one");
    this.currentStoredTicket = currentStoredTicket;
  }
}
