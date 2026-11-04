import { InvalidSettingsError } from "./errors.ts";

const DATABASE_VARIABLES = [
  "PGHOST",
  "PGPORT",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
] as const;
const DEFAULT_API_HOST = "127.0.0.1";
const DEFAULT_API_PORT = "3000";
const PORT_PROBLEM = "must be an integer from 1 to 65535";

export class Settings {
  readonly databaseUrl: string;
  readonly apiHost: string;
  readonly apiPort: number;
  readonly webDistDir: string | null;

  private constructor({
    databaseUrl,
    apiHost,
    apiPort,
    webDistDir,
  }: {
    databaseUrl: string;
    apiHost: string;
    apiPort: number;
    webDistDir: string | null;
  }) {
    this.databaseUrl = databaseUrl;
    this.apiHost = apiHost;
    this.apiPort = apiPort;
    this.webDistDir = webDistDir;
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): Settings {
    const problems: string[] = [];
    const missing = DATABASE_VARIABLES.filter(
      (name) => readVariable(env, name) === "",
    );

    if (missing.length > 0) {
      problems.push(`missing ${missing.join(", ")}`);
    }

    if (!missing.includes("PGPORT") && !isPort(readVariable(env, "PGPORT"))) {
      problems.push(`PGPORT ${PORT_PROBLEM}`);
    }

    const apiPort = env["API_PORT"] ?? DEFAULT_API_PORT;

    if (!isPort(apiPort)) {
      problems.push(`API_PORT ${PORT_PROBLEM}`);
    }

    if (problems.length > 0) {
      throw new InvalidSettingsError(problems);
    }

    const databaseUrl = new URL("postgres://");

    databaseUrl.hostname = readVariable(env, "PGHOST");
    databaseUrl.port = readVariable(env, "PGPORT");
    databaseUrl.username = readVariable(env, "PGUSER");
    databaseUrl.password = readVariable(env, "PGPASSWORD");
    databaseUrl.pathname = readVariable(env, "PGDATABASE");

    const webDistDir = readVariable(env, "WEB_DIST_DIR");

    return new Settings({
      databaseUrl: databaseUrl.toString(),
      apiHost: env["API_HOST"] ?? DEFAULT_API_HOST,
      apiPort: Number(apiPort),
      webDistDir: webDistDir.trim() === "" ? null : webDistDir,
    });
  }
}

function readVariable(env: NodeJS.ProcessEnv, name: string): string {
  return env[name] ?? "";
}

function isPort(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535;
}
