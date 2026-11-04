import type { UUID } from "node:crypto";
import type { Ticket, TicketChannel, TicketStatus } from "../domain/ticket.ts";

export interface StoredTicket {
  readonly ref: StoredTicketRef;
  readonly ticket: Ticket;
}

export interface StoredTicketRef {
  readonly id: UUID;
  readonly version: number;
}

export interface TicketPosition {
  createdAt: string;
  id: UUID;
}

export interface ListTicketsQuery {
  status: TicketStatus | null;
  channel: TicketChannel | null;
  afterPosition: TicketPosition | null;
  limit: number;
}

export interface ListedTicket extends StoredTicket {
  position: TicketPosition;
}
