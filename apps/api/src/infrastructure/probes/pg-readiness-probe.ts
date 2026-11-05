import type { Pool } from "pg";
import type { ReadinessProbe } from "../../application/contracts/probes/readiness-probe.ts";

export const READINESS_DEADLINE_MS = 5000;

export class PgReadinessProbe implements ReadinessProbe {
  readonly #pgPool: Pool;

  constructor(pgPool: Pool) {
    this.#pgPool = pgPool;
  }

  async isReady(): Promise<boolean> {
    try {
      const result = await enforceDeadline(
        this.#pgPool.query(`SELECT 1`),
        READINESS_DEADLINE_MS,
      );

      return result.rows.length === 1;
    } catch {
      return false;
    }
  }
}

async function enforceDeadline<T>(
  work: Promise<T>,
  milliseconds: number,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("deadline exceeded"));
    }, milliseconds);
  });

  try {
    return await Promise.race([work, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
