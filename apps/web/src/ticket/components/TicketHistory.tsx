import type { ListTicketHistoryEntriesResponse } from "@ticketdesk/contract";
import type { ReactElement } from "react";

import { formatInstant, STATUS_LABELS } from "../labels.ts";

interface TicketHistoryProps {
  readonly history: ListTicketHistoryEntriesResponse;
}

export function TicketHistory({ history }: TicketHistoryProps): ReactElement {
  return (
    <section>
      <h3>Histórico</h3>
      <ol className="history">
        {history.map((entry) => (
          <li key={`${entry.at}-${entry.to}`}>
            <strong>
              {entry.from === null ? "Criado" : STATUS_LABELS[entry.from]}
            </strong>
            {" → "}
            <strong>{STATUS_LABELS[entry.to]}</strong>{" "}
            <time dateTime={entry.at}>{formatInstant(entry.at)}</time>
            {entry.resolutionNote !== null && (
              <p>Nota de resolução: {entry.resolutionNote}</p>
            )}
            {entry.reopenReason !== null && (
              <p>Motivo da reabertura: {entry.reopenReason}</p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
