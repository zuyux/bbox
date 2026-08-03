import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [".next/**", ".source/**", "node_modules/**", "out/**", "dist/**"],
  },
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // Keep the pre-upgrade lint baseline while adopting Next 16's flat config.
      // These React Compiler diagnostics can be enabled in a dedicated cleanup.
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];

export default eslintConfig;
