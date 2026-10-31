import { describe, expect, it } from "vitest";

import {
  DomainError,
  InvalidCustomerNameError,
  InvalidDescriptionError,
  InvalidInstantError,
  InvalidTicketChannelError,
  InvalidTicketPriorityError,
} from "./errors.ts";
import { createTicketChange } from "./lifecycle.ts";

const AT = new Date("2026-03-01T12:00:00.000Z");

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
