import type {
  NextTransitionResponse,
  TicketResponse,
} from "@ticketdesk/contract";
import { useState } from "react";

import { ApiError, transitTicket } from "../../api/client.ts";
import { describeError } from "../describe-error.ts";

export interface TicketTransitionController {
  readonly chosen: NextTransitionResponse | null;
  readonly text: string;
  readonly sending: boolean;
  readonly error: string | null;
  readonly choose: (transition: NextTransitionResponse) => void;
  readonly changeText: (text: string) => void;
  readonly confirm: () => void;
}

const TRANSIT_ERROR = "Não foi possível alterar o ticket.";

export function useTicketTransition(
  ticket: TicketResponse,
  onTransited: (ticket: TicketResponse) => void,
  onConflict: (currentTicket: TicketResponse) => void,
): TicketTransitionController {
  const [chosen, setChosen] = useState<NextTransitionResponse | null>(null);
  const [text, changeText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(): Promise<void> {
    if (chosen === null) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      onTransited(
        await transitTicket({
          id: ticket.id,
          version: ticket.version,
          to: chosen.to,
          resolutionNote: chosen.requires === "resolutionNote" ? text : null,
          reopenReason: chosen.requires === "reopenReason" ? text : null,
        }),
      );
    } catch (failure) {
      if (failure instanceof ApiError && failure.currentTicket !== null) {
        onConflict(failure.currentTicket);
      } else {
        setError(describeError(TRANSIT_ERROR, failure));
      }
    } finally {
      setSending(false);
    }
  }

  return {
    chosen,
    text,
    sending,
    error,
    choose: (transition) => {
      setChosen(transition);
      setError(null);
    },
    changeText,
    confirm: () => {
      void confirm();
    },
  };
}
