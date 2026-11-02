import { fileURLToPath } from "node:url";

import { Settings } from "../src/config/settings.ts";
import { migrate } from "../src/infrastructure/migrations.ts";

const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));

try {
  await migrate(Settings.fromEnv().databaseUrl, MIGRATIONS_DIR, "up");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);

  process.exit(1);
}
