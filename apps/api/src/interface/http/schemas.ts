import type { UUID } from "node:crypto";
import { z } from "zod";
import {
  MAX_LIMIT,
  MIN_LIMIT,
} from "../../application/use-cases/list-tickets.ts";
import { TICKET_CHANNELS, TICKET_STATUSES } from "../../domain/ticket.ts";

export const CREATE_TICKET_SCHEMA = z.strictObject({
  customerName: z.string(),
  description: z.string(),
  channel: z.string(),
  priority: z.string(),
});

export const TRANSIT_TICKET_SCHEMA = z.strictObject({
  to: z.string(),
  resolutionNote: z.string().nullable(),
  reopenReason: z.string().nullable(),
});

export const DEFAULT_LIMIT = 20;

// O cursor passa aqui sem checagem de conteúdo: a forma dos filtros e do limit vem antes dele, e o cursor vazio ou
// repetido é do invalid_cursor, não do invalid_request.
export const LIST_TICKETS_QUERY_SCHEMA = z.strictObject({
  status: z.enum(TICKET_STATUSES).optional(),
  channel: z.enum(TICKET_CHANNELS).optional(),
  limit: z
    .string()
    .regex(/^[1-9]\d*$/)
    .transform(Number)
    .pipe(z.number().min(MIN_LIMIT).max(MAX_LIMIT))
    .default(DEFAULT_LIMIT),
  cursor: z.union([z.string(), z.array(z.string())]).optional(),
});

export const CURSOR_SCHEMA = z.strictObject({
  createdAt: z.iso
    .datetime({ offset: true })
    .refine((createdAt) => !/\.\d{7,}/.test(createdAt)),
  id: z.custom<UUID>((id) => z.uuid().safeParse(id).success),
});

export const TICKET_ID_SCHEMA = z.strictObject({
  id: z.custom<UUID>((id) => z.uuid().safeParse(id).success),
});
