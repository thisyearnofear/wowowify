import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Single source of truth for ALL linting rules. The legacy .eslintrc.json
// was redundant — eliminated. Rules below are the explicit overrides:
//   react/no-unescaped-entities: we author plenty of apostrophes/quotes in JSX
//   @typescript-eslint/no-explicit-any: warn (gradual adoption, not error)
//   @typescript-eslint/no-unused-vars: warn (preserved historic level)
//   prefer-const: warn (preserved historic level)
const eslintConfig = [
  ...compat.extends(
    "next/core-web-vitals",
    "next/typescript",
    "plugin:@typescript-eslint/recommended",
  ),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-const": "warn",
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "build/**",
      "scripts/**/*.js",
    ],
  },
];

export default eslintConfig;
