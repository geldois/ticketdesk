import type { Container, UseCases } from "./application/contracts/container.ts";
import type { Storage } from "./application/contracts/storage.ts";
import type { UoW } from "./application/contracts/uow.ts";
import { CheckReadinessUseCase } from "./application/use-cases/check-readiness.ts";
import { CreateTicketUseCase } from "./application/use-cases/create-ticket.ts";
import { GetTicketUseCase } from "./application/use-cases/get-ticket.ts";
import { ListTicketHistoryEntriesUseCase } from "./application/use-cases/list-ticket-history-entries.ts";
import { ListTicketsUseCase } from "./application/use-cases/list-tickets.ts";
import { TransitTicketUseCase } from "./application/use-cases/transit-ticket.ts";

export function buildContainer({
  now,
  storage,
}: {
  now: () => Date;
  storage: Storage;
}): Container {
  const uowFactory = (): Promise<UoW> => storage.openUnitOfWork();

  const checkReadinessUseCase = new CheckReadinessUseCase(storage);
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
    useCases,
  };

  return container;
}
