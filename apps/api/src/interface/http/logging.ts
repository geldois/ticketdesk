import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Writable } from "node:stream";
import { LogController } from "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { LogLevel } from "../../config/settings.ts";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const HEALTH_PATHS = new Set(["/health", "/health/ready"]);

export interface LoggerOptions {
  readonly level: LogLevel;
  readonly destination?: Writable;
}

interface PinoOptions {
  readonly level: LogLevel;
  readonly formatters: {
    readonly level: (label: string) => { level: string };
  };
  readonly stream?: Writable;
}

export function buildLoggerOptions({
  level,
  destination,
}: LoggerOptions): PinoOptions {
  return {
    level,
    formatters: { level: (label: string) => ({ level: label }) },
    ...(destination === undefined ? {} : { stream: destination }),
  };
}

// O identificador vem do cliente e vai para o log e para a resposta: só a lista fechada de caracteres e o limite de
// tamanho o tornam seguro. Um cabeçalho repetido chega como texto com vírgula e cai no padrão.
export function generateRequestId(request: IncomingMessage): string {
  const requestId = request.headers[REQUEST_ID_HEADER];

  return typeof requestId === "string" && REQUEST_ID_PATTERN.test(requestId)
    ? requestId
    : randomUUID();
}

export function presentRequestId(
  request: FastifyRequest,
  response: FastifyReply,
): Promise<void> {
  void response.header(REQUEST_ID_HEADER, request.id);

  return Promise.resolve();
}

export class RequestLogController extends LogController {
  constructor() {
    super({
      disableRequestLogging: (request) =>
        HEALTH_PATHS.has(readPath(request.url)),
    });
  }

  // Cada requisição escreve só a linha de conclusão: a de entrada e a de rota inexistente trazem a URL com a query.
  override incomingRequest(): void {
    return;
  }

  override routeNotFound(): void {
    return;
  }

  override requestCompleted(
    _error: Error | null | undefined,
    request: FastifyRequest,
    response: FastifyReply,
  ): void {
    if (this.isLogDisabled(request)) {
      return;
    }

    const status = response.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "info";

    response.log[level](
      {
        method: request.method,
        path: readPath(request.url),
        status,
        durationMs: response.elapsedTime,
      },
      "request completed",
    );
  }
}

function readPath(url: string): string {
  return url.split("?")[0] ?? url;
}
