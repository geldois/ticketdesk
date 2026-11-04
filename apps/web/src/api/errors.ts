export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly detail: string | null;

  constructor(status: number, code: string | null, detail: string | null) {
    super(`the api answered ${String(status)}`);

    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("the request did not reach the api", { cause });
  }
}
