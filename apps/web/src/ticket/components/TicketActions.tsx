import type { TicketResponse } from "@ticketdesk/contract";
import type { ReactElement } from "react";

import { useTicketTransition } from "../hooks/use-ticket-transition.ts";
import { TEXT_LABELS, TRANSITION_LABELS } from "../labels.ts";

interface TicketActionsProps {
  readonly ticket: TicketResponse;
  readonly onTransited: (ticket: TicketResponse) => void;
  readonly onConflict: (currentTicket: TicketResponse) => void;
}

export function TicketActions({
  ticket,
  onTransited,
  onConflict,
}: TicketActionsProps): ReactElement {
  const { chosen, text, sending, error, choose, changeText, confirm } =
    useTicketTransition(ticket, onTransited, onConflict);

  return (
    <div className="actions">
      <div className="action-buttons">
        {ticket.nextTransitions.map((transition) => (
          <button
            key={transition.to}
            type="button"
            disabled={sending}
            onClick={() => {
              choose(transition);
            }}
          >
            {TRANSITION_LABELS[transition.to]}
          </button>
        ))}
      </div>
      {chosen !== null && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
        >
          {chosen.requires !== null && (
            <label className="field">
              <span>{TEXT_LABELS[chosen.requires]}</span>
              <textarea
                value={text}
                onChange={(event) => {
                  changeText(event.target.value);
                }}
              />
            </label>
          )}
          <button type="submit" disabled={sending}>
            Confirmar
          </button>
        </form>
      )}
      {error !== null && <p role="alert">{error}</p>}
    </div>
  );
}
