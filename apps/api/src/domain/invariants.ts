import {
  InvalidCustomerNameError,
  InvalidDescriptionError,
  InvalidNoteError,
  InvalidReasonError,
  MissingNoteError,
  MissingReasonError,
} from "./errors.ts";
import type { TextField } from "./text.ts";

export const CUSTOMER_NAME: TextField = {
  regex: RegExp("^[\\p{L}\\p{N}\\s'-]*$", "u"),
  maxLength: 120,
  invalidError: InvalidCustomerNameError,
  missingError: null,
};

const FREE_TEXT_REGEX = RegExp("^[\\p{L}\\p{N}\\p{P}\\s]*$", "u");

export const DESCRIPTION: TextField = {
  regex: FREE_TEXT_REGEX,
  maxLength: 4000,
  invalidError: InvalidDescriptionError,
  missingError: null,
};

export const RESOLUTION_NOTE: TextField = {
  regex: FREE_TEXT_REGEX,
  maxLength: 2000,
  invalidError: InvalidNoteError,
  missingError: MissingNoteError,
};

export const REOPEN_REASON: TextField = {
  regex: FREE_TEXT_REGEX,
  maxLength: 500,
  invalidError: InvalidReasonError,
  missingError: MissingReasonError,
};
