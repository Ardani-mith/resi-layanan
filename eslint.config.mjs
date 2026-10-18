import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      // Satu grup tanpa baris kosong, diurutkan per jenis lalu alfabet:
      // side-effect ("server-only", CSS) → node: → paket → alias @/ → relatif.
      "simple-import-sort/imports": ["error", { groups: [["^\\u0000", "^node:", "^@?\\w", "^@/", "^\\."]] }],
      "simple-import-sort/exports": "error",
    },
  },
  {
    // Fixture Playwright memakai fungsi bernama `use` (bukan hook React).
    files: ["e2e/**"],
    rules: { "react-hooks/rules-of-hooks": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".next-*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
