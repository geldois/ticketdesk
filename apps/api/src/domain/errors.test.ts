import { describe, expect, it } from "vitest";

import {
  DOMAIN_ERROR_CODES,
  DomainError,
  InvalidCustomerNameError,
  InvalidDescriptionError,
  InvalidInstantError,
  InvalidResolutionNoteError,
  InvalidTicketPriorityError,
  InvalidReopenReasonError,
  InvalidTicketChannelError,
  InvalidTransitionError,
  MissingResolutionNoteError,
  MissingReopenReasonError,
  UnexpectedReopenReasonError,
  UnexpectedResolutionNoteError,
} from "./errors.ts";

const ERRORS = [
  { error: InvalidCustomerNameError, code: "invalid_customer_name" },
  { error: InvalidDescriptionError, code: "invalid_description" },
  { error: InvalidTicketChannelError, code: "invalid_ticket_channel" },
  { error: InvalidTicketPriorityError, code: "invalid_ticket_priority" },
  { error: InvalidInstantError, code: "invalid_instant" },
  { error: MissingResolutionNoteError, code: "missing_resolution_note" },
  { error: InvalidResolutionNoteError, code: "invalid_resolution_note" },
  { error: MissingReopenReasonError, code: "missing_reopen_reason" },
  { error: InvalidReopenReasonError, code: "invalid_reopen_reason" },
  { error: UnexpectedResolutionNoteError, code: "unexpected_resolution_note" },
  { error: UnexpectedReopenReasonError, code: "unexpected_reopen_reason" },
  { error: InvalidTransitionError, code: "invalid_transition" },
] as const;

describe("domain errors", () => {
  it.each(ERRORS)(
    "$code is a DomainError and an Error that carries its own code",
    ({ error, code }) => {
      const thrown = new error();

      expect(thrown).toBeInstanceOf(DomainError);
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown.code).toBe(code);
    },
  );

  it("has one error class for each code of the list", () => {
    const codes = ERRORS.map(({ code }) => code);

    expect(codes.toSorted((a, b) => a.localeCompare(b))).toEqual(
      DOMAIN_ERROR_CODES.toSorted((a, b) => a.localeCompare(b)),
    );
  });
});
