export const DOMAIN_ERROR_CODES = [
  "invalid_customer_name",
  "invalid_description",
  "invalid_channel",
  "invalid_priority",
  "invalid_instant",
  "missing_note",
  "invalid_note",
  "missing_reason",
  "invalid_reason",
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

export class InvalidChannelError extends DomainError {
  readonly code = "invalid_channel";

  constructor() {
    super("channel must be email, chat or phone");
  }
}

export class InvalidPriorityError extends DomainError {
  readonly code = "invalid_priority";

  constructor() {
    super("priority must be low, medium or high");
  }
}

export class InvalidInstantError extends DomainError {
  readonly code = "invalid_instant";

  constructor() {
    super("instant must be a valid date");
  }
}

export class MissingNoteError extends DomainError {
  readonly code = "missing_note";

  constructor() {
    super("a resolution note is required to resolve a ticket");
  }
}

export class InvalidNoteError extends DomainError {
  readonly code = "invalid_note";

  constructor() {
    super("resolution note must have 1 to 2000 valid characters");
  }
}

export class MissingReasonError extends DomainError {
  readonly code = "missing_reason";

  constructor() {
    super("a reason is required to reopen a ticket");
  }
}

export class InvalidReasonError extends DomainError {
  readonly code = "invalid_reason";

  constructor() {
    super("reason must have 1 to 500 valid characters");
  }
}

export class InvalidTransitionError extends DomainError {
  readonly code = "invalid_transition";

  constructor() {
    super("the ticket cannot move to that status from its current one");
  }
}
