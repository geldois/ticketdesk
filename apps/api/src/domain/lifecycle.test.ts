import { describe, expect, it } from "vitest";

import {
  DomainError,
  InvalidCustomerNameError,
  InvalidDescriptionError,
  InvalidInstantError,
  InvalidTicketChannelError,
  InvalidResolutionNoteError,
  InvalidReopenReasonError,
  InvalidTicketPriorityError,
  InvalidTransitionError,
  MissingResolutionNoteError,
  MissingReopenReasonError,
  UnexpectedReopenReasonError,
  UnexpectedResolutionNoteError,
} from "./errors.ts";
import { createTicketChange, transitTicketChange } from "./lifecycle.ts";
import type { Ticket, TicketStatus } from "./ticket.ts";

const AT = new Date("2026-03-01T12:00:00.000Z");
const CREATED_AT = new Date("2026-02-01T09:00:00.000Z");

const VALID = {
  customerName: "Maria Souza",
  description: "Não consigo acessar a fatura",
  channel: "email",
  priority: "medium",
};

function create(over: Partial<typeof VALID> = {}, at: Date = AT) {
  return createTicketChange({ ...VALID, ...over }, at);
}

describe("createTicketChange", () => {
  it("returns an open ticket with no resolution note and createdAt equal to the instant", () => {
    expect(create().ticket).toEqual({
      customerName: "Maria Souza",
      description: "Não consigo acessar a fatura",
      channel: "email",
      priority: "medium",
      status: "open",
      resolutionNote: null,
      createdAt: AT,
    });
  });

  it("returns the first history entry, from null to open, with no note or reason, at the instant", () => {
    expect(create().ticketHistoryEntry).toEqual({
      from: null,
      to: "open",
      resolutionNote: null,
      reopenReason: null,
      at: AT,
    });
  });

  it("returns a ticket without id and version", () => {
    const { ticket } = create();

    expect(ticket).not.toHaveProperty("id");
    expect(ticket).not.toHaveProperty("version");
  });

  it("cuts the ends and reduces each block of whitespace to one space in the name and the description", () => {
    const { ticket } = create({
      customerName: "  João   da \t Silva\n",
      description: "\n linha um\n\nlinha  dois \t",
    });

    expect(ticket.customerName).toBe("João da Silva");
    expect(ticket.description).toBe("linha um linha dois");
  });

  it("accepts an accented name with apostrophe and hyphen, a name of digits and a punctuated description", () => {
    expect(
      create({ customerName: "João D'Ávila-Souza" }).ticket.customerName,
    ).toBe("João D'Ávila-Souza");
    expect(create({ customerName: "12345" }).ticket.customerName).toBe("12345");
    expect(
      create({ description: "Erro 500, ao pagar (cartão)! Pode ajudar?" })
        .ticket.description,
    ).toBe("Erro 500, ao pagar (cartão)! Pode ajudar?");
  });

  it.each(["Maria 😀", "Maria $", "Maria <b>", "Maria + Ana", "Maria\u0000"])(
    "refuses the name %j",
    (customerName) => {
      expect(() => create({ customerName })).toThrow(InvalidCustomerNameError);
    },
  );

  it.each(["fatura 😀", "fatura $10", "a < b", "x\u0007y"])(
    "refuses the description %j",
    (description) => {
      expect(() => create({ description })).toThrow(InvalidDescriptionError);
    },
  );

  it("accepts a name of 1 and of 120 characters, and of 120 letters plus trailing spaces", () => {
    expect(create({ customerName: "a" }).ticket.customerName).toBe("a");
    expect(create({ customerName: "a".repeat(120) }).ticket.customerName).toBe(
      "a".repeat(120),
    );
    expect(
      create({ customerName: `${"a".repeat(120)}     ` }).ticket.customerName,
    ).toBe("a".repeat(120));
  });

  it.each(["", "   ", "\t\n", "a".repeat(121)])(
    "refuses the empty, blank or too long name %j",
    (customerName) => {
      expect(() => create({ customerName })).toThrow(InvalidCustomerNameError);
    },
  );

  it("accepts a description of 1 and of 4000 characters", () => {
    expect(create({ description: "a" }).ticket.description).toBe("a");
    expect(create({ description: "a".repeat(4000) }).ticket.description).toBe(
      "a".repeat(4000),
    );
  });

  it.each(["", "   ", "a".repeat(4001)])(
    "refuses the empty, blank or too long description",
    (description) => {
      expect(() => create({ description })).toThrow(InvalidDescriptionError);
    },
  );

  it.each(["email", "chat", "phone"])("accepts the channel %j", (channel) => {
    expect(create({ channel }).ticket.channel).toBe(channel);
  });

  it.each(["low", "medium", "high"])("accepts the priority %j", (priority) => {
    expect(create({ priority }).ticket.priority).toBe(priority);
  });

  it.each(["fax", "", "EMAIL"])("refuses the channel %j", (channel) => {
    expect(() => create({ channel })).toThrow(InvalidTicketChannelError);
  });

  it.each(["urgent", "", "HIGH"])("refuses the priority %j", (priority) => {
    expect(() => create({ priority })).toThrow(InvalidTicketPriorityError);
  });

  it("refuses an invalid instant", () => {
    expect(() => create({}, new Date(Number.NaN))).toThrow(InvalidInstantError);
  });

  it("fails first on the instant when the instant and the name are invalid", () => {
    expect(() => create({ customerName: "" }, new Date(Number.NaN))).toThrow(
      InvalidInstantError,
    );
  });

  it("fails first on the name when the name and the description are invalid", () => {
    expect(() => create({ customerName: "", description: "" })).toThrow(
      InvalidCustomerNameError,
    );
  });

  it("fails first on the description when the description and the channel are invalid", () => {
    expect(() => create({ description: "", channel: "fax" })).toThrow(
      InvalidDescriptionError,
    );
  });

  it("fails first on the channel when the channel and the priority are invalid", () => {
    expect(() => create({ channel: "fax", priority: "urgent" })).toThrow(
      InvalidTicketChannelError,
    );
  });

  it("throws a DomainError", () => {
    expect(() => create({ customerName: "" })).toThrow(DomainError);
  });

  it("keeps the ticket and the entry when the received instant changes afterwards", () => {
    const received = new Date(AT.getTime());
    const { ticket, ticketHistoryEntry } = create({}, received);

    received.setUTCFullYear(2000);

    expect(ticket.createdAt).toEqual(AT);
    expect(ticketHistoryEntry.at).toEqual(AT);
  });

  it("does not change the input object, even frozen", () => {
    const input = Object.freeze({ ...VALID });

    expect(() => createTicketChange(input, AT)).not.toThrow();
  });
});

function ticketIn(status: TicketStatus, resolutionNote: string | null): Ticket {
  return {
    customerName: "Maria Souza",
    description: "Não consigo acessar a fatura",
    channel: "email",
    priority: "medium",
    status,
    resolutionNote,
    createdAt: new Date(CREATED_AT),
  };
}

function transition(
  ticket: Ticket,
  to: TicketStatus,
  over: { resolutionNote?: string | null; reopenReason?: string | null } = {},
  at: Date = AT,
) {
  return transitTicketChange(
    ticket,
    { to, resolutionNote: null, reopenReason: null, ...over },
    at,
  );
}

const VALID_PAIRS = [
  ["open", "in_progress"],
  ["in_progress", "resolved"],
  ["resolved", "open"],
] as const;

const STATUSES = ["open", "in_progress", "resolved"] as const;

describe("transitTicketChange", () => {
  it("moves open to in_progress and records the entry at the instant", () => {
    const { ticket, ticketHistoryEntry } = transition(
      ticketIn("open", null),
      "in_progress",
    );

    expect(ticket.status).toBe("in_progress");
    expect(ticketHistoryEntry).toEqual({
      from: "open",
      to: "in_progress",
      resolutionNote: null,
      reopenReason: null,
      at: AT,
    });
  });

  it("moves in_progress to resolved and writes the note on the ticket and on the entry", () => {
    const { ticket, ticketHistoryEntry } = transition(
      ticketIn("in_progress", null),
      "resolved",
      { resolutionNote: "Fatura reenviada" },
    );

    expect(ticket.status).toBe("resolved");
    expect(ticket.resolutionNote).toBe("Fatura reenviada");
    expect(ticketHistoryEntry.from).toBe("in_progress");
    expect(ticketHistoryEntry.to).toBe("resolved");
    expect(ticketHistoryEntry.resolutionNote).toBe("Fatura reenviada");
    expect(ticketHistoryEntry.reopenReason).toBeNull();
  });

  it("moves resolved to open, writes the reason only on the entry and clears the note of the ticket", () => {
    const { ticket, ticketHistoryEntry } = transition(
      ticketIn("resolved", "Fatura reenviada"),
      "open",
      { reopenReason: "Voltou a falhar" },
    );

    expect(ticket.status).toBe("open");
    expect(ticket.resolutionNote).toBeNull();
    expect(Object.values(ticket)).not.toContain("Voltou a falhar");
    expect(ticketHistoryEntry.reopenReason).toBe("Voltou a falhar");
    expect(ticketHistoryEntry.resolutionNote).toBeNull();
  });

  it("writes the new note when it resolves again after reopening", () => {
    const first = transition(ticketIn("in_progress", null), "resolved", {
      resolutionNote: "Primeira",
    });
    const reopened = transition(first.ticket, "open", {
      reopenReason: "Voltou",
    });
    const progress = transition(reopened.ticket, "in_progress");
    const second = transition(progress.ticket, "resolved", {
      resolutionNote: "Segunda",
    });

    expect(second.ticket.resolutionNote).toBe("Segunda");
    expect(second.ticketHistoryEntry.resolutionNote).toBe("Segunda");
  });

  it.each(
    STATUSES.flatMap((from) =>
      STATUSES.filter(
        (to) => !VALID_PAIRS.some(([f, t]) => f === from && t === to),
      ).map((to) => ({ from, to })),
    ),
  )("refuses $from to $to as an invalid transition", ({ from, to }) => {
    expect(() =>
      transition(ticketIn(from, null), to, {
        resolutionNote: "Fatura reenviada",
        reopenReason: "Voltou",
      }),
    ).toThrow(InvalidTransitionError);
  });

  it.each(["closed", "", "OPEN", "in-progress"])(
    "refuses the destination %j that is not a status",
    (to) => {
      // @ts-expect-error the destination is not a TicketStatus on purpose
      expect(() => transition(ticketIn("open", null), to)).toThrow(
        InvalidTransitionError,
      );
    },
  );

  it.each([null, "", "   ", "\t\n"])(
    "refuses to resolve with the note %j as missing",
    (resolutionNote) => {
      expect(() =>
        transition(ticketIn("in_progress", null), "resolved", {
          resolutionNote,
        }),
      ).toThrow(MissingResolutionNoteError);
    },
  );

  it.each(["😀", "custo $10", "a".repeat(2001)])(
    "refuses to resolve with the invalid note %j",
    (resolutionNote) => {
      expect(() =>
        transition(ticketIn("in_progress", null), "resolved", {
          resolutionNote,
        }),
      ).toThrow(InvalidResolutionNoteError);
    },
  );

  it("accepts a note of 1 and of 2000 characters on the ticket and on the entry", () => {
    for (const note of ["a", "a".repeat(2000)]) {
      const { ticket, ticketHistoryEntry } = transition(
        ticketIn("in_progress", null),
        "resolved",
        { resolutionNote: note },
      );

      expect(ticket.resolutionNote).toBe(note);
      expect(ticketHistoryEntry.resolutionNote).toBe(note);
    }
  });

  it("cuts the ends and reduces each block of whitespace in the note, on the ticket and on the entry", () => {
    const { ticket, ticketHistoryEntry } = transition(
      ticketIn("in_progress", null),
      "resolved",
      { resolutionNote: "  linha   um\n\nlinha dois \t" },
    );

    expect(ticket.resolutionNote).toBe("linha um linha dois");
    expect(ticketHistoryEntry.resolutionNote).toBe("linha um linha dois");
  });

  it.each([null, "", "   ", "\t\n"])(
    "refuses to reopen with the reason %j as missing",
    (reopenReason) => {
      expect(() =>
        transition(ticketIn("resolved", "Fatura reenviada"), "open", {
          reopenReason,
        }),
      ).toThrow(MissingReopenReasonError);
    },
  );

  it.each(["😀", "custo $10", "a".repeat(501)])(
    "refuses to reopen with the invalid reason %j",
    (reopenReason) => {
      expect(() =>
        transition(ticketIn("resolved", "Fatura reenviada"), "open", {
          reopenReason,
        }),
      ).toThrow(InvalidReopenReasonError);
    },
  );

  it("accepts a reason of 1 and of 500 characters only on the entry", () => {
    for (const reason of ["a", "a".repeat(500)]) {
      const { ticket, ticketHistoryEntry } = transition(
        ticketIn("resolved", "Fatura reenviada"),
        "open",
        { reopenReason: reason },
      );

      expect(ticketHistoryEntry.reopenReason).toBe(reason);
      expect(ticketHistoryEntry.resolutionNote).toBeNull();
      expect(Object.values(ticket)).not.toContain(reason);
    }
  });

  it("cuts the ends and reduces each block of whitespace in the reason", () => {
    const { ticketHistoryEntry } = transition(
      ticketIn("resolved", "Fatura reenviada"),
      "open",
      { reopenReason: "  voltou   a\n\nfalhar \t" },
    );

    expect(ticketHistoryEntry.reopenReason).toBe("voltou a falhar");
  });

  it.each(["Fatura reenviada", "", "😀"])(
    "refuses a note %j outside the resolution",
    (resolutionNote) => {
      expect(() =>
        transition(ticketIn("open", null), "in_progress", { resolutionNote }),
      ).toThrow(UnexpectedResolutionNoteError);
    },
  );

  it.each(["Voltou", "", "😀"])(
    "refuses a reason %j outside the reopening",
    (reopenReason) => {
      expect(() =>
        transition(ticketIn("open", null), "in_progress", { reopenReason }),
      ).toThrow(UnexpectedReopenReasonError);
    },
  );

  it("refuses a reason when resolving and a note when reopening", () => {
    expect(() =>
      transition(ticketIn("in_progress", null), "resolved", {
        resolutionNote: "Fatura reenviada",
        reopenReason: "Voltou",
      }),
    ).toThrow(UnexpectedReopenReasonError);
    expect(() =>
      transition(ticketIn("resolved", "Fatura reenviada"), "open", {
        resolutionNote: "Fatura reenviada",
        reopenReason: "Voltou",
      }),
    ).toThrow(UnexpectedResolutionNoteError);
  });

  it("moves to in_progress with no note and no reason, and records none", () => {
    const { ticket, ticketHistoryEntry } = transition(
      ticketIn("open", null),
      "in_progress",
    );

    expect(ticket.resolutionNote).toBeNull();
    expect(ticketHistoryEntry.resolutionNote).toBeNull();
    expect(ticketHistoryEntry.reopenReason).toBeNull();
  });

  it("fails first on the instant, then on the pair, then on the unexpected text, then on the missing text, then on the invalid text", () => {
    const invalid = new Date(Number.NaN);

    expect(() =>
      transition(ticketIn("open", null), "resolved", {}, invalid),
    ).toThrow(InvalidInstantError);
    expect(() =>
      transition(ticketIn("open", null), "resolved", {
        resolutionNote: "😀",
      }),
    ).toThrow(InvalidTransitionError);
    expect(() =>
      transition(ticketIn("in_progress", null), "resolved", {
        reopenReason: "Voltou",
      }),
    ).toThrow(UnexpectedReopenReasonError);
    expect(() =>
      transition(ticketIn("in_progress", null), "resolved", {
        resolutionNote: "😀",
        reopenReason: "Voltou",
      }),
    ).toThrow(UnexpectedReopenReasonError);
    expect(() =>
      transition(ticketIn("in_progress", null), "resolved", {}, invalid),
    ).toThrow(InvalidInstantError);
  });

  it("throws a DomainError", () => {
    expect(() => transition(ticketIn("open", null), "resolved")).toThrow(
      DomainError,
    );
  });

  it("does not change the received ticket, even frozen", () => {
    const input = Object.freeze(ticketIn("in_progress", null));
    const before = JSON.stringify(input);

    transition(input, "resolved", { resolutionNote: "Fatura reenviada" });

    expect(JSON.stringify(input)).toBe(before);
  });

  it("keeps the entry when the received instant changes afterwards", () => {
    const received = new Date(AT.getTime());
    const { ticketHistoryEntry } = transition(
      ticketIn("open", null),
      "in_progress",
      {},
      received,
    );

    received.setUTCFullYear(2000);

    expect(ticketHistoryEntry.at).toEqual(AT);
  });

  it("keeps createdAt and does not share its Date object with the received ticket", () => {
    const input = ticketIn("open", null);
    const { ticket } = transition(input, "in_progress");

    expect(ticket.createdAt).toEqual(CREATED_AT);
    expect(ticket.createdAt).not.toBe(input.createdAt);
  });

  it("keeps the customer name, description, channel and priority", () => {
    const { ticket } = transition(ticketIn("open", null), "in_progress");

    expect(ticket).toMatchObject({
      customerName: "Maria Souza",
      description: "Não consigo acessar a fatura",
      channel: "email",
      priority: "medium",
    });
  });
});
