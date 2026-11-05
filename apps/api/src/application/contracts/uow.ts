import type { TicketRepository } from "./repositories/ticket-repository.ts";

export abstract class UoW implements AsyncDisposable {
  abstract readonly ticketRepository: TicketRepository;
  finished = false;

  abstract commit(): Promise<void>;
  abstract rollback(): Promise<void>;
  abstract [Symbol.asyncDispose](): Promise<void>;
}
