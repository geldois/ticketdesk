export const CHANNELS = ["chat", "email", "phone"] as const;
export const PRIORITIES = ["low", "medium", "high"] as const;
export const STATUSES = ["open", "in_progress", "resolved"] as const;

export type Channel = (typeof CHANNELS)[number];
export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];

export interface HistoryEntry {
  readonly from: Status | null;
  readonly to: Status;
  readonly resolutionNote: string | null;
  readonly reopenReason: string | null;
  readonly at: Date;
}

export interface Ticket {
  readonly customerName: string;
  readonly description: string;
  readonly channel: Channel;
  readonly priority: Priority;
  readonly status: Status;
  readonly createdAt: Date;
  readonly resolutionNote: string | null;
}

export interface TicketChange {
  readonly historyEntry: HistoryEntry;
  readonly ticket: Ticket;
}
