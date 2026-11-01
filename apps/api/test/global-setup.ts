import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Client } from "pg";
import type { TestProject } from "vitest/node";

import { migrate } from "../src/infrastructure/migrations.ts";
import { readDatabaseImage } from "./compose-image.ts";
import {
  MIGRATIONS_DIR,
  TEMPLATE_DATABASE_NAME,
  buildDatabaseUrl,
} from "./database.ts";

export default async function setup(
  project: TestProject,
): Promise<() => Promise<void>> {
  const databaseImage = readDatabaseImage();
  const container = await new PostgreSqlContainer(databaseImage).start();
  const containerUrl = container.getConnectionUri();

  const adminClient = new Client({ connectionString: containerUrl });

  await adminClient.connect();
  try {
    await adminClient.query(`CREATE DATABASE ${TEMPLATE_DATABASE_NAME}`);
  } finally {
    await adminClient.end();
  }

  await migrate(
    buildDatabaseUrl(containerUrl, TEMPLATE_DATABASE_NAME),
    MIGRATIONS_DIR,
    "up",
  );

  project.provide("containerUrl", containerUrl);
  project.provide("databaseImage", databaseImage);

  return async () => {
    await container.stop();
  };
}
