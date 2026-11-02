export type TicketChannel = "chat" | "email" | "phone";
export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "resolved";

export interface CreateTicketRequest {
  readonly customerName: string;
  readonly description: string;
  readonly channel: TicketChannel;
  readonly priority: TicketPriority;
}

export interface TicketResponse {
  readonly id: string;
  readonly customerName: string;
  readonly description: string;
  readonly channel: TicketChannel;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  readonly resolutionNote: string | null;
  readonly version: number;
  readonly createdAt: string;
}

export interface TicketHistoryEntryResponse {
  readonly from: TicketStatus | null;
  readonly to: TicketStatus;
  readonly resolutionNote: string | null;
  readonly reopenReason: string | null;
  readonly at: string;
}
