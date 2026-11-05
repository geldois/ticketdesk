import { describe, expect, it } from "vitest";

import {
  InvalidCustomerNameError,
  InvalidDescriptionError,
  InvalidInstantError,
  InvalidResolutionNoteError,
  InvalidReopenReasonError,
  InvalidTicketChannelError,
  InvalidTicketPriorityError,
  InvalidTransitionError,
  MissingResolutionNoteError,
  MissingReopenReasonError,
  UnexpectedReopenReasonError,
  UnexpectedResolutionNoteError,
} from "./errors.ts";
import {
  CUSTOMER_NAME,
  DESCRIPTION,
  normalizeInvariantField,
  normalizeTicketChannel,
  normalizeTicketPriority,
  normalizeTicketStatus,
  REOPEN_REASON,
  RESOLUTION_NOTE,
  TRANSITION_TICKET_STATUSES,
  TRANSITION_TICKET_TEXTS,
  validateInstant,
  validateTransitionMissing,
  validateTransitionTicketStatus,
  validateTransitionUnexpected,
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

  it.each([
    ["  João   da \t Silva\n", "João da Silva"],
    ["\n Maria \t", "Maria"],
    ["um\t\n\tdois\n\ntrês", "um dois três"],
    ["João D'Ávila-Souza", "João D'Ávila-Souza"],
    ["12345", "12345"],
  ])(
    "normalizes %j to %j: cuts the ends, reduces each block of whitespace to one space and accepts accents, apostrophe, hyphen and digits",
    (raw, normalized) => {
      expect(normalizeInvariantField(raw, field)).toBe(normalized);
    },
  );

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

  it("refuses a control character", () => {
    expect(() => normalizeInvariantField("Maria\u0000", field)).toThrow(
      invalid,
    );
  });

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

    it.each(["Maria 😀", "R$ 10 + 5 < 20", "100% © ™"])(
      "accepts the emoji and symbols in %j",
      (text) => {
        expect(normalizeInvariantField(text, setup.field)).toBe(text);
      },
    );
  },
);

describe("normalizeInvariantField of the customer name", () => {
  it.each(["Maria 😀", "Maria $", "Maria <", "Maria +"])(
    "refuses the emoji or symbol in %j",
    (text) => {
      expect(() => normalizeInvariantField(text, CUSTOMER_NAME)).toThrow(
        InvalidCustomerNameError,
      );
    },
  );
});

describe("normalizeTicketChannel", () => {
  it.each(["chat", "email", "phone"])("returns %j as it is", (raw) => {
    expect(normalizeTicketChannel(raw)).toBe(raw);
  });

  it.each(["", "fax", "EMAIL", " chat", "toString"])("refuses %j", (raw) => {
    expect(() => normalizeTicketChannel(raw)).toThrow(
      InvalidTicketChannelError,
    );
  });
});

describe("normalizeTicketPriority", () => {
  it.each(["low", "medium", "high"])("returns %j as it is", (raw) => {
    expect(normalizeTicketPriority(raw)).toBe(raw);
  });

  it.each(["", "urgent", "HIGH", " low", "toString"])("refuses %j", (raw) => {
    expect(() => normalizeTicketPriority(raw)).toThrow(
      InvalidTicketPriorityError,
    );
  });
});

describe("normalizeTicketStatus", () => {
  it.each(["open", "in_progress", "resolved"])("accepts %j", (raw) => {
    expect(normalizeTicketStatus(raw)).toBe(raw);
  });

  it.each(["", "closed", "OPEN", "in-progress", " open", "toString"])(
    "refuses %j",
    (raw) => {
      expect(() => normalizeTicketStatus(raw)).toThrow(InvalidTransitionError);
    },
  );
});

describe("validateTransitionTicketStatus", () => {
  it.each([
    ["open", "in_progress"],
    ["in_progress", "resolved"],
    ["resolved", "open"],
  ] as const)("accepts %s to %s", (from, to) => {
    expect(() => {
      validateTransitionTicketStatus(from, to);
    }).not.toThrow();
  });

  it.each([
    ["open", "open"],
    ["open", "resolved"],
    ["in_progress", "open"],
    ["in_progress", "in_progress"],
    ["resolved", "in_progress"],
    ["resolved", "resolved"],
  ] as const)("refuses %s to %s", (from, to) => {
    expect(() => {
      validateTransitionTicketStatus(from, to);
    }).toThrow(InvalidTransitionError);
  });
});

describe("TRANSITION_TICKET_STATUSES", () => {
  it("refuses to change a destination of a status and keeps the transition refused", () => {
    expect(() =>
      Object.assign(TRANSITION_TICKET_STATUSES.open, ["resolved"]),
    ).toThrow(TypeError);
    expect(() => {
      validateTransitionTicketStatus("open", "resolved");
    }).toThrow(InvalidTransitionError);
  });

  it("refuses to replace the destinations of a status and keeps the transition accepted", () => {
    expect(() =>
      Object.assign(TRANSITION_TICKET_STATUSES, { open: [] }),
    ).toThrow(TypeError);
    expect(() => {
      validateTransitionTicketStatus("open", "in_progress");
    }).not.toThrow();
  });
});

describe("TRANSITION_TICKET_TEXTS", () => {
  it.each([
    ["in_progress", null, null, null],
    ["resolved", "Replaced the cable", null, "resolutionNote"],
    ["open", null, "It broke again", "reopenReason"],
  ] as const)(
    "names the text that %s requires and accepts it",
    (to, resolutionNote, reopenReason, required) => {
      expect(TRANSITION_TICKET_TEXTS[to]).toBe(required);
      expect(() => {
        validateTransitionMissing(to, resolutionNote, reopenReason);
        validateTransitionUnexpected(to, resolutionNote, reopenReason);
      }).not.toThrow();
    },
  );

  it.each([
    ["resolved", MissingResolutionNoteError],
    ["open", MissingReopenReasonError],
  ] as const)("refuses %s without the text it requires", (to, error) => {
    expect(() => {
      validateTransitionMissing(to, null, null);
    }).toThrow(error);
  });

  it.each([
    ["in_progress", "a note", "Done", null, UnexpectedResolutionNoteError],
    ["in_progress", "a reason", null, "Why", UnexpectedReopenReasonError],
    ["resolved", "a reason", "Done", "Why", UnexpectedReopenReasonError],
    ["open", "a note", "Done", "Why", UnexpectedResolutionNoteError],
  ] as const)(
    "refuses %s with %s that it does not require",
    (to, _, resolutionNote, reopenReason, error) => {
      expect(() => {
        validateTransitionUnexpected(to, resolutionNote, reopenReason);
      }).toThrow(error);
    },
  );

  it("refuses to change the text a destination requires", () => {
    expect(() =>
      Object.assign(TRANSITION_TICKET_TEXTS, { open: null }),
    ).toThrow(TypeError);
    expect(TRANSITION_TICKET_TEXTS.open).toBe("reopenReason");
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
