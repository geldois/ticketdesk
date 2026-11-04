import { describe, expect, it } from "vitest";

import { DEFAULT_LIMIT, LIST_TICKETS_QUERY_SCHEMA } from "./schemas.ts";

describe("LIST_TICKETS_QUERY_SCHEMA", () => {
  it("fills the default limit when the query is empty", () => {
    expect(LIST_TICKETS_QUERY_SCHEMA.parse({})).toEqual({
      limit: DEFAULT_LIMIT,
    });
  });

  it("reads the filters, the limit as a number and the cursor as it came", () => {
    const query = {
      status: "open",
      channel: "chat",
      limit: "2",
      cursor: "abc",
    };

    expect(LIST_TICKETS_QUERY_SCHEMA.parse(query)).toEqual({
      status: "open",
      channel: "chat",
      limit: 2,
      cursor: "abc",
    });
  });

  it.each(["1", "100"])("accepts the limit %s", (limit) => {
    expect(LIST_TICKETS_QUERY_SCHEMA.parse({ limit }).limit).toBe(
      Number(limit),
    );
  });

  it.each([
    "0",
    "101",
    "-1",
    "+5",
    "01",
    "1e1",
    "1.5",
    "abc",
    "",
    "99999999999999999999",
  ])("refuses the limit %j", (limit) => {
    expect(LIST_TICKETS_QUERY_SCHEMA.safeParse({ limit }).success).toBe(false);
  });

  it.each([
    { limit: ["1", "2"] },
    { status: "closed" },
    { status: "" },
    { status: ["open", "resolved"] },
    { channel: "sms" },
    { channel: "" },
    { channel: ["chat", "email"] },
    { foo: "1" },
  ])("refuses the query %j", (query) => {
    expect(LIST_TICKETS_QUERY_SCHEMA.safeParse(query).success).toBe(false);
  });

  it.each([{ cursor: "" }, { cursor: ["a", "b"] }])(
    "lets the cursor %j through, because refusing it is the work of invalid_cursor",
    (query) => {
      expect(LIST_TICKETS_QUERY_SCHEMA.safeParse(query).success).toBe(true);
    },
  );
});
