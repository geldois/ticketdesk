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

interface FilterGroupProps<Option extends string> {
  readonly label: string;
  readonly options: readonly Option[];
  readonly labels: Readonly<Record<Option, string>>;
  readonly value: Option | null;
  readonly onChange: (value: Option | null) => void;
}

function FilterGroup<Option extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: FilterGroupProps<Option>): ReactElement {
  return (
    <div role="group" aria-label={label} className="filter-group">
      <span aria-hidden="true">{label}</span>
      <button
        type="button"
        aria-pressed={value === null}
        onClick={() => {
          onChange(null);
        }}
      >
        Todos
      </button>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => {
            onChange(option);
          }}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

export function TicketFilters({
  values,
  onChange,
}: TicketFiltersProps): ReactElement {
  return (
    <div className="filters">
      <FilterGroup
        label="Status"
        options={TICKET_STATUSES}
        labels={STATUS_LABELS}
        value={values.status}
        onChange={(status) => {
          onChange({ ...values, status });
        }}
      />
      <FilterGroup
        label="Canal"
        options={TICKET_CHANNELS}
        labels={CHANNEL_LABELS}
        value={values.channel}
        onChange={(channel) => {
          onChange({ ...values, channel });
        }}
      />
    </div>
  );
}
