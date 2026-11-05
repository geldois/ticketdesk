import type { ReadinessProbe } from "../contracts/probes/readiness-probe.ts";

export class CheckReadinessUseCase {
  readonly #readinessProbe: ReadinessProbe;

  constructor(readinessProbe: ReadinessProbe) {
    this.#readinessProbe = readinessProbe;
  }

  async execute(): Promise<boolean> {
    return await this.#readinessProbe.isReady();
  }
}
