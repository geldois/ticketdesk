import {
  LIST_TICKET_HISTORY_ENTRIES_RESPONSE_SCHEMA,
  LIST_TICKETS_RESPONSE_SCHEMA,
  type ListTicketHistoryEntriesResponse,
  type ListTicketsRequest,
  TICKET_RESPONSE_SCHEMA,
  type TicketResponse,
} from "@ticketdesk/contract";
import type { ZodType } from "zod";

import { ApiError, InvalidResponseError, NetworkError } from "./errors.ts";

export { ApiError, InvalidResponseError, NetworkError } from "./errors.ts";

export interface TicketPage {
  readonly tickets: readonly TicketResponse[];
  readonly nextLink: string | null;
}

const NEXT_LINK = /<([^>]*)>\s*;\s*rel="next"/;

export function listTickets(
  filters: Pick<ListTicketsRequest, "status" | "channel">,
): Promise<TicketPage> {
  const query = new URLSearchParams();

  if (filters.status !== undefined) {
    query.set("status", filters.status);
  }

  if (filters.channel !== undefined) {
    query.set("channel", filters.channel);
  }

  const search = query.toString();

  return readPage(search === "" ? "/tickets" : `/tickets?${search}`);
}

export function listNextTickets(nextLink: string): Promise<TicketPage> {
  return readPage(nextLink);
}

export async function getTicket(id: string): Promise<TicketResponse> {
  const response = await request(`/tickets/${encodeURIComponent(id)}`);

  return readBody(response, TICKET_RESPONSE_SCHEMA);
}

export async function listTicketHistoryEntries(
  id: string,
): Promise<ListTicketHistoryEntriesResponse> {
  const response = await request(`/tickets/${encodeURIComponent(id)}/history`);

  return readBody(response, LIST_TICKET_HISTORY_ENTRIES_RESPONSE_SCHEMA);
}

async function readPage(path: string): Promise<TicketPage> {
  const response = await request(path);

  return {
    tickets: await readBody(response, LIST_TICKETS_RESPONSE_SCHEMA),
    nextLink: NEXT_LINK.exec(response.headers.get("link") ?? "")?.[1] ?? null,
  };
}

async function readBody<Body>(
  response: Response,
  schema: ZodType<Body>,
): Promise<Body> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new InvalidResponseError("body");
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    const path = result.error.issues[0]?.path ?? [];

    throw new InvalidResponseError(
      path.length === 0 ? "body" : path.map(String).join("."),
    );
  }

  return result.data;
}

async function request(path: string): Promise<Response> {
  let response: Response;

  try {
    response = await fetch(path);
  } catch (cause) {
    throw new NetworkError(cause);
  }

  if (!response.ok) {
    throw await readApiError(response);
  }

  return response;
}

async function readApiError(response: Response): Promise<ApiError> {
  const isProblem =
    response.headers
      .get("content-type")
      ?.startsWith("application/problem+json") === true;

  if (!isProblem) {
    return new ApiError(response.status, null, null);
  }

  const body: unknown = await response.json().catch(() => null);

  return new ApiError(
    response.status,
    readText(body, "code"),
    readText(body, "detail"),
  );
}

function readText(body: unknown, name: string): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const value: unknown = Reflect.get(body, name);

  return typeof value === "string" ? value : null;
}
