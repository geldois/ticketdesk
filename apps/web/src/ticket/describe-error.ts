import { ApiError } from "../api/client.ts";

export function describeError(base: string, error: unknown): string {
  return error instanceof ApiError && error.detail !== null
    ? `${base} ${error.detail}`
    : base;
}
