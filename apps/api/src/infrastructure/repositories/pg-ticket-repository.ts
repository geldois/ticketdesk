import type { UUID } from "node:crypto";
import type { TicketRepository } from "../../application/contracts/repositories/ticket-repository.ts";
import type {
  StoredTicket,
  StoredTicketRef,
} from "../../application/contracts/wrappers/stored-ticket.ts";
import type {
  Ticket,
  TicketChange,
  TicketChannel,
  TicketHistoryEntry,
  TicketPriority,
  TicketStatus,
} from "../../domain/ticket.ts";
import type { Pool } from "pg";

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

interface TicketHistoryEntryRow {
  readonly from_status: TicketStatus | null;
  readonly to_status: TicketStatus;
  readonly resolution_note: string | null;
  readonly reopen_reason: string | null;
  readonly at: Date;
}

export class PgTicketRepository implements TicketRepository {
  readonly #pool: Pool;

  constructor(pool: Pool) {
    this.#pool = pool;
  }

  async findTicketById(ticketId: UUID): Promise<StoredTicket | null> {
    const result = await this.#pool.query<TicketRow>(
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
    const client = await this.#pool.connect();

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

      await client.query(
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

  async listTicketHistoryEntries(
    ticketId: UUID,
  ): Promise<TicketHistoryEntry[]> {
    const result = await this.#pool.query<TicketHistoryEntryRow>(
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
}
