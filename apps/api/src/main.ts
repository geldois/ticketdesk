import { buildContainer } from "./config/container.ts";
import { createPgPool } from "./infrastructure/pool.ts";
import { Settings } from "./config/settings.ts";
import { buildServer } from "./interface/http/server.ts";

let settings: Settings;

try {
  settings = Settings.fromEnv();
} catch (error) {
  console.error(error);

  process.exit(1);
}

const pgPool = createPgPool(settings.databaseUrl);
const container = buildContainer({ now: () => new Date(), pgPool });
const server = buildServer(container);

try {
  await server.listen({ host: settings.apiHost, port: settings.apiPort });
} catch (error) {
  await pgPool.end();

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
    await pgPool.end();
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
