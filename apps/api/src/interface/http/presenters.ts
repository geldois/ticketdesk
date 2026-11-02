import type {
  TicketHistoryEntryResponse,
  TicketResponse,
} from "@ticketdesk/contract";
import type { StoredTicket } from "../../application/stored-ticket.ts";
import type { TicketHistoryEntry } from "../../domain/ticket.ts";

export function presentTicket(storedTicket: StoredTicket): TicketResponse {
  const { ref, ticket } = storedTicket;

  return {
    id: ref.id,
    customerName: ticket.customerName,
    description: ticket.description,
    channel: ticket.channel,
    priority: ticket.priority,
    status: ticket.status,
    resolutionNote: ticket.resolutionNote,
    version: ref.version,
    createdAt: ticket.createdAt.toISOString(),
  };
}

export function presentTicketHistoryEntry(
  entry: TicketHistoryEntry,
): TicketHistoryEntryResponse {
  return {
    from: entry.from,
    to: entry.to,
    resolutionNote: entry.resolutionNote,
    reopenReason: entry.reopenReason,
    at: entry.at.toISOString(),
  };
}
