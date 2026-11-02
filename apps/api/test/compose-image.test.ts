import { readFileSync } from "node:fs";

import { describe, expect, it, inject } from "vitest";

import { parseDatabaseImage, readDatabaseImage } from "./compose-image.ts";

describe("readDatabaseImage", () => {
  it("reads the image that compose.yaml declares for the db service and hands it to the containers", () => {
    const composeText = readFileSync(
      new URL("../../../compose.yaml", import.meta.url),
      "utf8",
    );
    const image = readDatabaseImage();

    expect(composeText).toContain(`    image: ${image}\n`);
    expect(inject("databaseImage")).toBe(image);
  });
});

describe("parseDatabaseImage", () => {
  it("returns the image of the db service, whatever its position among the services", () => {
    expect(
      parseDatabaseImage(
        "services:\n  api:\n    image: node:1.0\n  db:\n    image: postgres:1.2\n",
      ),
    ).toBe("postgres:1.2");
  });

  it.each([
    ["a db service without an image", "services:\n  db: {}\n"],
    ["a service that is not named db", "services:\n  api:\n    image: x:1\n"],
    ["no services", "name: empty\n"],
    ["an empty file", ""],
  ])("refuses a compose file with %s", (_description, composeText) => {
    expect(() => parseDatabaseImage(composeText)).toThrow(
      "compose.yaml declares no image for the db service",
    );
  });
});
