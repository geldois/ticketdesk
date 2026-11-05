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

export class InvalidResponseError extends Error {
  readonly path: string;

  constructor(path: string) {
    super(`the api answered a body outside the contract at ${path}`);

    this.path = path;
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("the request did not reach the api", { cause });
  }
}
