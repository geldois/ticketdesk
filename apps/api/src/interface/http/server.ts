import Fastify, { type FastifyInstance } from "fastify";
import type { Container } from "../../config/container.ts";
import { registerHealthRouter } from "./routers/health-router.ts";
import { registerTicketRouter } from "./routers/ticket-router.ts";
import { handleError, handleNotFound } from "./error-handler.ts";
import { registerWebDist } from "./web/web-dist.ts";

export function buildServer({
  container,
  webDistDir,
}: {
  container: Container;
  webDistDir: string | null;
}): FastifyInstance {
  const server = Fastify();

  registerHealthRouter(server, container);
  registerTicketRouter(server, container);

  if (webDistDir !== null) {
    registerWebDist(server, webDistDir);
  }

  server.setErrorHandler(handleError);
  server.setNotFoundHandler(handleNotFound);

  return server;
}
