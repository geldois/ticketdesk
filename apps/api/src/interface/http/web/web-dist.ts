import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import fastifyStatic from "@fastify/static";
import type { FastifyInstance } from "fastify";
import { InvalidWebDistDirError } from "./errors.ts";

export function registerWebDist(
  server: FastifyInstance,
  webDistDir: string,
): void {
  server.register(async (instance) => {
    const stats = await stat(webDistDir).catch(() => null);

    if (stats?.isDirectory() !== true) {
      throw new InvalidWebDistDirError(webDistDir);
    }

    await instance.register(fastifyStatic, { root: resolve(webDistDir) });
  });
}
