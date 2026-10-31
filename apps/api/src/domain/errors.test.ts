import { describe, expect, it } from "vitest";

import {
  DOMAIN_ERROR_CODES,
  DomainError,
  InvalidChannelError,
  InvalidCustomerNameError,
  InvalidDescriptionError,
  InvalidInstantError,
  InvalidNoteError,
  InvalidPriorityError,
  InvalidReasonError,
  InvalidTransitionError,
  MissingNoteError,
  MissingReasonError,
} from "./errors.ts";

const ERRORS = [
  { error: InvalidCustomerNameError, code: "invalid_customer_name" },
  { error: InvalidDescriptionError, code: "invalid_description" },
  { error: InvalidChannelError, code: "invalid_channel" },
  { error: InvalidPriorityError, code: "invalid_priority" },
  { error: InvalidInstantError, code: "invalid_instant" },
  { error: MissingNoteError, code: "missing_note" },
  { error: InvalidNoteError, code: "invalid_note" },
  { error: MissingReasonError, code: "missing_reason" },
  { error: InvalidReasonError, code: "invalid_reason" },
  { error: InvalidTransitionError, code: "invalid_transition" },
] as const;

describe("domain errors", () => {
  it.each(ERRORS)("$code is a DomainError and an Error", ({ error }) => {
    const thrown = new error();

    expect(thrown).toBeInstanceOf(DomainError);
    expect(thrown).toBeInstanceOf(Error);
  });

  it.each(ERRORS)("$code carries its own code", ({ error, code }) => {
    expect(new error().code).toBe(code);
  });

  it.each(ERRORS)("$code carries a message", ({ error }) => {
    expect(new error().message).not.toBe("");
  });

  it("has one error class for each code of the list", () => {
    const codes = ERRORS.map(({ code }) => code);

    expect(codes.toSorted((a, b) => a.localeCompare(b))).toEqual(
      DOMAIN_ERROR_CODES.toSorted((a, b) => a.localeCompare(b)),
    );
  });
});
