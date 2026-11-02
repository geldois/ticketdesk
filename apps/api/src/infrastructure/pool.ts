import { Pool } from "pg";

export function createPool(databaseUrl?: string): Pool {
  return new Pool(
    databaseUrl === undefined ? {} : { connectionString: databaseUrl },
  );
}
