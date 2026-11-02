export class InvalidSettingsError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(problems.join(", "));

    this.problems = problems;
  }
}
