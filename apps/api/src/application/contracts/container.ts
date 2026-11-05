import type { CheckReadinessUseCase } from "../use-cases/check-readiness.ts";
import type { CreateTicketUseCase } from "../use-cases/create-ticket.ts";
import type { GetTicketUseCase } from "../use-cases/get-ticket.ts";
import type { ListTicketHistoryEntriesUseCase } from "../use-cases/list-ticket-history-entries.ts";
import type { ListTicketsUseCase } from "../use-cases/list-tickets.ts";
import type { TransitTicketUseCase } from "../use-cases/transit-ticket.ts";

export interface Container {
  readonly now: () => Date;
  readonly useCases: UseCases;
}

export interface UseCases {
  readonly checkReadinessUseCase: CheckReadinessUseCase;
  readonly createTicketUseCase: CreateTicketUseCase;
  readonly getTicketUseCase: GetTicketUseCase;
  readonly listTicketHistoryEntriesUseCase: ListTicketHistoryEntriesUseCase;
  readonly listTicketsUseCase: ListTicketsUseCase;
  readonly transitTicketUseCase: TransitTicketUseCase;
}
