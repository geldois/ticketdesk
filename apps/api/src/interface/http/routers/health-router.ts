import type { FastifyInstance } from "fastify";
import type { Container } from "../../../application/contracts/container.ts";
import { NotReadyError } from "../../errors.ts";

export function registerHealthRouter(
  server: FastifyInstance,
  container: Container,
): void {
  const { checkReadinessUseCase } = container.useCases;

  server.get("/health", () => ({ status: "ok" }));

  server.get("/health/ready", async () => {
    if (!(await checkReadinessUseCase.execute())) {
      throw new NotReadyError();
    }

    return { status: "ready" };
  });
}
