import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import prettier from "eslint-config-prettier/flat";
import { defineConfig } from "eslint/config";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

export default defineConfig([
  { ignores: [".cache"] },
  { linterOptions: { reportUnusedDisableDirectives: "error" } },
  {
    files: ["**/*.{js,ts}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      eqeqeq: "error",
      "no-implicit-coercion": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
    },
  },
  {
    files: ["apps/api/src/domain/**/*.ts"],
    plugins: { "import-x": importX },
    rules: {
      "import-x/no-nodejs-modules": "error",
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./apps/api/src/domain/**/!(*.test).ts",
              from: "./apps/api/src",
              except: ["./domain"],
              message: "The domain imports nothing from outside itself.",
            },
            {
              target: "./apps/api/src/domain/**/!(*.test).ts",
              from: "./node_modules",
              message: "The domain imports nothing from outside itself.",
            },
          ],
        },
      ],
    },
  },
  { files: ["**/*.js"], extends: [tseslint.configs.disableTypeChecked] },
  { files: ["**/*.test.ts"], extends: [vitest.configs.recommended] },
  prettier,
]);
