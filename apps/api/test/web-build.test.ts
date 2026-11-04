import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const BUILD_TIMEOUT_MS = 60_000;

describe("the web build", () => {
  let distDir = "";

  beforeAll(async () => {
    distDir = await mkdtemp(join(tmpdir(), "ticketdesk-web-dist-"));

    await promisify(execFile)(
      "npm",
      ["run", "build", "--silent", "--", "--outDir", distDir, "--emptyOutDir"],
      { cwd: new URL("../../..", import.meta.url) },
    );
  }, BUILD_TIMEOUT_MS);

  afterAll(async () => {
    await rm(distDir, { recursive: true, force: true });
  });

  it("emits an index.html with the root element and a script that exists", () => {
    const html = readFileSync(join(distDir, "index.html"), "utf8");
    const scriptSource = /<script[^>]*\ssrc="([^"]+)"/.exec(html)?.[1];

    expect(html).toContain('<div id="root"></div>');
    expect(scriptSource).toMatch(/^\/assets\/.+\.js$/);
    expect(existsSync(join(distDir, scriptSource ?? ""))).toBe(true);
  });
});
