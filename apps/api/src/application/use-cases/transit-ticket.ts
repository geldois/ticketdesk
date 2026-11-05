import type { UUID } from "node:crypto";
import type { UoW } from "../contracts/uow.ts";
import { UoWUseCase } from "../contracts/use-case.ts";
import type { StoredTicket } from "../stored-ticket.ts";
import { TicketNotFoundError, VersionConflictError } from "../errors.ts";
import { normalizeTicketStatus } from "../../domain/invariants.ts";
import { transitTicketChange } from "../../domain/lifecycle.ts";

export interface TransitTicketInput {
  readonly to: string;
  readonly resolutionNote: string | null;
  readonly reopenReason: string | null;
}

export class TransitTicketUseCase extends UoWUseCase {
  async #getStoredTicket(uow: UoW, ticketId: UUID): Promise<StoredTicket> {
    const storedTicket = await uow.ticketRepository.findTicketById(ticketId);

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
    await using uow = await this.uowFactory();

    const storedTicket = await this.#getStoredTicket(uow, ticketId);

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
      await uow.ticketRepository.updateTicketChange(
        ticketId,
        expectedVersion,
        ticketChange,
      );

    if (updatedStoredTicketRef === null) {
      const currentStoredTicket = await this.#getStoredTicket(uow, ticketId);

      throw new VersionConflictError(currentStoredTicket);
    }

    await uow.commit();

    const updatedStoredTicket: StoredTicket = {
      ref: updatedStoredTicketRef,
      ticket: ticketChange.ticket,
    };

    return updatedStoredTicket;
  }
}
