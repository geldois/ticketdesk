import type { UUID } from "node:crypto";
import type { StoredTicket } from "../stored-ticket.ts";
import { TicketNotFoundError } from "../errors.ts";
import { UoWUseCase } from "../contracts/use-case.ts";

export class GetTicketUseCase extends UoWUseCase {
  async execute(ticketId: UUID): Promise<StoredTicket> {
    await using uow = await this.uowFactory();

    const storedTicket = await uow.ticketRepository.findTicketById(ticketId);

    if (storedTicket === null) {
      throw new TicketNotFoundError();
    }

    return storedTicket;
  }
}
