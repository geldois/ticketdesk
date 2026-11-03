import type { UUID } from "node:crypto";
import type { TicketRepository } from "../contracts/repositories/ticket-repository.ts";
import type { StoredTicket } from "../stored-ticket.ts";
import { TicketNotFoundError, VersionConflictError } from "../errors.ts";
import { normalizeTicketStatus } from "../../domain/invariants.ts";
import { transitTicketChange } from "../../domain/lifecycle.ts";

export interface TransitTicketInput {
  readonly to: string;
  readonly resolutionNote: string | null;
  readonly reopenReason: string | null;
}

export class TransitTicketUseCase {
  readonly #ticketRepository: TicketRepository;

  constructor(ticketRepository: TicketRepository) {
    this.#ticketRepository = ticketRepository;
  }

  async #getStoredTicket(ticketId: UUID): Promise<StoredTicket> {
    const storedTicket = await this.#ticketRepository.findTicketById(ticketId);

    if (storedTicket === null) {
      throw new TicketNotFoundError();
    }

    return storedTicket;
  }
  async execute(
    ticketId: UUID,
    expectedVersion: number,
    input: TransitTicketInput,
    now: Date,
  ): Promise<StoredTicket> {
    const storedTicket = await this.#getStoredTicket(ticketId);

    if (storedTicket.ref.version !== expectedVersion) {
      throw new VersionConflictError(storedTicket);
    }

    const ticketChange = transitTicketChange(
      storedTicket.ticket,
      {
        to: normalizeTicketStatus(input.to),
        resolutionNote: input.resolutionNote,
        reopenReason: input.reopenReason,
      },
      now,
    );

    const updatedStoredTicketRef =
      await this.#ticketRepository.updateTicketChange(
        ticketId,
        expectedVersion,
        ticketChange,
      );

    if (updatedStoredTicketRef === null) {
      const currentStoredTicket = await this.#getStoredTicket(ticketId);

      throw new VersionConflictError(currentStoredTicket);
    }

    const updatedStoredTicket: StoredTicket = {
      ref: updatedStoredTicketRef,
      ticket: ticketChange.ticket,
    };

    return updatedStoredTicket;
  }
}
