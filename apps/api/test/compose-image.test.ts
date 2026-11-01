import { readFileSync } from "node:fs";

import { describe, expect, it, inject } from "vitest";

import { parseDatabaseImage, readDatabaseImage } from "./compose-image.ts";

describe("readDatabaseImage", () => {
  it("uses the image declared in compose.yaml", () => {
    const compose = readFileSync(
      new URL("../../../compose.yaml", import.meta.url),
      "utf8",
    );
    const declared = /image:\s*(\S+)/.exec(compose)?.[1];

    expect(declared).toBeDefined();
    expect(readDatabaseImage()).toBe(declared);
    expect(inject("databaseImage")).toBe(declared);
  });
});

describe("parseDatabaseImage", () => {
  it("returns the image of the first service that declares one", () => {
    expect(
      parseDatabaseImage("services:\n  db:\n    image: postgres:1.2\n"),
    ).toBe("postgres:1.2");
  });

  it("refuses a compose file that declares no image", () => {
    expect(() => parseDatabaseImage("services:\n  db: {}\n")).toThrow(
      "compose.yaml declares no image",
    );
  });
});
