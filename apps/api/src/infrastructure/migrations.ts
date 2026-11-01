import { runner } from "node-pg-migrate";

export async function migrate(
  databaseUrl: string,
  migrationsDir: string,
  direction: "up" | "down",
): Promise<void> {
  await runner({
    databaseUrl,
    dir: migrationsDir,
    direction,
    count: Infinity,
    migrationsTable: "pgmigrations",
    log: () => undefined,
  });
}
