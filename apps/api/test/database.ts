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

export async function createTestDatabase(): Promise<string> {
  const containerUrl = inject("containerUrl");
  const adminClient = new Client({ connectionString: containerUrl });
  const databaseName = randomUUID();

  await adminClient.connect();

  try {
    await adminClient.query(
      `CREATE DATABASE "${databaseName}" TEMPLATE "${TEMPLATE_DATABASE_NAME}"`,
    );
  } finally {
    await adminClient.end();
  }

  return buildDatabaseUrl(containerUrl, databaseName);
}

export async function queryRows(
  databaseUrl: string,
  sql: string,
): Promise<Record<string, unknown>[]> {
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    const result = await client.query<Record<string, unknown>>(sql);

    return result.rows;
  } finally {
    await client.end();
  }
}
