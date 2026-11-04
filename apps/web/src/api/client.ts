import type {
  ListTicketsRequest,
  TicketHistoryEntryResponse,
  TicketResponse,
} from "@ticketdesk/contract";

import { ApiError, NetworkError } from "./errors.ts";

export { ApiError, NetworkError } from "./errors.ts";

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

  return readJson<TicketResponse>(response);
}

export async function listTicketHistoryEntries(
  id: string,
): Promise<readonly TicketHistoryEntryResponse[]> {
  const response = await request(`/tickets/${encodeURIComponent(id)}/history`);

  return readJson<readonly TicketHistoryEntryResponse[]>(response);
}

async function readPage(path: string): Promise<TicketPage> {
  const response = await request(path);

  return {
    tickets: await readJson<readonly TicketResponse[]>(response),
    nextLink: NEXT_LINK.exec(response.headers.get("link") ?? "")?.[1] ?? null,
  };
}

async function readJson<Body>(response: Response): Promise<Body> {
  const body: unknown = await response.json();

  // o pacote do contrato tipa o que a API envia, e o front não valida o corpo em tempo de execução
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  return body as Body;
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
