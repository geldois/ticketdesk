import type { TicketRepository } from "../application/contracts/repositories/ticket-repository.ts";
import type { CreateTicketUseCase } from "../application/use-cases/create-ticket.ts";
import type { GetTicketUseCase } from "../application/use-cases/get-ticket.ts";
import type { ListTicketHistoryEntriesUseCase } from "../application/use-cases/list-ticket-history-entries.ts";

export interface Container {
  readonly now: () => Date;
  readonly repositories: Repositories;
  readonly useCases: UseCases;
}

export interface Repositories {
  readonly ticketRepository: TicketRepository;
}

export interface UseCases {
  readonly createTicketUseCase: CreateTicketUseCase;
  readonly getTicketUseCase: GetTicketUseCase;
  readonly listTicketHistoryEntriesUseCase: ListTicketHistoryEntriesUseCase;
}
