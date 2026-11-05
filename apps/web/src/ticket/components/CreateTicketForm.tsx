import type { ReactElement } from "react";

import { useCreateTicket } from "../hooks/use-create-ticket.ts";
import {
  CHANNEL_LABELS,
  PRIORITY_LABELS,
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
} from "../labels.ts";

interface CreateTicketFormProps {
  readonly onCreated: () => void;
}

export function CreateTicketForm({
  onCreated,
}: CreateTicketFormProps): ReactElement {
  const { values, sending, error, change, submit } = useCreateTicket(onCreated);

  return (
    <form
      className="create-ticket"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <h2>Novo ticket</h2>
      <label className="field">
        <span>Cliente</span>
        <input
          type="text"
          value={values.customerName}
          onChange={(event) => {
            change({ ...values, customerName: event.target.value });
          }}
        />
      </label>
      <label className="field">
        <span>Descrição</span>
        <textarea
          value={values.description}
          onChange={(event) => {
            change({ ...values, description: event.target.value });
          }}
        />
      </label>
      <label className="field">
        <span>Canal</span>
        <select
          value={values.channel}
          onChange={(event) => {
            const channel = TICKET_CHANNELS.find(
              (option) => option === event.target.value,
            );

            if (channel !== undefined) {
              change({ ...values, channel });
            }
          }}
        >
          {TICKET_CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {CHANNEL_LABELS[channel]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Prioridade</span>
        <select
          value={values.priority}
          onChange={(event) => {
            const priority = TICKET_PRIORITIES.find(
              (option) => option === event.target.value,
            );

            if (priority !== undefined) {
              change({ ...values, priority });
            }
          }}
        >
          {TICKET_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={sending}>
        Criar ticket
      </button>
      {error !== null && <p role="alert">{error}</p>}
    </form>
  );
}
