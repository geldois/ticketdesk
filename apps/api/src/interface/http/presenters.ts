import type {
  TicketHistoryEntryResponse,
  TicketResponse,
} from "@ticketdesk/contract";
import type {
  ListTicketsQuery,
  StoredTicket,
  TicketPosition,
} from "../../application/stored-ticket.ts";
import type { TicketHistoryEntry } from "../../domain/ticket.ts";
import { encodeCursor } from "./cursor.ts";

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

export function presentETag(storedTicket: StoredTicket): string {
  return `"${storedTicket.ref.version.toString()}"`;
}

export function presentNextLink(
  {
    status,
    channel,
    limit,
  }: Pick<ListTicketsQuery, "status" | "channel" | "limit">,
  afterPosition: TicketPosition,
): string {
  const params = new URLSearchParams();

  if (status !== null) {
    params.set("status", status);
  }

  if (channel !== null) {
    params.set("channel", channel);
  }

  params.set("limit", limit.toString());
  params.set("cursor", encodeCursor(afterPosition));

  return `</tickets?${params.toString()}>; rel="next"`;
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
