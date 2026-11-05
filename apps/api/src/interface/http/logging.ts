import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { Writable } from "node:stream";
import { LogController } from "fastify";
import type {
  FastifyError,
  FastifyReply,
  FastifyRequest,
  HookHandlerDoneFunction,
} from "fastify";
import type { LogLevel } from "../../config/settings.ts";

const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const HEALTH_PATHS = new Set(["/health", "/health/ready"]);

export interface LoggerOptions {
  readonly level: LogLevel;
  readonly destination?: Writable;
}

interface SerializedError {
  readonly type: string;
  readonly message: string;
  readonly stack: string;
  readonly [key: string]: unknown;
}

interface PinoOptions {
  readonly level: LogLevel;
  readonly formatters: {
    readonly level: (label: string) => { level: string };
  };
  readonly serializers: {
    readonly err: (error: FastifyError) => SerializedError;
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
    serializers: { err: serializeError },
    ...(destination === undefined ? {} : { stream: destination }),
  };
}

export function generateRequestId(request: IncomingMessage): string {
  const requestId = request.headers[REQUEST_ID_HEADER];

  return typeof requestId === "string" && REQUEST_ID_PATTERN.test(requestId)
    ? requestId
    : randomUUID();
}

export function presentRequestId(
  request: FastifyRequest,
  response: FastifyReply,
  done: HookHandlerDoneFunction,
): void {
  void response.header(REQUEST_ID_HEADER, request.id);

  done();
}

export function serializeError(error: FastifyError): SerializedError {
  return {
    type: error.constructor.name,
    message: error.message,
    stack: error.stack ?? "",
    ...("code" in error && typeof error.code === "string"
      ? { code: error.code }
      : {}),
    ...("constraint" in error && typeof error.constraint === "string"
      ? { constraint: error.constraint }
      : {}),
  };
}

export class RequestLogController extends LogController {
  constructor() {
    super({
      disableRequestLogging: (request) =>
        HEALTH_PATHS.has(readPath(request.url)),
    });
  }

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
