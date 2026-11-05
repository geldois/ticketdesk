import { buildContainer } from "./config/container.ts";
import { createPgStorage } from "./infrastructure/pg-storage.ts";
import { Settings } from "./config/settings.ts";
import { buildServer } from "./interface/http/server.ts";

let settings: Settings;

try {
  settings = Settings.fromEnv();
} catch (error) {
  console.error(error);

  process.exit(1);
}

const storage = createPgStorage(settings.databaseUrl);
const container = buildContainer({ now: () => new Date(), storage });
const server = buildServer({
  container,
  webDistDir: settings.webDistDir,
  logger: { level: settings.logLevel },
});

try {
  await server.listen({ host: settings.apiHost, port: settings.apiPort });
} catch (error) {
  await storage.close();

  console.error(error);

  process.exit(1);
}

let closing = false;

async function shutdown(): Promise<void> {
  if (closing) {
    return;
  }

  closing = true;

  try {
    await server.close();
    await storage.close();
  } catch (error) {
    console.error(error);

    process.exit(1);
  }

  process.exit(0);
}

process.once("SIGTERM", () => {
  void shutdown();
});
process.once("SIGINT", () => {
  void shutdown();
});
