import type { ReactElement } from "react";

import { TicketFilters } from "./ticket/components/TicketFilters.tsx";
import { TicketList } from "./ticket/components/TicketList.tsx";
import { useTicketList } from "./ticket/hooks/use-ticket-list.ts";

export function App(): ReactElement {
  const { filters, state, changeFilters, reload, loadMore } = useTicketList();

  return (
    <main className="screen">
      <h1>ticketdesk</h1>
      <TicketFilters values={filters} onChange={changeFilters} />
      {state.kind === "loading" && <p role="status">Carregando tickets…</p>}
      {state.kind === "error" && (
        <div role="alert">
          <p>{state.message}</p>
          <button type="button" onClick={reload}>
            Tentar de novo
          </button>
        </div>
      )}
      {state.kind === "ready" && state.tickets.length === 0 && (
        <p>Nenhum ticket encontrado.</p>
      )}
      {state.kind === "ready" && state.tickets.length > 0 && (
        <>
          <TicketList tickets={state.tickets} />
          {state.moreError !== null && <p role="alert">{state.moreError}</p>}
          {state.nextLink !== null && (
            <button
              type="button"
              disabled={state.loadingMore}
              onClick={() => {
                if (state.nextLink !== null) {
                  loadMore(state.nextLink);
                }
              }}
            >
              Carregar mais
            </button>
          )}
        </>
      )}
    </main>
  );
}
