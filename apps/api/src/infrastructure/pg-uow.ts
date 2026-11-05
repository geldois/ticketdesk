import type { Pool, PoolClient } from "pg";
import type { TicketRepository } from "../application/contracts/repositories/ticket-repository.ts";
import { UoW } from "../application/contracts/uow.ts";
import { PgTicketRepository } from "./repositories/pg-ticket-repository.ts";

export class PgUoW extends UoW {
  readonly ticketRepository: TicketRepository;
  readonly #client: PoolClient;

  private constructor(client: PoolClient) {
    super();

    this.#client = client;
    this.ticketRepository = new PgTicketRepository(client);
  }

  static async begin(pgPool: Pool): Promise<PgUoW> {
    const client = await pgPool.connect();

    try {
      await client.query(`BEGIN`);
    } catch (error) {
      client.release();

      throw error;
    }

    return new PgUoW(client);
  }

  override async commit(): Promise<void> {
    if (this.finished) {
      return;
    }

    this.finished = true;

    await this.#client.query(`COMMIT`);
  }

  override async rollback(): Promise<void> {
    if (this.finished) {
      return;
    }

    this.finished = true;

    await this.#client.query(`ROLLBACK`);
  }

  override async [Symbol.asyncDispose](): Promise<void> {
    try {
      await this.rollback();
    } finally {
      this.#client.release();
    }
  }
}
