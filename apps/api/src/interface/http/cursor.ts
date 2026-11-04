import type { TicketPosition } from "../../application/stored-ticket.ts";
import { InvalidCursorError } from "../errors.ts";
import { CURSOR_SCHEMA } from "./schemas.ts";

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

export function encodeCursor(position: TicketPosition): string {
  const json = JSON.stringify({
    createdAt: position.createdAt,
    id: position.id,
  });

  return Buffer.from(json, "utf8").toString("base64url");
}

export function decodeCursor(cursor: string): TicketPosition {
  if (!BASE64URL_PATTERN.test(cursor)) {
    throw new InvalidCursorError();
  }

  const json = Buffer.from(cursor, "base64url").toString("utf8");

  // Só o texto que o próprio encodeCursor produziria volta idêntico; o resto é recusado.
  if (Buffer.from(json, "utf8").toString("base64url") !== cursor) {
    throw new InvalidCursorError();
  }

  let value: unknown;

  try {
    value = JSON.parse(json);
  } catch {
    throw new InvalidCursorError();
  }

  const parsedCursor = CURSOR_SCHEMA.safeParse(value);

  if (!parsedCursor.success) {
    throw new InvalidCursorError();
  }

  return parsedCursor.data;
}
