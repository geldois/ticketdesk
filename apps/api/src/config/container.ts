import type { Pool } from "pg";
import type { TicketRepository } from "../application/contracts/repositories/ticket-repository.ts";
import { CheckReadinessUseCase } from "../application/use-cases/check-readiness.ts";
import { CreateTicketUseCase } from "../application/use-cases/create-ticket.ts";
import { GetTicketUseCase } from "../application/use-cases/get-ticket.ts";
import { ListTicketHistoryEntriesUseCase } from "../application/use-cases/list-ticket-history-entries.ts";
import { ListTicketsUseCase } from "../application/use-cases/list-tickets.ts";
import { TransitTicketUseCase } from "../application/use-cases/transit-ticket.ts";
import { PgReadinessProbe } from "../infrastructure/probes/pg-readiness-probe.ts";
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
  readonly checkReadinessUseCase: CheckReadinessUseCase;
  readonly createTicketUseCase: CreateTicketUseCase;
  readonly getTicketUseCase: GetTicketUseCase;
  readonly listTicketHistoryEntriesUseCase: ListTicketHistoryEntriesUseCase;
  readonly listTicketsUseCase: ListTicketsUseCase;
  readonly transitTicketUseCase: TransitTicketUseCase;
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

  const checkReadinessUseCase = new CheckReadinessUseCase(
    new PgReadinessProbe(pgPool),
  );
  const createTicketUseCase = new CreateTicketUseCase(pgTicketRepository);
  const getTicketUseCase = new GetTicketUseCase(pgTicketRepository);
  const listTicketHistoryEntriesUseCase = new ListTicketHistoryEntriesUseCase(
    pgTicketRepository,
  );
  const listTicketsUseCase = new ListTicketsUseCase(pgTicketRepository);
  const transitTicketUseCase = new TransitTicketUseCase(pgTicketRepository);

  const useCases: UseCases = {
    checkReadinessUseCase,
    createTicketUseCase,
    getTicketUseCase,
    listTicketHistoryEntriesUseCase,
    listTicketsUseCase,
    transitTicketUseCase,
  };

  return {
    now,
    repositories,
    useCases,
  };
}
