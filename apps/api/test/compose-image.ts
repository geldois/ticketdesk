import { readFileSync } from "node:fs";

export function parseDatabaseImage(composeText: string): string {
  const match = /^\s*image:\s*(\S+)\s*$/m.exec(composeText);
  if (match?.[1] === undefined) {
    throw new Error("compose.yaml declares no image");
  }
  return match[1];
}

export function readDatabaseImage(): string {
  return parseDatabaseImage(
    readFileSync(new URL("../../../compose.yaml", import.meta.url), "utf8"),
  );
}
