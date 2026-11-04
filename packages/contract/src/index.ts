export type TicketChannel = "chat" | "email" | "phone";
export type TicketPriority = "low" | "medium" | "high";
export type TicketStatus = "open" | "in_progress" | "resolved";

export interface CreateTicketRequest {
  readonly customerName: string;
  readonly description: string;
  readonly channel: TicketChannel;
  readonly priority: TicketPriority;
}

export interface TransitTicketRequest {
  readonly to: string;
  readonly resolutionNote: string | null;
  readonly reopenReason: string | null;
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

export interface VersionConflictResponse {
  readonly type: string;
  readonly title: string;
  readonly status: 409;
  readonly code: "version_conflict";
  readonly detail: string;
  readonly ticket: TicketResponse;
}

export interface ListTicketsRequest {
  readonly status?: TicketStatus;
  readonly channel?: TicketChannel;
  readonly limit?: number;
  readonly cursor?: string;
}

export type ListTicketsResponse = readonly TicketResponse[];

export interface TicketHistoryEntryResponse {
  readonly from: TicketStatus | null;
  readonly to: TicketStatus;
  readonly resolutionNote: string | null;
  readonly reopenReason: string | null;
  readonly at: string;
}
