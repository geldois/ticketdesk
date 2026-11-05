const READINESS_DEADLINE_MS = 2000;
import type { Pool } from "pg";
import type { ReadinessProbe } from "../../application/contracts/probes/readiness-probe.ts";

export class PgReadinessProbe implements ReadinessProbe {
  readonly #pgPool: Pool;

  constructor(pgPool: Pool) {
    this.#pgPool = pgPool;
  }

  async isReady(): Promise<boolean> {
    try {
      const result = await withDeadline(
        this.#pgPool.query(`SELECT 1`),
        READINESS_DEADLINE_MS,
      );

      return result.rows.length === 1;
    } catch {
      return false;
    }
  }
}

function withDeadline<T>(work: Promise<T>, milliseconds: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("deadline exceeded"));
    }, milliseconds);
  });

  return Promise.race([work, deadline]).finally(() => {
    clearTimeout(timer);
  });
}
