import type { UUID } from "node:crypto";
import type { Ticket } from "../../../domain/ticket.ts";

export interface StoredTicket {
  readonly ref: StoredTicketRef;
  readonly ticket: Ticket;
}

export interface StoredTicketRef {
  readonly id: UUID;
  readonly version: number;
}
