import type { ReadinessProbe } from "./probes/readiness-probe.ts";
import type { UoW } from "./uow.ts";

export interface Storage extends ReadinessProbe {
  openUnitOfWork(): Promise<UoW>;
  close(): Promise<void>;
}
