export const INTERFACE_ERROR_CODES = [
  "invalid_request",
  "invalid_ticket_id",
  "invalid_cursor",
  "missing_if_match",
  "invalid_if_match",
] as const;

export type InterfaceErrorCode = (typeof INTERFACE_ERROR_CODES)[number];

export abstract class InterfaceError extends Error {
  abstract readonly code: InterfaceErrorCode;
}

export class InvalidRequestError extends InterfaceError {
  readonly code = "invalid_request";

  constructor(
    message = "request body must be an object with customerName, description, channel and priority as text",
  ) {
    super(message);
  }
}

export class InvalidTicketIdError extends InterfaceError {
  readonly code = "invalid_ticket_id";

  constructor() {
    super("ticket id must be a UUID");
  }
}

export class InvalidCursorError extends InterfaceError {
  readonly code = "invalid_cursor";

  constructor() {
    super("cursor must be the one returned in the Link header");
  }
}

export class MissingIfMatchError extends InterfaceError {
  readonly code = "missing_if_match";

  constructor() {
    super("If-Match header with the expected version is required");
  }
}

export class InvalidIfMatchError extends InterfaceError {
  readonly code = "invalid_if_match";

  constructor() {
    super("If-Match must be a positive integer between double quotes");
  }
}
