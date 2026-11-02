import { fileURLToPath } from "node:url";

import { migrate } from "../src/infrastructure/migrations.ts";

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));
const REQUIRED_VARIABLES = [
  "PGHOST",
  "PGPORT",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
] as const;

function readVariable(name: (typeof REQUIRED_VARIABLES)[number]): string {
  return process.env[name] ?? "";
}

const missing = REQUIRED_VARIABLES.filter((name) => readVariable(name) === "");

if (missing.length > 0) {
  console.error(`missing ${missing.join(", ")}`);

  process.exit(1);
}

const databaseUrl = new URL("postgres://");

databaseUrl.hostname = readVariable("PGHOST");
databaseUrl.port = readVariable("PGPORT");
databaseUrl.username = readVariable("PGUSER");
databaseUrl.password = readVariable("PGPASSWORD");
databaseUrl.pathname = readVariable("PGDATABASE");

try {
  await migrate(databaseUrl.toString(), MIGRATIONS_DIR, "up");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
}
