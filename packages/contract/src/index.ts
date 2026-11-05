import { z } from "zod";

export const TICKET_CHANNEL_SCHEMA = z.enum(["chat", "email", "phone"]);
export const TICKET_PRIORITY_SCHEMA = z.enum(["low", "medium", "high"]);
export const TICKET_STATUS_SCHEMA = z.enum(["open", "in_progress", "resolved"]);

export type TicketChannel = z.infer<typeof TICKET_CHANNEL_SCHEMA>;
export type TicketPriority = z.infer<typeof TICKET_PRIORITY_SCHEMA>;
export type TicketStatus = z.infer<typeof TICKET_STATUS_SCHEMA>;

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

export interface ListTicketsRequest {
  readonly status?: TicketStatus;
  readonly channel?: TicketChannel;
  readonly limit?: number;
  readonly cursor?: string;
}

export const TICKET_RESPONSE_SCHEMA = z
  .object({
    id: z.string(),
    customerName: z.string(),
    description: z.string(),
    channel: TICKET_CHANNEL_SCHEMA,
    priority: TICKET_PRIORITY_SCHEMA,
    status: TICKET_STATUS_SCHEMA,
    resolutionNote: z.string().nullable(),
    version: z.number().int(),
    createdAt: z.iso.datetime(),
  })
  .readonly();

export type TicketResponse = z.infer<typeof TICKET_RESPONSE_SCHEMA>;

export const LIST_TICKETS_RESPONSE_SCHEMA = z
  .array(TICKET_RESPONSE_SCHEMA)
  .readonly();

export type ListTicketsResponse = z.infer<typeof LIST_TICKETS_RESPONSE_SCHEMA>;

export const TICKET_HISTORY_ENTRY_RESPONSE_SCHEMA = z
  .object({
    from: TICKET_STATUS_SCHEMA.nullable(),
    to: TICKET_STATUS_SCHEMA,
    resolutionNote: z.string().nullable(),
    reopenReason: z.string().nullable(),
    at: z.iso.datetime(),
  })
  .readonly();

export type TicketHistoryEntryResponse = z.infer<
  typeof TICKET_HISTORY_ENTRY_RESPONSE_SCHEMA
>;

export const LIST_TICKET_HISTORY_ENTRIES_RESPONSE_SCHEMA = z
  .array(TICKET_HISTORY_ENTRY_RESPONSE_SCHEMA)
  .readonly();

export type ListTicketHistoryEntriesResponse = z.infer<
  typeof LIST_TICKET_HISTORY_ENTRIES_RESPONSE_SCHEMA
>;

export const VERSION_CONFLICT_RESPONSE_SCHEMA = z
  .object({
    type: z.string(),
    title: z.string(),
    status: z.literal(409),
    code: z.literal("version_conflict"),
    detail: z.string(),
    ticket: TICKET_RESPONSE_SCHEMA,
  })
  .readonly();

export type VersionConflictResponse = z.infer<
  typeof VERSION_CONFLICT_RESPONSE_SCHEMA
>;
