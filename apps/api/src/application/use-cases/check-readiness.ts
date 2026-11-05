import type { ReadinessProbe } from "../contracts/probes/readiness-probe.ts";
import { UseCase } from "../contracts/use-case.ts";

export class CheckReadinessUseCase extends UseCase {
  readonly #readinessProbe: ReadinessProbe;

  constructor(readinessProbe: ReadinessProbe) {
    super();

    this.#readinessProbe = readinessProbe;
  }

  async execute(): Promise<boolean> {
    return await this.#readinessProbe.isReady();
  }
}
