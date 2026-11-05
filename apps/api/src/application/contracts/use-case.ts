import type { UoW } from "./uow.ts";

export abstract class UseCase {
  abstract execute(...input: never[]): Promise<unknown>;
}

export abstract class UoWUseCase extends UseCase {
  protected readonly uowFactory: () => Promise<UoW>;

  constructor(uowFactory: () => Promise<UoW>) {
    super();

    this.uowFactory = uowFactory;
  }
}
