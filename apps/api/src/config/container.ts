import type { Pool } from "pg";
import { CheckReadinessUseCase } from "../application/use-cases/check-readiness.ts";
import { CreateTicketUseCase } from "../application/use-cases/create-ticket.ts";
import { GetTicketUseCase } from "../application/use-cases/get-ticket.ts";
import { ListTicketHistoryEntriesUseCase } from "../application/use-cases/list-ticket-history-entries.ts";
import { ListTicketsUseCase } from "../application/use-cases/list-tickets.ts";
import { TransitTicketUseCase } from "../application/use-cases/transit-ticket.ts";
import { PgReadinessProbe } from "../infrastructure/probes/pg-readiness-probe.ts";
import type { UoW } from "../application/contracts/uow.ts";
import { PgUoW } from "../infrastructure/pg-uow.ts";

export interface Container {
  readonly now: () => Date;
  readonly pgPool: Pool;
  readonly uowFactory: () => Promise<UoW>;
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

export function buildContainer({
  now,
  pgPool,
}: {
  now: () => Date;
  pgPool: Pool;
}): Container {
  const uowFactory = async (): Promise<PgUoW> => await PgUoW.begin(pgPool);

  const checkReadinessUseCase = new CheckReadinessUseCase(
    new PgReadinessProbe(pgPool),
  );
  const createTicketUseCase = new CreateTicketUseCase(uowFactory);
  const getTicketUseCase = new GetTicketUseCase(uowFactory);
  const listTicketHistoryEntriesUseCase = new ListTicketHistoryEntriesUseCase(
    uowFactory,
  );
  const listTicketsUseCase = new ListTicketsUseCase(uowFactory);
  const transitTicketUseCase = new TransitTicketUseCase(uowFactory);

  const useCases: UseCases = {
    checkReadinessUseCase,
    createTicketUseCase,
    getTicketUseCase,
    listTicketHistoryEntriesUseCase,
    listTicketsUseCase,
    transitTicketUseCase,
  };

  const container: Container = {
    now,
    pgPool,
    uowFactory,
    useCases,
  };

  return container;
}
