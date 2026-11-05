import type { TicketChannel, TicketStatus } from "@ticketdesk/contract";
import type { ReactElement } from "react";

import {
  CHANNEL_LABELS,
  STATUS_LABELS,
  TICKET_CHANNELS,
  TICKET_STATUSES,
} from "../labels.ts";

export interface TicketFilterValues {
  readonly status: TicketStatus | null;
  readonly channel: TicketChannel | null;
}

interface TicketFiltersProps {
  readonly values: TicketFilterValues;
  readonly onChange: (values: TicketFilterValues) => void;
}

export function TicketFilters({
  values,
  onChange,
}: TicketFiltersProps): ReactElement {
  return (
    <div className="filters">
      <label className="filter">
        <span>Status</span>
        <select
          value={values.status ?? ""}
          onChange={(event) => {
            onChange({
              ...values,
              status:
                TICKET_STATUSES.find(
                  (status) => status === event.target.value,
                ) ?? null,
            });
          }}
        >
          <option value="">Todos</option>
          {TICKET_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="filter">
        <span>Canal</span>
        <select
          value={values.channel ?? ""}
          onChange={(event) => {
            onChange({
              ...values,
              channel:
                TICKET_CHANNELS.find(
                  (channel) => channel === event.target.value,
                ) ?? null,
            });
          }}
        >
          <option value="">Todos</option>
          {TICKET_CHANNELS.map((channel) => (
            <option key={channel} value={channel}>
              {CHANNEL_LABELS[channel]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
