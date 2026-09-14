import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Next 16 removed `next lint`; this flat config is what `eslint .` reads.
// Named const (not an inline array) to satisfy import/no-anonymous-default-export.
const config = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "node_modules/**", "screenshots/**", "docs/**", "logs/**", "audio/**", "images/**", "public/**"],
  },
  {
    rules: {
      // `_name` is this codebase's marker for a parameter kept only to satisfy an
      // interface signature (e.g. SetPiece.build(scene, tier) in EnergyOrb).
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }],
    },
  },
];

export default config;
