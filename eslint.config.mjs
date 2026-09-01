import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Modo local (ver src/lib/local/): localStorage no existe en el server,
    // así que cada página hidrata su estado desde el navegador recién
    // después del montaje. Ese "leer el store externo en un efecto y
    // volcarlo a useState" es exactamente el caso de uso que la regla
    // permite (ver su propio mensaje: "Subscribe for updates from some
    // external system"), no un bug a corregir.
    files: ["src/app/**/*.tsx", "src/lib/local/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
