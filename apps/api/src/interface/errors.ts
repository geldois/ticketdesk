export const INTERFACE_ERROR_CODES = [
  "invalid_request",
  "invalid_ticket_id",
] as const;

export type InterfaceErrorCode = (typeof INTERFACE_ERROR_CODES)[number];

export abstract class InterfaceError extends Error {
  abstract readonly code: InterfaceErrorCode;
}

export class InvalidRequestError extends InterfaceError {
  readonly code = "invalid_request";

  constructor() {
    super(
      "request body must be an object with customerName, description, channel and priority as text",
    );
  }
}

export class InvalidTicketIdError extends InterfaceError {
  readonly code = "invalid_ticket_id";

  constructor() {
    super("ticket id must be a UUID");
  }
}
