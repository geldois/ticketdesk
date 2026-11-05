import type { UUID } from "node:crypto";
import type { TicketHistoryEntry } from "../../domain/ticket.ts";
import { UoWUseCase } from "../contracts/use-case.ts";
import { TicketNotFoundError } from "../errors.ts";

export class ListTicketHistoryEntriesUseCase extends UoWUseCase {
  async execute(ticketId: UUID): Promise<TicketHistoryEntry[]> {
    await using uow = await this.uowFactory();

    const storedTicket = await uow.ticketRepository.findTicketById(ticketId);

    if (storedTicket === null) {
      throw new TicketNotFoundError();
    }

    const ticketHistoryEntries =
      await uow.ticketRepository.listTicketHistoryEntries(ticketId);

    return ticketHistoryEntries;
  }
}
