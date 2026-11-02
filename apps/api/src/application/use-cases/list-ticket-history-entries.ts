import type { UUID } from "node:crypto";
import type { TicketHistoryEntry } from "../../domain/ticket.ts";
import type { TicketRepository } from "../contracts/repositories/ticket-repository.ts";
import { TicketNotFoundError } from "../errors.ts";

export class ListTicketHistoryEntriesUseCase {
  readonly #ticketRepository: TicketRepository;

  constructor(ticketRepository: TicketRepository) {
    this.#ticketRepository = ticketRepository;
  }

  async execute(ticketId: UUID): Promise<TicketHistoryEntry[]> {
    const storedTicket = await this.#ticketRepository.findTicketById(ticketId);

    if (storedTicket === null) {
      throw new TicketNotFoundError();
    }

    return this.#ticketRepository.listTicketHistoryEntries(ticketId);
  }
}
