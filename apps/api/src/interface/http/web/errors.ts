export class InvalidWebDistDirError extends Error {
  readonly webDistDir: string;

  constructor(webDistDir: string) {
    super(
      `web dist directory "${webDistDir}" is not a directory, run \`npm run build\` first`,
    );

    this.webDistDir = webDistDir;
  }
}
