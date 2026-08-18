import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // External API payloads (DataForSEO, Places, etc.) are loosely-typed
      // by design; a blanket `any` ban adds noise for integration boundaries.
      "@typescript-eslint/no-explicit-any": "off",
      // Copy uses apostrophes, curly quotes, and em dashes throughout.
      "react/no-unescaped-entities": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "supabase/**",
  ]),
]);

export default eslintConfig;
