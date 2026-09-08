// Shared ESLint rule defaults re-used by apps/api and apps/web so both
// workspaces enforce the same baseline (strict TS, no unused vars, no
// implicit any) without duplicating config.
export const baseRules = {
  "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
  "@typescript-eslint/no-explicit-any": "warn",
  "no-console": ["warn", { allow: ["warn", "error", "info"] }],
};
