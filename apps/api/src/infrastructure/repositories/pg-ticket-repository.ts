import type { UUID } from "node:crypto";
import type { TicketRepository } from "../../application/contracts/repositories/ticket-repository.ts";
import type {
  ListedTicket,
  ListTicketsQuery,
  StoredTicket,
  StoredTicketRef,
  TicketPosition,
} from "../../application/stored-ticket.ts";
import type {
  Ticket,
  TicketChange,
  TicketChannel,
  TicketHistoryEntry,
  TicketPriority,
  TicketStatus,
} from "../../domain/ticket.ts";
import type { Pool, PoolClient } from "pg";

interface InsertedTicketRow {
  id: UUID;
  version: number;
}

interface TicketRow {
  readonly id: UUID;
  readonly customer_name: string;
  readonly description: string;
  readonly channel: TicketChannel;
  readonly priority: TicketPriority;
  readonly status: TicketStatus;
  readonly created_at: Date;
  readonly resolution_note: string | null;
  readonly version: number;
}

interface ListedTicketRow extends TicketRow {
  readonly created_at_text: string;
}

interface TicketHistoryEntryRow {
  readonly from_status: TicketStatus | null;
  readonly to_status: TicketStatus;
  readonly resolution_note: string | null;
  readonly reopen_reason: string | null;
  readonly at: Date;
}

interface UpdatedTicketRow {
  readonly version: number;
}

export class PgTicketRepository implements TicketRepository {
  readonly #pgPool: Pool;

  constructor(pgPool: Pool) {
    this.#pgPool = pgPool;
  }

  async findTicketById(ticketId: UUID): Promise<StoredTicket | null> {
    const result = await this.#pgPool.query<TicketRow>(
      `SELECT id, customer_name, description, channel, priority, status, resolution_note, version, created_at FROM ticket WHERE id = $1`,
      [ticketId],
    );
    const row = result.rows[0];

    if (row === undefined) {
      return null;
    }

    const ref: StoredTicketRef = {
      id: row.id,
      version: row.version,
    };

    const ticket: Ticket = {
      customerName: row.customer_name,
      description: row.description,
      channel: row.channel,
      priority: row.priority,
      status: row.status,
      resolutionNote: row.resolution_note,
      createdAt: row.created_at,
    };

    return { ref, ticket };
  }

  async insertTicketChange(
    ticketChange: TicketChange,
  ): Promise<StoredTicketRef> {
    const client = await this.#pgPool.connect();

    try {
      await client.query(`BEGIN`);

      const ticket = ticketChange.ticket;
      const ticketHistoryEntry = ticketChange.ticketHistoryEntry;

      const result = await client.query<InsertedTicketRow>(
        `INSERT INTO ticket (customer_name, description, channel, priority, status, resolution_note, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, version`,
        [
          ticket.customerName,
          ticket.description,
          ticket.channel,
          ticket.priority,
          ticket.status,
          ticket.resolutionNote,
          ticket.createdAt,
        ],
      );
      const row = result.rows[0];

      if (row === undefined) {
        throw new Error("ticket insert returned no row");
      }

      const ticketId = row.id;
      const ticketVersion = row.version;

      await this.#insertTicketHistoryEntry(
        client,
        ticketId,
        ticketHistoryEntry,
      );

      const storedTicketRef: StoredTicketRef = {
        id: ticketId,
        version: ticketVersion,
      };

      await client.query(`COMMIT`);

      return storedTicketRef;
    } catch (error) {
      await client.query(`ROLLBACK`);

      throw error;
    } finally {
      client.release();
    }
  }

  async #insertTicketHistoryEntry(
    client: PoolClient,
    ticketId: UUID,
    ticketHistoryEntry: TicketHistoryEntry,
  ): Promise<void> {
    const result = await client.query(
      `INSERT INTO ticket_history_entry (ticket_id, from_status, to_status, resolution_note, reopen_reason, at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        ticketId,
        ticketHistoryEntry.from,
        ticketHistoryEntry.to,
        ticketHistoryEntry.resolutionNote,
        ticketHistoryEntry.reopenReason,
        ticketHistoryEntry.at,
      ],
    );

    if (result.rowCount !== 1) {
      throw new Error("ticket history entry insert wrote no row");
    }
  }

  async listTicketHistoryEntries(
    ticketId: UUID,
  ): Promise<TicketHistoryEntry[]> {
    const result = await this.#pgPool.query<TicketHistoryEntryRow>(
      `SELECT from_status, to_status, resolution_note, reopen_reason, at FROM ticket_history_entry WHERE ticket_id = $1 ORDER BY id`,
      [ticketId],
    );
    const rows = result.rows;

    const ticketHistoryEntries: TicketHistoryEntry[] = rows.map((row) => ({
      from: row.from_status,
      to: row.to_status,
      resolutionNote: row.resolution_note,
      reopenReason: row.reopen_reason,
      at: row.at,
    }));

    return ticketHistoryEntries;
  }

  async listTickets(query: ListTicketsQuery): Promise<ListedTicket[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const placeholder = (back = 0): string =>
      "$" + String(values.length - back);

    if (query.status !== null) {
      values.push(query.status);
      conditions.push(`status = ${placeholder()}`);
    }

    if (query.channel !== null) {
      values.push(query.channel);
      conditions.push(`channel = ${placeholder()}`);
    }

    if (query.afterPosition !== null) {
      values.push(query.afterPosition.createdAt, query.afterPosition.id);
      conditions.push(
        `(created_at, id) < (${placeholder(1)}, ${placeholder()})`,
      );
    }

    values.push(query.limit);

    const where =
      conditions.length === 0 ? "" : ` WHERE ${conditions.join(" AND ")}`;

    const result = await this.#pgPool.query<ListedTicketRow>(
      `SELECT id, customer_name, description, channel, priority, status, resolution_note, version, created_at, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_text FROM ticket${where} ORDER BY created_at DESC, id DESC LIMIT ${placeholder()}`,
      values,
    );

    const rows = result.rows;
    const listedTickets: ListedTicket[] = [];

    for (const row of rows) {
      const ref: StoredTicketRef = {
        id: row.id,
        version: row.version,
      };

      const ticket: Ticket = {
        customerName: row.customer_name,
        description: row.description,
        channel: row.channel,
        priority: row.priority,
        status: row.status,
        createdAt: row.created_at,
        resolutionNote: row.resolution_note,
      };

      const position: TicketPosition = {
        createdAt: row.created_at_text,
        id: row.id,
      };

      const listedTicket: ListedTicket = {
        ref,
        ticket,
        position,
      };

      listedTickets.push(listedTicket);
    }

    return listedTickets;
  }

  async updateTicketChange(
    ticketId: UUID,
    expectedVersion: number,
    ticketChange: TicketChange,
  ): Promise<StoredTicketRef | null> {
    const ticket = ticketChange.ticket;
    const ticketHistoryEntry = ticketChange.ticketHistoryEntry;

    const client = await this.#pgPool.connect();

    try {
      await client.query(`BEGIN`);

      const result = await client.query<UpdatedTicketRow>(
        `UPDATE ticket SET status = $1, resolution_note = $2, version = version + 1 WHERE (id = $3 AND status = $4 AND version = $5) RETURNING version`,
        [
          ticket.status,
          ticket.resolutionNote,
          ticketId,
          ticketHistoryEntry.from,
          expectedVersion,
        ],
      );
      const row = result.rows[0];

      if (row === undefined) {
        await client.query(`ROLLBACK`);

        return null;
      }

      await this.#insertTicketHistoryEntry(
        client,
        ticketId,
        ticketHistoryEntry,
      );

      const storedTicketRef: StoredTicketRef = {
        id: ticketId,
        version: row.version,
      };

      await client.query(`COMMIT`);

      return storedTicketRef;
    } catch (error) {
      await client.query(`ROLLBACK`);

      throw error;
    } finally {
      client.release();
    }
  }
}
