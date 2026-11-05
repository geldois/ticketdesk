import type { TicketResponse } from "@ticketdesk/contract";
import type { ReactElement } from "react";

import type { TicketPanelState } from "../hooks/use-ticket-panel.ts";
import {
  CHANNEL_LABELS,
  formatInstant,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../labels.ts";
import { TicketActions } from "./TicketActions.tsx";
import { TicketHistory } from "./TicketHistory.tsx";

interface TicketPanelProps {
  readonly state: TicketPanelState;
  readonly onRetry: () => void;
  readonly onTransited: (ticket: TicketResponse) => void;
  readonly onConflict: (currentTicket: TicketResponse) => void;
}

export function TicketPanel({
  state,
  onRetry,
  onTransited,
  onConflict,
}: TicketPanelProps): ReactElement {
  if (state.kind === "loading") {
    return <p role="status">Carregando ticket…</p>;
  }

  if (state.kind === "error") {
    return (
      <div role="alert">
        <p>{state.message}</p>
        <button type="button" onClick={onRetry}>
          Tentar de novo
        </button>
      </div>
    );
  }

  const { ticket, history, notice } = state;

  return (
    <section className="panel">
      <h2>Ticket</h2>
      {notice !== null && <p role="alert">{notice}</p>}
      <dl className="fields">
        <dt>Cliente</dt>
        <dd>{ticket.customerName}</dd>
        <dt>Descrição</dt>
        <dd>{ticket.description}</dd>
        <dt>Canal</dt>
        <dd>{CHANNEL_LABELS[ticket.channel]}</dd>
        <dt>Prioridade</dt>
        <dd>{PRIORITY_LABELS[ticket.priority]}</dd>
        <dt>Status</dt>
        <dd>{STATUS_LABELS[ticket.status]}</dd>
        {ticket.resolutionNote !== null && (
          <>
            <dt>Nota de resolução</dt>
            <dd>{ticket.resolutionNote}</dd>
          </>
        )}
        <dt>Versão</dt>
        <dd>{ticket.version}</dd>
        <dt>Criado em</dt>
        <dd>{formatInstant(ticket.createdAt)}</dd>
      </dl>
      <TicketActions
        key={`${ticket.id}-${String(ticket.version)}`}
        ticket={ticket}
        onTransited={onTransited}
        onConflict={onConflict}
      />
      <TicketHistory history={history} />
    </section>
  );
}
