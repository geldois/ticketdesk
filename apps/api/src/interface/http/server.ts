import Fastify, { type FastifyInstance } from "fastify";
import type { Container } from "../../config/container.ts";
import { registerTicketRouter } from "./routers/ticket-router.ts";
import { handleError, handleNotFound } from "./error-handler.ts";

export function buildServer(container: Container): FastifyInstance {
  const server = Fastify();

  registerTicketRouter(server, container);

  server.setErrorHandler(handleError);
  server.setNotFoundHandler(handleNotFound);

  return server;
}
