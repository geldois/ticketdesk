import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { Settings } from "../src/config/settings.ts";

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
  return text.replace(/\$\{(\w+)(?::\?[^}]*)?\}/g, (_, name: string) => {
    const value = ENV_FILE_VARIABLES[name];

    if (value === undefined) {
      throw new Error(`the test does not know the .env variable ${name}`);
    }

    return value;
  });
}

function readApiService(): { environment: NodeJS.ProcessEnv; ports: string[] } {
  const compose: unknown = parse(
    readFileSync(new URL("../../../compose.yaml", import.meta.url), "utf8"),
  );
  const services = isRecord(compose) ? compose["services"] : undefined;
  const api = isRecord(services) ? services["api"] : undefined;
  const environment = isRecord(api) ? api["environment"] : undefined;
  const ports = isRecord(api) ? api["ports"] : undefined;

  if (!isRecord(environment) || !Array.isArray(ports)) {
    throw new Error("compose.yaml declares no environment or ports for api");
  }

  return {
    environment: Object.fromEntries(
      Object.entries(environment).map(([name, value]) => [
        name,
        resolve(String(value)),
      ]),
    ),
    ports: ports.map((port) => resolve(String(port))),
  };
}

describe("the api service of the compose", () => {
  const { environment, ports } = readApiService();

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
});
