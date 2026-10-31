import type { DomainError } from "./errors.ts";

export interface TextField {
  readonly regex: RegExp;
  readonly maxLength: number;
  readonly invalidError: new () => DomainError;
  readonly missingError: (new () => DomainError) | null;
}

export function normalizeText(raw: string, field: TextField): string {
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
