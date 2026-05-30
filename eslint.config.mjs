import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

export default [
  {
    // Artefatos de build e exportação — não devem ser lintados.
    ignores: [
      "android/**",
      "out/**",
      ".next/**",
      "node_modules/**",
      "public/**",
      "reports/**",
    ],
  },
  ...nextCoreWebVitals,
  {
    rules: {
      // Padrões intencionais (init de estado/tema e fetch no mount). São
      // avisos de performance do react-compiler, não erros que quebram o app.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
];