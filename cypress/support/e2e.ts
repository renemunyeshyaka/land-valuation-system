// @ts-nocheck

/**
 * CYPRESS SUPPORT CONFIGURATION
 * Shared commands, hooks, and utilities for all E2E tests
 */

// Import Cypress commands
import './commands';

// Global error handling
Cypress.on('uncaught:exception', (err, runnable) => {
  // Return false to prevent test failure on certain errors
  // (adjust based on your application)
  if (
    err.message.includes('ResizeObserver loop completed') ||
    err.message.includes('Unable')
  ) {
    return false;
  }
  return true;
});

// Before each test
beforeEach(() => {
  // Set a reasonable viewport
  cy.viewport(1280, 720);
});

// After each test
afterEach(() => {
  // Clear local storage after each test (optional)
  // cy.window().then((win) => {
  //   win.localStorage.clear();
  // });
});

export {};
