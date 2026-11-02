import type { UUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Container } from "../../../config/container.ts";
import { InvalidRequestError, InvalidTicketIdError } from "../../errors.ts";
import { presentTicket, presentTicketHistoryEntry } from "../presenters.ts";
import { CREATE_TICKET_SCHEMA, TICKET_ID_SCHEMA } from "../schemas.ts";

export function registerTicketRouter(
  server: FastifyInstance,
  container: Container,
): void {
  const {
    createTicketUseCase,
    getTicketUseCase,
    listTicketHistoryEntriesUseCase,
  } = container.useCases;

  server.post("/tickets", async (request, response) => {
    const body = CREATE_TICKET_SCHEMA.safeParse(request.body);

    if (!body.success) {
      throw new InvalidRequestError();
    }

    const storedTicket = await createTicketUseCase.execute(
      body.data,
      container.now(),
    );

    return response
      .code(201)
      .header("Location", `/tickets/${storedTicket.ref.id}`)
      .send(presentTicket(storedTicket));
  });

  server.get("/tickets/:id", async (request) => {
    const storedTicket = await getTicketUseCase.execute(
      parseTicketId(request.params),
    );

    return presentTicket(storedTicket);
  });

  server.get("/tickets/:id/history", async (request) => {
    const entries = await listTicketHistoryEntriesUseCase.execute(
      parseTicketId(request.params),
    );

    return entries.map(presentTicketHistoryEntry);
  });
}

function parseTicketId(params: unknown): UUID {
  const parsed = TICKET_ID_SCHEMA.safeParse(params);

  if (!parsed.success) {
    throw new InvalidTicketIdError();
  }

  return parsed.data.id;
}
