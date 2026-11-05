import type { Pool } from "pg";
import type { Storage } from "../application/contracts/storage.ts";
import { PgUoW } from "./pg-uow.ts";
import { createPgPool } from "./pool.ts";
import { PgReadinessProbe } from "./probes/pg-readiness-probe.ts";

export class PgStorage implements Storage {
  readonly #pgPool: Pool;
  readonly #readinessProbe: PgReadinessProbe;

  constructor(pgPool: Pool) {
    this.#pgPool = pgPool;
    this.#readinessProbe = new PgReadinessProbe(pgPool);
  }

  async openUnitOfWork(): Promise<PgUoW> {
    return await PgUoW.begin(this.#pgPool);
  }

  async isReady(): Promise<boolean> {
    return await this.#readinessProbe.isReady();
  }

  async close(): Promise<void> {
    await this.#pgPool.end();
  }
}

export function createPgStorage(databaseUrl?: string): PgStorage {
  return new PgStorage(createPgPool(databaseUrl));
}
