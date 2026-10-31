import { describe, expect, it } from "vitest";

import {
  InvalidCustomerNameError,
  InvalidDescriptionError,
  InvalidInstantError,
  InvalidResolutionNoteError,
  InvalidReopenReasonError,
  InvalidTicketChannelError,
  InvalidTicketPriorityError,
  MissingResolutionNoteError,
  MissingReopenReasonError,
} from "./errors.ts";
import {
  CUSTOMER_NAME,
  DESCRIPTION,
  isTicketChannel,
  isTicketPriority,
  isTicketStatus,
  normalizeInvariantField,
  normalizeTicketChannel,
  normalizeTicketPriority,
  REOPEN_REASON,
  RESOLUTION_NOTE,
  validateInstant,
} from "./invariants.ts";

const FIELDS = [
  {
    name: "customer name",
    field: CUSTOMER_NAME,
    max: 120,
    invalid: InvalidCustomerNameError,
    missing: InvalidCustomerNameError,
  },
  {
    name: "description",
    field: DESCRIPTION,
    max: 4000,
    invalid: InvalidDescriptionError,
    missing: InvalidDescriptionError,
  },
  {
    name: "resolution note",
    field: RESOLUTION_NOTE,
    max: 2000,
    invalid: InvalidResolutionNoteError,
    missing: MissingResolutionNoteError,
  },
  {
    name: "reopen reason",
    field: REOPEN_REASON,
    max: 500,
    invalid: InvalidReopenReasonError,
    missing: MissingReopenReasonError,
  },
];

const FREE_TEXT_FIELDS = FIELDS.filter(({ name }) => name !== "customer name");

const COMBINING_TILDE = String.fromCodePoint(0x303);
const A_TILDE = String.fromCodePoint(0xe3);

describe.each(FIELDS)("normalizeInvariantField of the $name", (setup) => {
  const { field, max, invalid, missing } = setup;

  it("cuts the ends and reduces each block of whitespace to one space", () => {
    expect(normalizeInvariantField("  João   da \t Silva\n", field)).toBe(
      "João da Silva",
    );
  });

  it("cuts only the ends of a text that has no block to reduce", () => {
    expect(normalizeInvariantField("\n Maria \t", field)).toBe("Maria");
  });

  it("reduces a block of tabs and line breaks in the middle to one space", () => {
    expect(normalizeInvariantField("um\t\n\tdois\n\ntrês", field)).toBe(
      "um dois três",
    );
  });

  it("accepts accented letters, an apostrophe and a hyphen", () => {
    expect(normalizeInvariantField("João D'Ávila-Souza", field)).toBe(
      "João D'Ávila-Souza",
    );
  });

  it("accepts a text made only of digits", () => {
    expect(normalizeInvariantField("12345", field)).toBe("12345");
  });

  it("gives the same text for the composed and the decomposed accent", () => {
    const composed = normalizeInvariantField(`Jo${A_TILDE}o`, field);
    const decomposed = normalizeInvariantField(`Joa${COMBINING_TILDE}o`, field);

    expect(decomposed).toBe(composed);
  });

  it("accepts the minimum and the maximum length", () => {
    expect(normalizeInvariantField("a", field)).toBe("a");
    expect(normalizeInvariantField("a".repeat(max), field)).toBe(
      "a".repeat(max),
    );
  });

  it("measures the length after the whitespace is cut", () => {
    const padded = `${"a".repeat(max)}     `;

    expect(normalizeInvariantField(padded, field)).toBe("a".repeat(max));
  });

  it("refuses one code point above the maximum", () => {
    expect(() => normalizeInvariantField("a".repeat(max + 1), field)).toThrow(
      invalid,
    );
  });

  it("counts code points, not UTF-16 units", () => {
    expect(normalizeInvariantField("𝒜".repeat(max), field)).toBe(
      "𝒜".repeat(max),
    );
    expect(() => normalizeInvariantField("𝒜".repeat(max + 1), field)).toThrow(
      invalid,
    );
  });

  it.each(["", "   ", "\t\n"])("refuses the empty text %j", (empty) => {
    expect(() => normalizeInvariantField(empty, field)).toThrow(missing);
  });

  it.each(["Maria 😀", "Maria $", "Maria <", "Maria +", "Maria\u0000"])(
    "refuses the emoji, symbol or control character in %j",
    (text) => {
      expect(() => normalizeInvariantField(text, field)).toThrow(invalid);
    },
  );

  it("refuses a combining mark left alone after the normalization", () => {
    expect(() => normalizeInvariantField(COMBINING_TILDE, field)).toThrow(
      invalid,
    );
  });
});

describe.each(FREE_TEXT_FIELDS)(
  "normalizeInvariantField of the $name",
  (setup) => {
    it("accepts punctuation", () => {
      const text = "Erro 500, ao pagar (cartão)! Pode ajudar?";

      expect(normalizeInvariantField(text, setup.field)).toBe(text);
    });
  },
);

describe.each([
  { name: "channel", is: isTicketChannel, valid: ["chat", "email", "phone"] },
  {
    name: "priority",
    is: isTicketPriority,
    valid: ["low", "medium", "high"],
  },
  {
    name: "status",
    is: isTicketStatus,
    valid: ["open", "in_progress", "resolved"],
  },
])("the ticket $name predicate", ({ is, valid }) => {
  it.each(valid)("accepts %j", (raw) => {
    expect(is(raw)).toBe(true);
  });

  it.each(["", "fax", "EMAIL", " open", "toString"])("refuses %j", (raw) => {
    expect(is(raw)).toBe(false);
  });
});

describe("normalizeTicketChannel", () => {
  it.each(["chat", "email", "phone"])("returns %j as it is", (raw) => {
    expect(normalizeTicketChannel(raw)).toBe(raw);
  });

  it.each(["", "fax", "EMAIL"])("refuses %j", (raw) => {
    expect(() => normalizeTicketChannel(raw)).toThrow(
      InvalidTicketChannelError,
    );
  });
});

describe("normalizeTicketPriority", () => {
  it.each(["low", "medium", "high"])("returns %j as it is", (raw) => {
    expect(normalizeTicketPriority(raw)).toBe(raw);
  });

  it.each(["", "urgent", "HIGH"])("refuses %j", (raw) => {
    expect(() => normalizeTicketPriority(raw)).toThrow(
      InvalidTicketPriorityError,
    );
  });
});

describe("validateInstant", () => {
  it("accepts a valid date", () => {
    expect(() => {
      validateInstant(new Date("2026-03-01T12:00:00.000Z"));
    }).not.toThrow();
  });

  it("refuses an invalid date", () => {
    expect(() => {
      validateInstant(new Date(Number.NaN));
    }).toThrow(InvalidInstantError);
  });
});
