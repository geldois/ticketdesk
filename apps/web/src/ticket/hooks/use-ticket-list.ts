import type { TicketResponse } from "@ticketdesk/contract";
import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, listNextTickets, listTickets } from "../../api/client.ts";
import type { TicketFilterValues } from "../components/TicketFilters.tsx";

export type TicketListState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "ready";
      readonly tickets: readonly TicketResponse[];
      readonly nextLink: string | null;
      readonly loadingMore: boolean;
      readonly moreError: string | null;
    };

export interface TicketListController {
  readonly filters: TicketFilterValues;
  readonly state: TicketListState;
  readonly changeFilters: (filters: TicketFilterValues) => void;
  readonly reload: () => void;
  readonly loadMore: (nextLink: string) => void;
}

const NO_FILTERS: TicketFilterValues = { status: null, channel: null };

function describeError(error: unknown): string {
  const base = "Não foi possível carregar os tickets.";

  return error instanceof ApiError && error.detail !== null
    ? `${base} ${error.detail}`
    : base;
}

export function useTicketList(): TicketListController {
  const [filters, changeFilters] = useState<TicketFilterValues>(NO_FILTERS);
  const [state, setState] = useState<TicketListState>({ kind: "loading" });
  const latestRequest = useRef(0);

  const reload = useCallback(async () => {
    latestRequest.current += 1;

    const request = latestRequest.current;

    setState({ kind: "loading" });

    try {
      const page = await listTickets({
        ...(filters.status === null ? {} : { status: filters.status }),
        ...(filters.channel === null ? {} : { channel: filters.channel }),
      });

      if (request === latestRequest.current) {
        setState({
          kind: "ready",
          tickets: page.tickets,
          nextLink: page.nextLink,
          loadingMore: false,
          moreError: null,
        });
      }
    } catch (error) {
      if (request === latestRequest.current) {
        setState({ kind: "error", message: describeError(error) });
      }
    }
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function loadMore(nextLink: string): Promise<void> {
    const request = latestRequest.current;

    setState((current) =>
      current.kind === "ready"
        ? { ...current, loadingMore: true, moreError: null }
        : current,
    );

    try {
      const page = await listNextTickets(nextLink);

      if (request === latestRequest.current) {
        setState((current) => {
          if (current.kind !== "ready") {
            return current;
          }

          const known = new Set(current.tickets.map((ticket) => ticket.id));

          return {
            ...current,
            tickets: [
              ...current.tickets,
              ...page.tickets.filter((ticket) => !known.has(ticket.id)),
            ],
            nextLink: page.nextLink,
            loadingMore: false,
          };
        });
      }
    } catch (error) {
      if (request === latestRequest.current) {
        setState((current) =>
          current.kind === "ready"
            ? {
                ...current,
                loadingMore: false,
                moreError: describeError(error),
              }
            : current,
        );
      }
    }
  }

  return {
    filters,
    state,
    changeFilters,
    reload: () => {
      void reload();
    },
    loadMore: (nextLink) => {
      void loadMore(nextLink);
    },
  };
}
