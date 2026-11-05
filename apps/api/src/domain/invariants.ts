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
  InvalidTransitionError,
  UnexpectedReopenReasonError,
  UnexpectedResolutionNoteError,
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
  readonly maxLength: number;
  readonly invalidError: new () => DomainError;
  readonly missingError: (new () => DomainError) | null;
}

export const CUSTOMER_NAME: InvariantField = {
  maxLength: 120,
  invalidError: InvalidCustomerNameError,
  missingError: null,
};

export const DESCRIPTION: InvariantField = {
  maxLength: 4000,
  invalidError: InvalidDescriptionError,
  missingError: null,
};

export const RESOLUTION_NOTE: InvariantField = {
  maxLength: 2000,
  invalidError: InvalidResolutionNoteError,
  missingError: MissingResolutionNoteError,
};

export const REOPEN_REASON: InvariantField = {
  maxLength: 500,
  invalidError: InvalidReopenReasonError,
  missingError: MissingReopenReasonError,
};

const FORBIDDEN_CHARACTER = RegExp(
  "[\\p{Cc}\\p{Cs}\\p{Co}\\p{Cn}\\u202A-\\u202E\\u2066-\\u2069]",
  "u",
);
const VISIBLE_CHARACTER = RegExp("[\\p{L}\\p{N}\\p{P}\\p{S}]", "u");

export function normalizeInvariantField(
  raw: string,
  field: InvariantField,
): string {
  const compacted = raw.normalize("NFC");
  const condensed = compacted.replace(RegExp("\\s+", "g"), " ");
  const normalized = condensed.trim();
  const length = Array.from(normalized).length;

  if (length < 1) {
    throw field.missingError !== null
      ? new field.missingError()
      : new field.invalidError();
  }

  if (
    FORBIDDEN_CHARACTER.test(normalized) ||
    !VISIBLE_CHARACTER.test(normalized)
  ) {
    throw new field.invalidError();
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

export function normalizeTicketStatus(raw: string): TicketStatus {
  if (!isTicketStatus(raw)) {
    throw new InvalidTransitionError();
  }

  return raw;
}

export const TRANSITION_TICKET_STATUSES: Readonly<
  Record<TicketStatus, readonly TicketStatus[]>
> = Object.freeze({
  open: Object.freeze(["in_progress"] as const),
  in_progress: Object.freeze(["resolved"] as const),
  resolved: Object.freeze(["open"] as const),
});

export type TransitionTicketText = "resolutionNote" | "reopenReason";

export const TRANSITION_TICKET_TEXTS: Readonly<
  Record<TicketStatus, TransitionTicketText | null>
> = Object.freeze({
  open: "reopenReason",
  in_progress: null,
  resolved: "resolutionNote",
});

export function validateTransitionTicketStatus(
  from: TicketStatus,
  to: TicketStatus,
): void {
  if (!TRANSITION_TICKET_STATUSES[from].includes(to)) {
    throw new InvalidTransitionError();
  }
}

export function validateTransitionUnexpected(
  to: TicketStatus,
  resolutionNote: string | null,
  reopenReason: string | null,
): void {
  const required = TRANSITION_TICKET_TEXTS[to];

  if (required !== "resolutionNote" && resolutionNote !== null) {
    throw new UnexpectedResolutionNoteError();
  }

  if (required !== "reopenReason" && reopenReason !== null) {
    throw new UnexpectedReopenReasonError();
  }
}

export function validateTransitionMissing(
  to: TicketStatus,
  resolutionNote: string | null,
  reopenReason: string | null,
): void {
  const required = TRANSITION_TICKET_TEXTS[to];

  if (required === "resolutionNote" && resolutionNote === null) {
    throw new MissingResolutionNoteError();
  }

  if (required === "reopenReason" && reopenReason === null) {
    throw new MissingReopenReasonError();
  }
}

export function validateTransition(
  from: TicketStatus,
  to: TicketStatus,
  resolutionNote: string | null,
  reopenReason: string | null,
): void {
  validateTransitionTicketStatus(from, to);
  validateTransitionUnexpected(to, resolutionNote, reopenReason);
  validateTransitionMissing(to, resolutionNote, reopenReason);
}
