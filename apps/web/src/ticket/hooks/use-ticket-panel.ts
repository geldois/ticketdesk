import type {
  ListTicketHistoryEntriesResponse,
  TicketResponse,
} from "@ticketdesk/contract";
import { useCallback, useEffect, useRef, useState } from "react";

import { getTicket, listTicketHistoryEntries } from "../../api/client.ts";
import { describeError } from "../describe-error.ts";

export type TicketPanelState =
  | { readonly kind: "loading" }
  | { readonly kind: "error"; readonly message: string }
  | {
      readonly kind: "ready";
      readonly ticket: TicketResponse;
      readonly history: ListTicketHistoryEntriesResponse;
      readonly notice: string | null;
    };

export interface TicketPanelController {
  readonly selectedId: string | null;
  readonly state: TicketPanelState | null;
  readonly select: (id: string) => void;
  readonly reload: () => void;
  readonly replace: (ticket: TicketResponse, notice?: string) => void;
}

const LOAD_ERROR = "Não foi possível carregar o ticket.";

export function useTicketPanel(): TicketPanelController {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [state, setState] = useState<TicketPanelState>({ kind: "loading" });
  const latestRequest = useRef(0);

  const load = useCallback(async (id: string) => {
    latestRequest.current += 1;

    const request = latestRequest.current;

    setState({ kind: "loading" });

    try {
      const [ticket, history] = await Promise.all([
        getTicket(id),
        listTicketHistoryEntries(id),
      ]);

      if (request === latestRequest.current) {
        setState({ kind: "ready", ticket, history, notice: null });
      }
    } catch (error) {
      if (request === latestRequest.current) {
        setState({
          kind: "error",
          message: describeError(LOAD_ERROR, error),
        });
      }
    }
  }, []);

  const replace = useCallback(
    async (ticket: TicketResponse, notice: string | null) => {
      latestRequest.current += 1;

      const request = latestRequest.current;

      setState((current) =>
        current.kind === "ready" ? { ...current, ticket, notice } : current,
      );

      try {
        const history = await listTicketHistoryEntries(ticket.id);

        if (request === latestRequest.current) {
          setState({ kind: "ready", ticket, history, notice });
        }
      } catch (error) {
        if (request === latestRequest.current) {
          setState({
            kind: "error",
            message: describeError(LOAD_ERROR, error),
          });
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedId !== null) {
      void load(selectedId);
    }
  }, [selectedId, load]);

  return {
    selectedId,
    state: selectedId === null ? null : state,
    select: (id) => {
      if (id === selectedId) {
        void load(id);

        return;
      }

      setState({ kind: "loading" });
      setSelectedId(id);
    },
    reload: () => {
      if (selectedId !== null) {
        void load(selectedId);
      }
    },
    replace: (ticket, notice) => {
      void replace(ticket, notice ?? null);
    },
  };
}
