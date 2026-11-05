import type { TicketResponse } from "@ticketdesk/contract";
import type { ReactElement } from "react";

import {
  CHANNEL_LABELS,
  formatCreatedAt,
  PRIORITY_LABELS,
  STATUS_LABELS,
} from "../labels.ts";

interface TicketListProps {
  readonly tickets: readonly TicketResponse[];
}

export function TicketList({ tickets }: TicketListProps): ReactElement {
  return (
    <div className="tickets-scroll">
      <table className="tickets">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Status</th>
            <th>Prioridade</th>
            <th>Canal</th>
            <th>Criado em</th>
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>{ticket.customerName}</td>
              <td>{STATUS_LABELS[ticket.status]}</td>
              <td>{PRIORITY_LABELS[ticket.priority]}</td>
              <td>{CHANNEL_LABELS[ticket.channel]}</td>
              <td>{formatCreatedAt(ticket.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
