import type { UUID } from "node:crypto";
import type {
  TicketChange,
  TicketHistoryEntry,
} from "../../../domain/ticket.ts";
import type {
  StoredTicket,
  StoredTicketRef,
} from "../wrappers/stored-ticket.ts";

export interface TicketRepository {
  findTicketById(ticketId: UUID): Promise<StoredTicket | null>;
  insertTicketChange(ticketChange: TicketChange): Promise<StoredTicketRef>;
  listTicketHistoryEntries(ticketId: UUID): Promise<TicketHistoryEntry[]>;
}
