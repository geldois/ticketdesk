import type { UUID } from "node:crypto";
import type { TicketRepository } from "../contracts/repositories/ticket-repository.ts";
import type { StoredTicket } from "../contracts/wrappers/stored-ticket.ts";
import { TicketNotFoundError } from "../errors.ts";

export class GetTicketUseCase {
  readonly #ticketRepository: TicketRepository;

  constructor(ticketRepository: TicketRepository) {
    this.#ticketRepository = ticketRepository;
  }

  async execute(ticketId: UUID): Promise<StoredTicket> {
    const storedTicket = await this.#ticketRepository.findTicketById(ticketId);

    if (storedTicket === null) {
      throw new TicketNotFoundError();
    }

    return storedTicket;
  }
}
