import type { UUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Container } from "../../../config/container.ts";
import {
  InvalidIfMatchError,
  InvalidRequestError,
  InvalidTicketIdError,
  MissingIfMatchError,
} from "../../errors.ts";
import {
  presentETag,
  presentTicket,
  presentTicketHistoryEntry,
} from "../presenters.ts";
import {
  CREATE_TICKET_SCHEMA,
  TICKET_ID_SCHEMA,
  TRANSIT_TICKET_SCHEMA,
} from "../schemas.ts";

const IF_MATCH_PATTERN = /^"([1-9]\d*)"$/;

export function registerTicketRouter(
  server: FastifyInstance,
  container: Container,
): void {
  const {
    createTicketUseCase,
    getTicketUseCase,
    listTicketHistoryEntriesUseCase,
    transitTicketUseCase,
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

  server.get("/tickets/:id", async (request, response) => {
    const storedTicket = await getTicketUseCase.execute(
      parseTicketId(request.params),
    );

    return response
      .header("ETag", presentETag(storedTicket))
      .send(presentTicket(storedTicket));
  });

  server.post("/tickets/:id/transitions", async (request, response) => {
    const ticketId = parseTicketId(request.params);
    const expectedVersion = parseIfMatch(request.headers["if-match"]);
    const body = TRANSIT_TICKET_SCHEMA.safeParse(request.body);

    if (!body.success) {
      throw new InvalidRequestError(
        "request body must be an object with to as text and resolutionNote and reopenReason as text or null",
      );
    }

    const storedTicket = await transitTicketUseCase.execute(
      ticketId,
      expectedVersion,
      body.data,
      container.now(),
    );

    return response
      .header("ETag", presentETag(storedTicket))
      .send(presentTicket(storedTicket));
  });

  server.get("/tickets/:id/history", async (request) => {
    const entries = await listTicketHistoryEntriesUseCase.execute(
      parseTicketId(request.params),
    );

    return entries.map(presentTicketHistoryEntry);
  });
}

function parseIfMatch(header: string | undefined): number {
  if (header === undefined) {
    throw new MissingIfMatchError();
  }

  const version = Number(IF_MATCH_PATTERN.exec(header)?.[1]);

  if (!Number.isSafeInteger(version)) {
    throw new InvalidIfMatchError();
  }

  return version;
}

function parseTicketId(params: unknown): UUID {
  const parsed = TICKET_ID_SCHEMA.safeParse(params);

  if (!parsed.success) {
    throw new InvalidTicketIdError();
  }

  return parsed.data.id;
}
