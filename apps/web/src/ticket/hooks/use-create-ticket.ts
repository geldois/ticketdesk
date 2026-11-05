import type {
  CreateTicketRequest,
  TicketChannel,
  TicketPriority,
} from "@ticketdesk/contract";
import { useState } from "react";

import { createTicket } from "../../api/client.ts";
import { describeError } from "../describe-error.ts";

export interface CreateTicketValues extends CreateTicketRequest {
  readonly channel: TicketChannel;
  readonly priority: TicketPriority;
}

export interface CreateTicketController {
  readonly values: CreateTicketValues;
  readonly sending: boolean;
  readonly error: string | null;
  readonly change: (values: CreateTicketValues) => void;
  readonly submit: () => void;
}

const INITIAL_VALUES: CreateTicketValues = {
  customerName: "",
  description: "",
  channel: "chat",
  priority: "medium",
};
const CREATE_ERROR = "Não foi possível criar o ticket.";

export function useCreateTicket(onCreated: () => void): CreateTicketController {
  const [values, change] = useState<CreateTicketValues>(INITIAL_VALUES);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setSending(true);
    setError(null);

    try {
      await createTicket(values);
      change(INITIAL_VALUES);
      onCreated();
    } catch (failure) {
      setError(describeError(CREATE_ERROR, failure));
    } finally {
      setSending(false);
    }
  }

  return {
    values,
    sending,
    error,
    change,
    submit: () => {
      void submit();
    },
  };
}
