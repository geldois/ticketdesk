import { describe, expect, it } from "vitest";

import type { TicketPosition } from "../../application/stored-ticket.ts";
import { InvalidCursorError } from "../errors.ts";
import { decodeCursor, encodeCursor } from "./cursor.ts";

const POSITION: TicketPosition = {
  createdAt: "2026-03-01T10:00:00.123456Z",
  id: "019a0000-0000-7000-8000-000000000001",
};

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

describe("cursor", () => {
  it("decodes the position that was encoded, microseconds included", () => {
    expect(decodeCursor(encodeCursor(POSITION))).toEqual(POSITION);
  });

  it.each([
    "2026-03-01T10:00:00Z",
    "2026-03-01T10:00:00.5Z",
    "2026-03-01T10:00:00.123456+02:00",
    "2026-03-01T10:00:00-03:30",
  ])("accepts the createdAt %s", (createdAt) => {
    const position = { ...POSITION, createdAt };

    expect(decodeCursor(encodeCursor(position))).toEqual(position);
  });

  it.each([
    ["an empty text", ""],
    ["text that is not base64url", "%%%"],
    ["base64url padded with =", `${encodeCursor(POSITION)}=`],
    ["base64url of text that is not JSON", encodeJson("nope").slice(0, -2)],
    ["JSON that is not an object", encodeJson([1])],
    ["JSON null", encodeJson(null)],
    ["an object without createdAt", encodeJson({ id: POSITION.id })],
    ["an object without id", encodeJson({ createdAt: POSITION.createdAt })],
    ["an object with an extra key", encodeJson({ ...POSITION, extra: 1 })],
    ["an id that is not a UUID", encodeJson({ ...POSITION, id: "abc" })],
    [
      "a createdAt that is not a date",
      encodeJson({ ...POSITION, createdAt: "ontem" }),
    ],
    [
      "a createdAt with an impossible date",
      encodeJson({ ...POSITION, createdAt: "2026-13-45T00:00:00Z" }),
    ],
    [
      "a createdAt without offset",
      encodeJson({ ...POSITION, createdAt: "2026-03-01T10:00:00" }),
    ],
    [
      "a createdAt with more than six fraction digits",
      encodeJson({ ...POSITION, createdAt: "2026-03-01T10:00:00.1234567Z" }),
    ],
  ])("throws InvalidCursorError for %s", (_name, cursor) => {
    expect(() => decodeCursor(cursor)).toThrow(InvalidCursorError);
  });
});
