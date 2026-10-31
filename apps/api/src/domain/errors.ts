export const DOMAIN_ERROR_CODES = [
  "invalid_customer_name",
  "invalid_description",
  "invalid_ticket_channel",
  "invalid_ticket_priority",
  "invalid_instant",
  "missing_resolution_note",
  "invalid_resolution_note",
  "missing_reopen_reason",
  "invalid_reopen_reason",
  "invalid_transition",
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;
}

export class InvalidCustomerNameError extends DomainError {
  readonly code = "invalid_customer_name";

  constructor() {
    super("customer name must have 1 to 120 valid characters");
  }
}

export class InvalidDescriptionError extends DomainError {
  readonly code = "invalid_description";

  constructor() {
    super("description must have 1 to 4000 valid characters");
  }
}

export class InvalidTicketChannelError extends DomainError {
  readonly code = "invalid_ticket_channel";

  constructor() {
    super("ticket channel must be email, chat or phone");
  }
}

export class InvalidTicketPriorityError extends DomainError {
  readonly code = "invalid_ticket_priority";

  constructor() {
    super("ticket priority must be low, medium or high");
  }
}

export class InvalidInstantError extends DomainError {
  readonly code = "invalid_instant";

  constructor() {
    super("instant must be a valid date");
  }
}

export class MissingResolutionNoteError extends DomainError {
  readonly code = "missing_resolution_note";

  constructor() {
    super("a resolution note is required to resolve a ticket");
  }
}

export class InvalidResolutionNoteError extends DomainError {
  readonly code = "invalid_resolution_note";

  constructor() {
    super("resolution note must have 1 to 2000 valid characters");
  }
}

export class MissingReopenReasonError extends DomainError {
  readonly code = "missing_reopen_reason";

  constructor() {
    super("a reopen reason is required to reopen a ticket");
  }
}

export class InvalidReopenReasonError extends DomainError {
  readonly code = "invalid_reopen_reason";

  constructor() {
    super("reopen reason must have 1 to 500 valid characters");
  }
}

export class InvalidTransitionError extends DomainError {
  readonly code = "invalid_transition";

  constructor() {
    super("the ticket cannot move to that status from its current one");
  }
}
