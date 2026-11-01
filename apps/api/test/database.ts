import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import { Client } from "pg";
import { inject } from "vitest";

declare module "vitest" {
  export interface ProvidedContext {
    containerUrl: string;
    databaseImage: string;
  }
}

export const MIGRATIONS_DIR = fileURLToPath(
  new URL("../migrations", import.meta.url),
);
export const TEMPLATE_DATABASE_NAME = "template_migrated";

export function buildDatabaseUrl(
  containerUrl: string,
  databaseName: string,
): string {
  const parsedUrl = new URL(containerUrl);

  parsedUrl.pathname = databaseName;

  return parsedUrl.toString();
}

async function createTestDatabase(
  databaseContent: "empty" | "migrated",
): Promise<string> {
  const containerUrl = inject("containerUrl");
  const adminClient = new Client({ connectionString: containerUrl });
  const databaseName = randomUUID();

  await adminClient.connect();

  const templateClause =
    databaseContent === "migrated"
      ? ` TEMPLATE "${TEMPLATE_DATABASE_NAME}"`
      : "";

  try {
    await adminClient.query(
      `CREATE DATABASE "${databaseName}"${templateClause}`,
    );
  } finally {
    await adminClient.end();
  }

  return buildDatabaseUrl(containerUrl, databaseName);
}

export async function createEmptyTestDatabase(): Promise<string> {
  return createTestDatabase("empty");
}

export async function createMigratedTestDatabase(): Promise<string> {
  return createTestDatabase("migrated");
}

export async function queryRows(
  databaseUrl: string,
  sql: string,
  params: readonly unknown[] = [],
): Promise<Record<string, unknown>[]> {
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    const result = await client.query<Record<string, unknown>>(sql, [
      ...params,
    ]);

    return result.rows;
  } finally {
    await client.end();
  }
}
