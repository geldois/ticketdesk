import { InvalidSettingsError } from "./errors.ts";

const DATABASE_VARIABLES = [
  "PGHOST",
  "PGPORT",
  "PGUSER",
  "PGPASSWORD",
  "PGDATABASE",
] as const;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = "3000";
const PORT_PROBLEM = "must be an integer from 1 to 65535";

export class Settings {
  readonly databaseUrl: string;
  readonly host: string;
  readonly port: number;

  private constructor(databaseUrl: string, host: string, port: number) {
    this.databaseUrl = databaseUrl;
    this.host = host;
    this.port = port;
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

    const port = env["PORT"] ?? DEFAULT_PORT;

    if (!isPort(port)) {
      problems.push(`PORT ${PORT_PROBLEM}`);
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

    return new Settings(
      databaseUrl.toString(),
      env["HOST"] ?? DEFAULT_HOST,
      Number(port),
    );
  }
}

function readVariable(env: NodeJS.ProcessEnv, name: string): string {
  return env[name] ?? "";
}

function isPort(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 65535;
}
