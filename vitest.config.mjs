import path from "node:path";
import { defineConfig } from "vitest/config";

// Deux familles de tests :
//  - unit : fonctions isolées, rapides, sans base ni serveur (npm run test:unit)
//  - e2e  : le vrai site, construit et lancé sur une base de test dédiée (npm test)
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.mjs"], environment: "node" },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["tests/e2e/**/*.test.mjs"],
          environment: "node",
          globalSetup: ["tests/e2e/preparation.mjs"],
          // Un seul serveur et une seule base : les fichiers s'exécutent l'un après l'autre
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
