import { describe, expect, it } from "vitest";

import { InvalidSettingsError } from "./errors.ts";
import { Settings } from "./settings.ts";

const DATABASE_ENV = {
  PGHOST: "127.0.0.1",
  PGPORT: "55432",
  PGUSER: "postgres",
  PGPASSWORD: "secret",
  PGDATABASE: "ticketdesk",
};

function problemsOf(env: NodeJS.ProcessEnv): readonly string[] {
  try {
    Settings.fromEnv(env);
  } catch (error) {
    if (error instanceof InvalidSettingsError) {
      return error.problems;
    }

    throw error;
  }

  return [];
}

describe("Settings.fromEnv", () => {
  it("builds the database url from the five PG variables", () => {
    expect(Settings.fromEnv(DATABASE_ENV).databaseUrl).toBe(
      "postgres://postgres:secret@127.0.0.1:55432/ticketdesk",
    );
  });

  it("percent-encodes a password with reserved characters", () => {
    const settings = Settings.fromEnv({ ...DATABASE_ENV, PGPASSWORD: "p@s/s" });

    expect(settings.databaseUrl).toBe(
      "postgres://postgres:p%40s%2Fs@127.0.0.1:55432/ticketdesk",
    );
  });

  it("listens on 127.0.0.1:3000 unless API_HOST and API_PORT say otherwise", () => {
    const defaults = Settings.fromEnv(DATABASE_ENV);
    const overridden = Settings.fromEnv({
      ...DATABASE_ENV,
      API_HOST: "0.0.0.0",
      API_PORT: "8080",
    });

    expect([defaults.apiHost, defaults.apiPort]).toEqual(["127.0.0.1", 3000]);
    expect([overridden.apiHost, overridden.apiPort]).toEqual(["0.0.0.0", 8080]);
  });

  it("ignores HOST and PORT, which other tools export", () => {
    const settings = Settings.fromEnv({
      ...DATABASE_ENV,
      HOST: "0.0.0.0",
      PORT: "8080",
    });

    expect([settings.apiHost, settings.apiPort]).toEqual(["127.0.0.1", 3000]);
  });

  it.each(Object.keys(DATABASE_ENV))(
    "throws naming %s when it is missing or empty",
    (name) => {
      const absent = Object.fromEntries(
        Object.entries(DATABASE_ENV).filter(([key]) => key !== name),
      );

      expect(problemsOf(absent)).toEqual([`missing ${name}`]);
      expect(problemsOf({ ...DATABASE_ENV, [name]: "" })).toEqual([
        `missing ${name}`,
      ]);
    },
  );

  it("names every missing variable in one error, in the order of the list", () => {
    expect(problemsOf({ PGUSER: "postgres" })).toEqual([
      "missing PGHOST, PGPORT, PGPASSWORD, PGDATABASE",
    ]);
  });

  it.each(["abc", "0", "65536", "-1", "80.5", " 80"])(
    "throws when PGPORT or API_PORT is %j",
    (value) => {
      expect(problemsOf({ ...DATABASE_ENV, PGPORT: value })).toEqual([
        "PGPORT must be an integer from 1 to 65535",
      ]);
      expect(problemsOf({ ...DATABASE_ENV, API_PORT: value })).toEqual([
        "API_PORT must be an integer from 1 to 65535",
      ]);
    },
  );

  it("reports a missing variable and an invalid port together", () => {
    expect(problemsOf({ ...DATABASE_ENV, PGHOST: "", API_PORT: "x" })).toEqual([
      "missing PGHOST",
      "API_PORT must be an integer from 1 to 65535",
    ]);
  });
});
