import { InvalidSettingsError } from "./errors.ts";

const DATABASE_VARIABLES = [
  "PGHOST",
  "PGPORT",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
] as const;
const LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;
const DEFAULT_API_HOST = "127.0.0.1";
const DEFAULT_API_PORT = "3000";
const DEFAULT_LOG_LEVEL = "info";
const PORT_PROBLEM = "must be an integer from 1 to 65535";

export type LogLevel = (typeof LOG_LEVELS)[number];

export class Settings {
  readonly databaseUrl: string;
  readonly apiHost: string;
  readonly apiPort: number;
  readonly webDistDir: string | null;
  readonly logLevel: LogLevel;

  private constructor({
    databaseUrl,
    apiHost,
    apiPort,
    webDistDir,
    logLevel,
  }: {
    databaseUrl: string;
    apiHost: string;
    apiPort: number;
    webDistDir: string | null;
    logLevel: LogLevel;
  }) {
    this.databaseUrl = databaseUrl;
    this.apiHost = apiHost;
    this.apiPort = apiPort;
    this.webDistDir = webDistDir;
    this.logLevel = logLevel;
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

    const logLevel = readVariable(env, "LOG_LEVEL").trim() || DEFAULT_LOG_LEVEL;

    if (!isLogLevel(logLevel)) {
      problems.push(`LOG_LEVEL must be one of ${LOG_LEVELS.join(", ")}`);
    }

    if (problems.length > 0 || !isLogLevel(logLevel)) {
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
      logLevel,
    });
  }
}

function readVariable(env: NodeJS.ProcessEnv, name: string): string {
  return env[name] ?? "";
}

function isLogLevel(value: string): value is LogLevel {
  return LOG_LEVELS.some((logLevel) => logLevel === value);
}

function isPort(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535;
}
