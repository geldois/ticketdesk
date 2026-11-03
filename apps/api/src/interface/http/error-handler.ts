import { STATUS_CODES } from "node:http";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { DomainError, type DomainErrorCode } from "../../domain/errors.ts";
import {
  ApplicationError,
  type ApplicationErrorCode,
} from "../../application/errors.ts";
import { InterfaceError, type InterfaceErrorCode } from "../errors.ts";

const ERROR_RESPONSE_TYPE = "application/problem+json";
const ERROR_TYPE = "about:blank";

type FamilyErrorCode =
  DomainErrorCode | ApplicationErrorCode | InterfaceErrorCode;

export type ErrorCode = FamilyErrorCode | "route_not_found" | "internal_error";

const STATUS_BY_FAMILY_ERROR_CODE = {
  invalid_customer_name: 422,
  invalid_description: 422,
  invalid_ticket_channel: 422,
  invalid_ticket_priority: 422,
  invalid_instant: 422,
  missing_resolution_note: 422,
  invalid_resolution_note: 422,
  missing_reopen_reason: 422,
  invalid_reopen_reason: 422,
  unexpected_resolution_note: 422,
  unexpected_reopen_reason: 422,
  invalid_transition: 422,
  ticket_not_found: 404,
  version_conflict: 409,
  invalid_request: 400,
  invalid_ticket_id: 400,
} as const satisfies Record<FamilyErrorCode, number>;

export function handleError(
  error: FastifyError,
  request: FastifyRequest,
  response: FastifyReply,
): FastifyReply {
  if (
    error instanceof DomainError ||
    error instanceof ApplicationError ||
    error instanceof InterfaceError
  ) {
    return sendError(
      response,
      STATUS_BY_FAMILY_ERROR_CODE[error.code],
      error.code,
      error.message,
    );
  }

  const status =
    error.statusCode !== undefined && error.statusCode >= 400
      ? error.statusCode
      : 500;

  if (status < 500) {
    return sendError(
      response,
      status,
      "invalid_request",
      "request could not be processed",
    );
  }

  return sendError(response, status, "internal_error", "internal server error");
}

export function handleNotFound(
  request: FastifyRequest,
  response: FastifyReply,
): FastifyReply {
  return sendError(response, 404, "route_not_found", "route not found");
}

function sendError(
  response: FastifyReply,
  status: number,
  code: ErrorCode,
  detail: string,
): FastifyReply {
  return response
    .code(status)
    .type(ERROR_RESPONSE_TYPE)
    .send({
      type: ERROR_TYPE,
      title: STATUS_CODES[status] ?? "",
      status,
      code,
      detail,
    });
}
