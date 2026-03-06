import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    // Default timeout for cy.get() and other commands
    defaultCommandTimeout: 10000,
    // Timeout for page load
    pageLoadTimeout: 30000,
    // Video on failure
    video: true,
    videoOnFailOnly: true,
    // Screenshots on failure
    screenshotOnRunFailure: true,
    // Reporter configuration
    reporter: 'mochawesome',
    reporterOptions: {
      reportDir: 'cypress/reports',
      reportFilename: '[status]_[datetime]',
      timestamp: 'longDate',
    },
    // Environment variables
    env: {
      API_URL: 'http://localhost:5000',
      FRONTEND_URL: 'http://localhost:3000',
    },
    // Setup plugins if needed
    setupNodeEvents(on, config) {
      // You can implement node event listeners here if needed
      // Example: on('task', { verifyEmail: () => { ... } })
      return config;
    },
    // Spec pattern for test files
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    // Ignore pattern
    excludeSpecPattern: '**/node_modules/**',
    // Browser launch arguments (optional - for specific browser config)
    chromeWebSecurity: false,
  },
});
