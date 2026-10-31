export const TICKET_CHANNELS = ["chat", "email", "phone"] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;

export type TicketChannel = (typeof TICKET_CHANNELS)[number];
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export interface Ticket {
  readonly customerName: string;
  readonly description: string;
  readonly channel: TicketChannel;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  readonly createdAt: Date;
  readonly resolutionNote: string | null;
}

export interface TicketChange {
  readonly ticketHistoryEntry: TicketHistoryEntry;
  readonly ticket: Ticket;
}

export interface TicketHistoryEntry {
  readonly from: TicketStatus | null;
  readonly to: TicketStatus;
  readonly resolutionNote: string | null;
  readonly reopenReason: string | null;
  readonly at: Date;
}
