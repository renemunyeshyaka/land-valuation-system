import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3001",
    specPattern: "cypress/e2e/**/*.cy.{js,ts}",
    supportFile: "cypress/support/e2e.ts",
    // Retry on failure for flaky tests
    retries: {
      runMode: 1,
      openMode: 0,
    },
    // Default viewport - will be overridden per test
    viewportWidth: 1280,
    viewportHeight: 720,
    // Video recording for debugging failures
    video: false,
    screenshotOnRunFailure: true,
  },

  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
});
