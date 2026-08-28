import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "src/data/geo"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended, prettier],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",

      // React Compiler readiness rules. `static-components` stays an error: a
      // component defined inside a render body is a new type on every render,
      // so React remounts its subtree and inputs lose focus mid-typing. The
      // other three flag patterns that behave correctly today and only matter
      // once the compiler is adopted, so they warn instead of blocking.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",

      // `any` erases the type safety `strict: true` is there to give. Warn
      // rather than error so it shows up without blocking a build.
      "@typescript-eslint/no-explicit-any": "warn",

      // Unused args are fine when prefixed with _, which the codebase already
      // uses for ignored map/forEach parameters.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Tests may reach for `any` when building fixtures.
    files: ["**/*.spec.ts", "**/*.spec.tsx"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
);
