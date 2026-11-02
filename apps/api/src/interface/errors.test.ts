import { describe, expect, it } from "vitest";

import { ApplicationError } from "../application/errors.ts";
import { DomainError } from "../domain/errors.ts";
import {
  INTERFACE_ERROR_CODES,
  InterfaceError,
  InvalidRequestError,
  InvalidTicketIdError,
} from "./errors.ts";

const ERRORS = [
  { error: InvalidRequestError, code: "invalid_request" },
  { error: InvalidTicketIdError, code: "invalid_ticket_id" },
] as const;

describe("interface errors", () => {
  it.each(ERRORS)(
    "$code is an InterfaceError and an Error that carries its own code",
    ({ error, code }) => {
      const thrown = new error();

      expect(thrown).toBeInstanceOf(InterfaceError);
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown.code).toBe(code);
    },
  );

  it.each(ERRORS)(
    "$code is neither a DomainError nor an ApplicationError, so the three families tell apart",
    ({ error }) => {
      expect(new error()).not.toBeInstanceOf(DomainError);
      expect(new error()).not.toBeInstanceOf(ApplicationError);
    },
  );

  it("has one error class for each code of the list", () => {
    const codes = ERRORS.map(({ code }) => code);

    expect(codes.toSorted((a, b) => a.localeCompare(b))).toEqual(
      INTERFACE_ERROR_CODES.toSorted((a, b) => a.localeCompare(b)),
    );
  });
});
