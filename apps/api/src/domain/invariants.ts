import {
  InvalidCustomerNameError,
  InvalidDescriptionError,
  InvalidResolutionNoteError,
  InvalidReopenReasonError,
  MissingResolutionNoteError,
  MissingReopenReasonError,
  type DomainError,
  InvalidTicketChannelError,
  InvalidTicketPriorityError,
  InvalidInstantError,
} from "./errors.ts";
import {
  TICKET_CHANNELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type TicketChannel,
  type TicketPriority,
  type TicketStatus,
} from "./ticket.ts";

export interface InvariantField {
  readonly regex: RegExp;
  readonly maxLength: number;
  readonly invalidError: new () => DomainError;
  readonly missingError: (new () => DomainError) | null;
}

export const CUSTOMER_NAME: InvariantField = {
  regex: RegExp("^[\\p{L}\\p{N}\\s'-]*$", "u"),
  maxLength: 120,
  invalidError: InvalidCustomerNameError,
  missingError: null,
};

const FREE_TEXT_REGEX = RegExp("^[\\p{L}\\p{N}\\p{P}\\s]*$", "u");

export const DESCRIPTION: InvariantField = {
  regex: FREE_TEXT_REGEX,
  maxLength: 4000,
  invalidError: InvalidDescriptionError,
  missingError: null,
};

export const RESOLUTION_NOTE: InvariantField = {
  regex: FREE_TEXT_REGEX,
  maxLength: 2000,
  invalidError: InvalidResolutionNoteError,
  missingError: MissingResolutionNoteError,
};

export const REOPEN_REASON: InvariantField = {
  regex: FREE_TEXT_REGEX,
  maxLength: 500,
  invalidError: InvalidReopenReasonError,
  missingError: MissingReopenReasonError,
};

export function normalizeInvariantField(
  raw: string,
  field: InvariantField,
): string {
  const compacted = raw.normalize("NFC");

  if (!field.regex.test(compacted)) {
    throw new field.invalidError();
  }

  const condensed = compacted.replace(RegExp("\\s+", "g"), " ");
  const trimmed = condensed.trim();
  const normalized = trimmed;
  const length = Array.from(normalized).length;

  if (length < 1) {
    throw field.missingError !== null
      ? new field.missingError()
      : new field.invalidError();
  }

  if (length > field.maxLength) {
    throw new field.invalidError();
  }

  return normalized;
}

export function validateInstant(at: Date): void {
  if (Number.isNaN(at.getTime())) {
    throw new InvalidInstantError();
  }
}

export function isTicketChannel(raw: string): raw is TicketChannel {
  const known: readonly string[] = TICKET_CHANNELS;

  return known.includes(raw);
}

export function isTicketPriority(raw: string): raw is TicketPriority {
  const known: readonly string[] = TICKET_PRIORITIES;

  return known.includes(raw);
}

export function isTicketStatus(raw: string): raw is TicketStatus {
  const known: readonly string[] = TICKET_STATUSES;

  return known.includes(raw);
}

export function normalizeTicketChannel(raw: string): TicketChannel {
  if (!isTicketChannel(raw)) {
    throw new InvalidTicketChannelError();
  }

  return raw;
}

export function normalizeTicketPriority(raw: string): TicketPriority {
  if (!isTicketPriority(raw)) {
    throw new InvalidTicketPriorityError();
  }

  return raw;
}
