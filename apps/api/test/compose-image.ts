import { readFileSync } from "node:fs";

import { parse } from "yaml";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseDatabaseImage(composeText: string): string {
  const compose: unknown = parse(composeText);
  const services = isRecord(compose) ? compose["services"] : undefined;
  const database = isRecord(services) ? services["db"] : undefined;
  const image = isRecord(database) ? database["image"] : undefined;

  if (typeof image !== "string") {
    throw new Error("compose.yaml declares no image for the db service");
  }

  return image;
}

export function readDatabaseImage(): string {
  return parseDatabaseImage(
    readFileSync(new URL("../../../compose.yaml", import.meta.url), "utf8"),
  );
}
