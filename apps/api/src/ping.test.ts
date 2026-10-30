import { describe, expect, it } from "vitest";

import { handlePing } from "./ping.ts";

describe("handlePing", () => {
  it("returns the pong that the contract package exposes", () => {
    expect(handlePing()).toBe("pong");
  });
});
