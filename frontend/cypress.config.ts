// Cypress configuration file moved from project root to frontend directory.
// If you had custom settings, please ensure they are preserved.

import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3001",
    specPattern: "cypress/e2e/**/*.cy.{js,ts}",
    supportFile: "cypress/support/e2e.ts",
  },

  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
});
