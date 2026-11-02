export const APPLICATION_ERROR_CODES = ["ticket_not_found"] as const;

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
