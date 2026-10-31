import {
  CUSTOMER_NAME,
  DESCRIPTION,
  normalizeInvariantField,
  normalizeTicketChannel,
  normalizeTicketPriority,
  validateInstant,
} from "./invariants.ts";
import type { Ticket, TicketChange, TicketHistoryEntry } from "./ticket.ts";

export function createTicketChange(
  {
    customerName,
    description,
    channel,
    priority,
  }: {
    customerName: string;
    description: string;
    channel: string;
    priority: string;
  },
  at: Date,
): TicketChange {
  const createdAt = new Date(at);

  validateInstant(createdAt);

  const resolutionNote = null;

  const ticketHistoryEntry: TicketHistoryEntry = {
    from: null,
    to: "open",
    resolutionNote,
    reopenReason: null,
    at: createdAt,
  };

  const normalizedCustomerName = normalizeInvariantField(
    customerName,
    CUSTOMER_NAME,
  );

  const normalizedDescription = normalizeInvariantField(
    description,
    DESCRIPTION,
  );

  const normalizedChannel = normalizeTicketChannel(channel);
  const normalizedPriority = normalizeTicketPriority(priority);

  const ticket: Ticket = {
    customerName: normalizedCustomerName,
    description: normalizedDescription,
    channel: normalizedChannel,
    priority: normalizedPriority,
    status: "open",
    resolutionNote,
    createdAt: createdAt,
  };

  return { ticketHistoryEntry, ticket };
}
