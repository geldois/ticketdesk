import {
  CUSTOMER_NAME,
  DESCRIPTION,
  normalizeInvariantField,
  normalizeTicketChannel,
  normalizeTicketPriority,
  REOPEN_REASON,
  RESOLUTION_NOTE,
  validateInstant,
  validateTransition,
} from "./invariants.ts";
import type {
  Ticket,
  TicketChange,
  TicketHistoryEntry,
  TicketStatus,
} from "./ticket.ts";

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
  const atCopy = new Date(at);

  validateInstant(atCopy);

  const resolutionNote = null;

  const ticketHistoryEntry: TicketHistoryEntry = {
    from: null,
    to: "open",
    resolutionNote,
    reopenReason: null,
    at: atCopy,
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
    createdAt: atCopy,
  };

  return { ticketHistoryEntry, ticket };
}

export function transitionTicketChange(
  ticket: Ticket,
  {
    to,
    resolutionNote,
    reopenReason,
  }: {
    to: TicketStatus;
    resolutionNote: string | null;
    reopenReason: string | null;
  },
  at: Date,
): TicketChange {
  const atCopy = new Date(at);

  validateInstant(atCopy);
  validateTransition(ticket.status, to, resolutionNote, reopenReason);

  const normalizedResolutionNote =
    resolutionNote !== null
      ? normalizeInvariantField(resolutionNote, RESOLUTION_NOTE)
      : null;
  const normalizedReopenReason =
    reopenReason !== null
      ? normalizeInvariantField(reopenReason, REOPEN_REASON)
      : null;

  const ticketHistoryEntry: TicketHistoryEntry = {
    from: ticket.status,
    to,
    resolutionNote: normalizedResolutionNote,
    reopenReason: normalizedReopenReason,
    at: atCopy,
  };

  const newTicket: Ticket = {
    customerName: ticket.customerName,
    description: ticket.description,
    channel: ticket.channel,
    priority: ticket.priority,
    status: to,
    resolutionNote: normalizedResolutionNote,
    createdAt: new Date(ticket.createdAt),
  };

  return { ticketHistoryEntry, ticket: newTicket };
}
