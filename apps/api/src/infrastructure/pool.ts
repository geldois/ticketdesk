import { Pool } from "pg";

export function createPgPool(databaseUrl?: string): Pool {
  return new Pool(
    databaseUrl === undefined ? {} : { connectionString: databaseUrl },
  );
}
