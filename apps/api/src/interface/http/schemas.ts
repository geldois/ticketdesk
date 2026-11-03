import type { UUID } from "node:crypto";
import { z } from "zod";

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

export const TICKET_ID_SCHEMA = z.strictObject({
  id: z.custom<UUID>((id) => z.uuid().safeParse(id).success),
});
