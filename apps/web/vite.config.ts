import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const API_VARIABLES = ["API_HOST", "API_PORT"] as const;

function readVariable(env: Record<string, string>, name: string): string {
  return env[name] ?? "";
}

export default defineConfig(({ command, mode }) => {
  if (command !== "serve") {
    return { plugins: [react()] };
  }

  const env = loadEnv(mode, new URL("../..", import.meta.url).pathname, "");
  const missing = API_VARIABLES.filter(
    (name) => readVariable(env, name) === "",
  );

  if (missing.length > 0) {
    throw new Error(`missing ${missing.join(", ")}`);
  }

  const apiHost = readVariable(env, "API_HOST");
  const apiPort = readVariable(env, "API_PORT");

  return {
    plugins: [react()],
    server: { proxy: { "/tickets": `http://${apiHost}:${apiPort}` } },
  };
});
