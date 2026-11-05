import {
  TICKET_CHANNEL_SCHEMA,
  TICKET_PRIORITY_SCHEMA,
  TICKET_STATUS_SCHEMA,
} from "@ticketdesk/contract";
import { describe, expect, it } from "vitest";

import {
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "../src/domain/ticket.ts";
import { presentTicket } from "../src/interface/http/presenters.ts";

describe("the contract against the domain", () => {
  it.each([
    ["status", TICKET_STATUS_SCHEMA.options, TICKET_STATUSES],
    ["channel", TICKET_CHANNEL_SCHEMA.options, TICKET_CHANNELS],
    ["priority", TICKET_PRIORITY_SCHEMA.options, TICKET_PRIORITIES],
  ])("accepts as %s exactly the values of the domain", (_, schema, domain) => {
    expect([...schema].sort()).toEqual([...domain].sort());
  });

  it("types the response of the api by the contract, so a ticket without a status does not compile", () => {
    // @ts-expect-error a ticket response needs a status
    const response: ReturnType<typeof presentTicket> = { id: "ticket" };

    expect(response.id).toBe("ticket");
  });
});
