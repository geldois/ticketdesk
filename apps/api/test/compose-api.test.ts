import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { buildContainer } from "../src/config/container.ts";
import { PgStorage } from "../src/infrastructure/pg-storage.ts";
import { Settings } from "../src/config/settings.ts";
import {
  CONNECTION_TIMEOUT_MS,
  createPgPool,
  QUERY_TIMEOUT_MS,
} from "../src/infrastructure/pool.ts";
import { READINESS_DEADLINE_MS } from "../src/infrastructure/probes/pg-readiness-probe.ts";
import { buildServer } from "../src/interface/http/server.ts";
import { createMigratedTestDatabase } from "./database.ts";

const LOOPBACK_ADDRESS = "127.0.0.1";

const ENV_FILE_VARIABLES: Record<string, string> = {
  PGUSER: "ticket",
  PGPASSWORD: "secret",
  PGDATABASE: "ticketdesk",
  API_PUBLISH_HOST: "127.0.0.1",
  API_PUBLISH_PORT: "8080",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resolve(text: string): string {
  return text.replace(
    /\$\{(\w+)(?::\?[^}]*|:-([^}]*))?\}/g,
    (_, name: string, fallback: string | undefined) => {
      const value = ENV_FILE_VARIABLES[name] ?? fallback;

      if (value === undefined) {
        throw new Error(`the test does not know the .env variable ${name}`);
      }

      return value;
    },
  );
}

function readApiService(): {
  environment: NodeJS.ProcessEnv;
  ports: string[];
  healthcheckTest: string[];
  healthcheckIntervalMs: number;
  healthcheckTimeoutMs: number;
} {
  const compose: unknown = parse(
    readFileSync(new URL("../../../compose.yaml", import.meta.url), "utf8"),
  );
  const services = isRecord(compose) ? compose["services"] : undefined;
  const api = isRecord(services) ? services["api"] : undefined;
  const environment = isRecord(api) ? api["environment"] : undefined;
  const ports = isRecord(api) ? api["ports"] : undefined;
  const healthcheck = isRecord(api) ? api["healthcheck"] : undefined;
  const healthcheckTest = isRecord(healthcheck)
    ? healthcheck["test"]
    : undefined;

  const interval = isRecord(healthcheck) ? healthcheck["interval"] : undefined;
  const timeout = isRecord(healthcheck) ? healthcheck["timeout"] : undefined;

  if (
    !isRecord(environment) ||
    !Array.isArray(ports) ||
    !Array.isArray(healthcheckTest) ||
    typeof interval !== "string" ||
    typeof timeout !== "string"
  ) {
    throw new Error(
      "compose.yaml declares no environment, ports or healthcheck for api",
    );
  }

  return {
    environment: Object.fromEntries(
      Object.entries(environment).map(([name, value]) => [
        name,
        resolve(String(value)),
      ]),
    ),
    ports: ports.map((port) => resolve(String(port))),
    healthcheckTest: healthcheckTest.map(String),
    healthcheckIntervalMs: readSeconds(interval),
    healthcheckTimeoutMs: readSeconds(timeout),
  };
}

function readSeconds(duration: string): number {
  const seconds = /^(\d+)s$/.exec(duration)?.[1];

  if (seconds === undefined) {
    throw new Error(`the healthcheck duration ${duration} is not in seconds`);
  }

  return Number(seconds) * 1000;
}

describe("the api service of the compose", () => {
  const {
    environment,
    ports,
    healthcheckTest,
    healthcheckIntervalMs,
    healthcheckTimeoutMs,
  } = readApiService();

  it("gives Settings every variable it requires, with the database reached as db", () => {
    const settings = Settings.fromEnv(environment);

    expect(settings.databaseUrl).toBe(
      "postgres://ticket:secret@db:5432/ticketdesk",
    );
  });

  it("makes the api listen on every interface and publishes that port at the address and port of the .env", () => {
    const settings = Settings.fromEnv(environment);
    const [publishedAddress, publishedPort, containerPort] = (
      ports[0] ?? ""
    ).split(":");

    expect(ports).toHaveLength(1);
    expect(settings.apiHost).toBe("0.0.0.0");
    expect([publishedAddress, publishedPort, containerPort]).toEqual([
      "127.0.0.1",
      "8080",
      String(settings.apiPort),
    ]);
  });

  it("repasses LOG_LEVEL, empty when the .env has none, which Settings reads as info", () => {
    expect(environment).toHaveProperty("LOG_LEVEL", "");
    expect(Settings.fromEnv(environment).logLevel).toBe("info");
  });

  it("nests the deadlines: the readiness answers inside the healthcheck timeout, which fits in the interval, which outlasts the pool timeouts", () => {
    expect(READINESS_DEADLINE_MS).toBeLessThan(healthcheckTimeoutMs);
    expect(healthcheckTimeoutMs).toBeLessThanOrEqual(healthcheckIntervalMs);
    expect(CONNECTION_TIMEOUT_MS).toBeLessThanOrEqual(QUERY_TIMEOUT_MS);
    expect(QUERY_TIMEOUT_MS).toBeLessThanOrEqual(healthcheckIntervalMs);
  });

  it("runs a healthcheck that exits 0 when the api answers ready and 1 when the database does not answer", async () => {
    const [kind, , ...nodeArguments] = healthcheckTest;
    const upPool = createPgPool(await createMigratedTestDatabase());
    const closedPool = createPgPool(await createMigratedTestDatabase());

    await closedPool.end();

    expect(kind).toBe("CMD");

    for (const [pgPool, exitCode] of [
      [upPool, 0],
      [closedPool, 1],
    ] as const) {
      const server = buildServer({
        container: buildContainer({
          now: () => new Date(),
          storage: new PgStorage(pgPool),
        }),
        webDistDir: null,
        logger: { level: "silent" },
      });

      await server.listen({ host: LOOPBACK_ADDRESS, port: 0 });

      const address = server.addresses()[0];

      try {
        const result = await runNode(nodeArguments, {
          API_PORT: String(address?.port),
        });

        expect(result).toBe(exitCode);
      } finally {
        await server.close();
      }
    }

    await upPool.end();
  });
});

async function runNode(
  nodeArguments: string[],
  env: Record<string, string>,
): Promise<number> {
  return await new Promise((resolveExit) => {
    execFile(process.execPath, nodeArguments, { env }, (error) => {
      resolveExit(
        error === null ? 0 : typeof error.code === "number" ? error.code : -1,
      );
    });
  });
}
