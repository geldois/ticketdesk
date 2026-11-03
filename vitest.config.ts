import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: ".cache/vitest",
  test: {
    globalSetup: ["apps/api/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["apps/*/src/**", "packages/*/src/**"],
      exclude: ["**/*.test.ts", "apps/api/src/main.ts"],
      reporter: ["text"],
      reportsDirectory: ".cache/coverage",
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
