import type { Pool } from "pg";
import type { TicketRepository } from "../application/contracts/repositories/ticket-repository.ts";
import { CreateTicketUseCase } from "../application/use-cases/create-ticket.ts";
import { GetTicketUseCase } from "../application/use-cases/get-ticket.ts";
import { ListTicketHistoryEntriesUseCase } from "../application/use-cases/list-ticket-history-entries.ts";
import { PgTicketRepository } from "../infrastructure/repositories/pg-ticket-repository.ts";

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

export function buildContainer({
  now,
  pgPool,
}: {
  now: () => Date;
  pgPool: Pool;
}): Container {
  const pgTicketRepository = new PgTicketRepository(pgPool);

  const repositories: Repositories = {
    ticketRepository: pgTicketRepository,
  };

  const createTicketUseCase = new CreateTicketUseCase(pgTicketRepository);
  const getTicketUseCase = new GetTicketUseCase(pgTicketRepository);
  const listTicketHistoryEntriesUseCase = new ListTicketHistoryEntriesUseCase(
    pgTicketRepository,
  );

  const useCases: UseCases = {
    createTicketUseCase,
    getTicketUseCase,
    listTicketHistoryEntriesUseCase,
  };

  return {
    now,
    repositories,
    useCases,
  };
}
