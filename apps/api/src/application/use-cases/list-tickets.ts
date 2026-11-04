import type { TicketRepository } from "../contracts/repositories/ticket-repository.ts";
import { InvalidLimitError } from "../errors.ts";
import type {
  ListedTicket,
  ListTicketsQuery,
  TicketPosition,
} from "../stored-ticket.ts";

export const MIN_LIMIT = 1;
export const MAX_LIMIT = 100;

export interface TicketPage {
  readonly listedTickets: ListedTicket[];
  readonly afterPosition: TicketPosition | null;
}

export class ListTicketsUseCase {
  readonly #ticketRepository: TicketRepository;

  constructor(ticketRepository: TicketRepository) {
    this.#ticketRepository = ticketRepository;
  }

  async execute(query: ListTicketsQuery): Promise<TicketPage> {
    if (
      !Number.isInteger(query.limit) ||
      query.limit < MIN_LIMIT ||
      query.limit > MAX_LIMIT
    ) {
      throw new InvalidLimitError();
    }

    const lookaheadLimit = query.limit + 1;

    const lookaheadQuery: ListTicketsQuery = {
      status: query.status,
      channel: query.channel,
      afterPosition: query.afterPosition,
      limit: lookaheadLimit,
    };

    const fetchedTickets =
      await this.#ticketRepository.listTickets(lookaheadQuery);

    if (fetchedTickets.length < lookaheadLimit) {
      const lastPage: TicketPage = {
        listedTickets: fetchedTickets,
        afterPosition: null,
      };

      return lastPage;
    }

    const pageTickets = fetchedTickets.slice(0, query.limit);
    const lastPageTicket = pageTickets[pageTickets.length - 1];

    if (lastPageTicket === undefined) {
      throw new Error("ticket page ended up with no ticket");
    }

    const page: TicketPage = {
      listedTickets: pageTickets,
      afterPosition: lastPageTicket.position,
    };

    return page;
  }
}
