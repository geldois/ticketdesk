import { createTicketChange } from "../../domain/lifecycle.ts";
import type { TicketRepository } from "../contracts/repositories/ticket-repository.ts";
import type { StoredTicket } from "../contracts/wrappers/stored-ticket.ts";

export interface CreateTicketInput {
  readonly customerName: string;
  readonly description: string;
  readonly channel: string;
  readonly priority: string;
}

export class CreateTicketUseCase {
  readonly #ticketRepository: TicketRepository;

  constructor(ticketRepository: TicketRepository) {
    this.#ticketRepository = ticketRepository;
  }

  async execute(input: CreateTicketInput, now: Date): Promise<StoredTicket> {
    const ticketChange = createTicketChange(input, now);
    const ref = await this.#ticketRepository.insertTicketChange(ticketChange);

    const storedTicket: StoredTicket = {
      ref: ref,
      ticket: ticketChange.ticket,
    };

    return storedTicket;
  }
}
