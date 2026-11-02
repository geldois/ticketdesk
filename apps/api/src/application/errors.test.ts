import { describe, expect, it } from "vitest";

import { DomainError } from "../domain/errors.ts";
import {
  APPLICATION_ERROR_CODES,
  ApplicationError,
  TicketNotFoundError,
} from "./errors.ts";

const ERRORS = [
  { error: TicketNotFoundError, code: "ticket_not_found" },
] as const;

describe("application errors", () => {
  it.each(ERRORS)(
    "$code is an ApplicationError and an Error that carries its own code",
    ({ error, code }) => {
      const thrown = new error();

      expect(thrown).toBeInstanceOf(ApplicationError);
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown.code).toBe(code);
    },
  );

  it.each(ERRORS)(
    "$code is not a DomainError, so the two families tell apart",
    ({ error }) => {
      expect(new error()).not.toBeInstanceOf(DomainError);
    },
  );

  it("has one error class for each code of the list", () => {
    const codes = ERRORS.map(({ code }) => code);

    expect(codes.toSorted((a, b) => a.localeCompare(b))).toEqual(
      APPLICATION_ERROR_CODES.toSorted((a, b) => a.localeCompare(b)),
    );
  });
});
