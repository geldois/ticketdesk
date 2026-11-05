import { Pool } from "pg";

export const CONNECTION_TIMEOUT_MS = 5000;
export const QUERY_TIMEOUT_MS = 10000;

export function createPgPool(databaseUrl?: string): Pool {
  return new Pool({
    ...(databaseUrl === undefined ? {} : { connectionString: databaseUrl }),
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
  });
}
