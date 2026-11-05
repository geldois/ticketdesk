import type { TicketResponse } from "@ticketdesk/contract";
import type { ReactElement } from "react";

import {
  CHANNEL_LABELS,
  formatInstant,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../labels.ts";

interface TicketListProps {
  readonly tickets: readonly TicketResponse[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
}

export function TicketList({
  tickets,
  selectedId,
  onSelect,
}: TicketListProps): ReactElement {
  return (
    <div className="tickets-scroll">
      <table className="tickets">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Descrição</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Canal</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              className={ticket.id === selectedId ? "selected" : undefined}
              onClick={() => {
                onSelect(ticket.id);
              }}
            >
              <td>
                <button type="button" className="row-button">
                  {ticket.customerName}
                </button>
              </td>
              <td className="description" title={ticket.description}>
                {ticket.description}
              </td>
              <td>{STATUS_LABELS[ticket.status]}</td>
              <td>{PRIORITY_LABELS[ticket.priority]}</td>
              <td>{CHANNEL_LABELS[ticket.channel]}</td>
              <td>{formatInstant(ticket.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
