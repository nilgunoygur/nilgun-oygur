import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Plain <img> is the project default; next/image only where it is truly needed.
  { rules: { "@next/next/no-img-element": "off" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The tablecn data table, kept as installed from its registry.
    "components/data-table/**",
    "components/ui/faceted.tsx",
    "hooks/use-debounced-callback.ts",
    "lib/data-table-*.ts",
  ]),
]);

export default eslintConfig;
