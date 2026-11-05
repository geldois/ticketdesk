import type { UoW } from "./uow.ts";

export abstract class UseCase {
  protected readonly uowFactory: () => Promise<UoW>;

  constructor(uowFactory: () => Promise<UoW>) {
    this.uowFactory = uowFactory;
  }
}
