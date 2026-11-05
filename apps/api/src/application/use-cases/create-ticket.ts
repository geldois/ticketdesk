import { createTicketChange } from "../../domain/lifecycle.ts";
import { UseCase } from "../contracts/use-case.ts";
import type { StoredTicket } from "../stored-ticket.ts";

export interface CreateTicketInput {
  readonly customerName: string;
  readonly description: string;
  readonly channel: string;
  readonly priority: string;
}

export class CreateTicketUseCase extends UseCase {
  async execute(input: CreateTicketInput, now: Date): Promise<StoredTicket> {
    const ticketChange = createTicketChange(input, now);

    await using uow = await this.uowFactory();

    const ref = await uow.ticketRepository.insertTicketChange(ticketChange);

    await uow.commit();

    const storedTicket: StoredTicket = {
      ref: ref,
      ticket: ticketChange.ticket,
    };

    return storedTicket;
  }
}
