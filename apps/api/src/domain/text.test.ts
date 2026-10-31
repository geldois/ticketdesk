import { describe, expect, it } from "vitest";

import {
  InvalidCustomerNameError,
  InvalidDescriptionError,
  InvalidNoteError,
  InvalidReasonError,
  MissingNoteError,
  MissingReasonError,
} from "./errors.ts";
import {
  CUSTOMER_NAME,
  DESCRIPTION,
  REOPEN_REASON,
  RESOLUTION_NOTE,
} from "./invariants.ts";
import { normalizeText } from "./text.ts";

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
    invalid: InvalidNoteError,
    missing: MissingNoteError,
  },
  {
    name: "reopen reason",
    field: REOPEN_REASON,
    max: 500,
    invalid: InvalidReasonError,
    missing: MissingReasonError,
  },
];

const FREE_TEXT_FIELDS = FIELDS.filter(({ name }) => name !== "customer name");

const COMBINING_TILDE = String.fromCodePoint(0x303);
const A_TILDE = String.fromCodePoint(0xe3);

describe.each(FIELDS)("normalizeText of the $name", (setup) => {
  const { field, max, invalid, missing } = setup;

  it("cuts the ends and reduces each block of whitespace to one space", () => {
    expect(normalizeText("  João   da \t Silva\n", field)).toBe(
      "João da Silva",
    );
  });

  it("cuts only the ends of a text that has no block to reduce", () => {
    expect(normalizeText("\n Maria \t", field)).toBe("Maria");
  });

  it("reduces a block of tabs and line breaks in the middle to one space", () => {
    expect(normalizeText("um\t\n\tdois\n\ntrês", field)).toBe("um dois três");
  });

  it("accepts accented letters, an apostrophe and a hyphen", () => {
    expect(normalizeText("João D'Ávila-Souza", field)).toBe(
      "João D'Ávila-Souza",
    );
  });

  it("accepts a text made only of digits", () => {
    expect(normalizeText("12345", field)).toBe("12345");
  });

  it("gives the same text for the composed and the decomposed accent", () => {
    const composed = normalizeText(`Jo${A_TILDE}o`, field);
    const decomposed = normalizeText(`Joa${COMBINING_TILDE}o`, field);

    expect(decomposed).toBe(composed);
  });

  it("accepts the minimum and the maximum length", () => {
    expect(normalizeText("a", field)).toBe("a");
    expect(normalizeText("a".repeat(max), field)).toBe("a".repeat(max));
  });

  it("measures the length after the whitespace is cut", () => {
    const padded = `${"a".repeat(max)}     `;

    expect(normalizeText(padded, field)).toBe("a".repeat(max));
  });

  it("refuses one code point above the maximum", () => {
    expect(() => normalizeText("a".repeat(max + 1), field)).toThrow(invalid);
  });

  it("counts code points, not UTF-16 units", () => {
    expect(normalizeText("𝒜".repeat(max), field)).toBe("𝒜".repeat(max));
    expect(() => normalizeText("𝒜".repeat(max + 1), field)).toThrow(invalid);
  });

  it.each(["", "   ", "\t\n"])("refuses the empty text %j", (empty) => {
    expect(() => normalizeText(empty, field)).toThrow(missing);
  });

  it.each(["Maria 😀", "Maria $", "Maria <", "Maria +", "Maria\u0000"])(
    "refuses the emoji, symbol or control character in %j",
    (text) => {
      expect(() => normalizeText(text, field)).toThrow(invalid);
    },
  );

  it("refuses a combining mark left alone after the normalization", () => {
    expect(() => normalizeText(COMBINING_TILDE, field)).toThrow(invalid);
  });
});

describe.each(FREE_TEXT_FIELDS)("normalizeText of the $name", (setup) => {
  it("accepts punctuation", () => {
    const text = "Erro 500, ao pagar (cartão)! Pode ajudar?";

    expect(normalizeText(text, setup.field)).toBe(text);
  });
});
