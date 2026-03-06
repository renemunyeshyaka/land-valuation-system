// @ts-nocheck

/**
 * CUSTOM CYPRESS COMMANDS
 * Reusable helper commands for common test actions
 */

/**
 * Login as a user
 * Usage: cy.login('email@example.com', 'password123')
 */
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/auth/login');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

/**
 * Register a new user
 * Usage: cy.register({email, password, firstName, lastName, userType})
 */
Cypress.Commands.add(
  'register',
  (user: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    userType?: string;
  }) => {
    cy.visit('/auth/register');
    cy.get('input[type="email"]').type(user.email);
    cy.get('input[name*="password" i]').first().type(user.password);
    cy.get('input[name*="first" i]').type(user.firstName);
    cy.get('input[name*="last" i]').type(user.lastName);
    if (user.userType) {
      cy.get('select').select(user.userType);
    }
    cy.get('button[type="submit"]').click();
  }
);

/**
 * Setup authenticated session
 * Usage: cy.setupAuth({token, user})
 */
Cypress.Commands.add(
  'setupAuth',
  (auth: { token: string; user: Record<string, any> }) => {
    cy.window().then((win) => {
      win.localStorage.setItem('access_token', auth.token);
      win.localStorage.setItem('user', JSON.stringify(auth.user));
    });
  }
);

/**
 * Get current localStorage auth token
 * Usage: cy.getAuthToken().then(token => {...})
 */
Cypress.Commands.add('getAuthToken', () => {
  return cy.window().then((win) => win.localStorage.getItem('access_token'));
});

/**
 * Clear all auth data
 * Usage: cy.clearAuth()
 */
Cypress.Commands.add('clearAuth', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('access_token');
    win.localStorage.removeItem('refresh_token');
    win.localStorage.removeItem('user');
  });
});

/**
 * Visit a protected page (logs in first if not authenticated)
 * Usage: cy.visitProtected('/dashboard', 'email@example.com', 'password')
 */
Cypress.Commands.add(
  'visitProtected',
  (path: string, email: string, password: string) => {
    // First check if already authenticated
    cy.window().then((win) => {
      const token = win.localStorage.getItem('access_token');
      if (token) {
        cy.visit(path);
      } else {
        cy.login(email, password);
        cy.visit(path);
      }
    });
  }
);

/**
 * Fill and submit a form
 * Usage: cy.fillForm({email: 'test@example.com', password: 'pass'})
 */
Cypress.Commands.add(
  'fillForm',
  (data: Record<string, string>) => {
    Object.entries(data).forEach(([key, value]) => {
      cy.get(`input[name*="${key}" i], input[type*="${key}" i]`).type(value);
    });
  }
);

/**
 * Wait for API response
 * Usage: cy.waitForAPI('/api/v1/users/profile')
 */
Cypress.Commands.add('waitForAPI', (endpoint: string) => {
  return cy.intercept(endpoint).as('apiCall');
});

/**
 * Check if user is authenticated
 * Usage: cy.isAuthenticated().then(isAuth => {...})
 */
Cypress.Commands.add('isAuthenticated', () => {
  return cy.window().then((win) => {
    return !!win.localStorage.getItem('access_token');
  });
});

/**
 * Logout user
 * Usage: cy.logout()
 */
Cypress.Commands.add('logout', () => {
  cy.contains(/logout|sign out/i).click({ force: true });
});

/**
 * Verify toast notification
 * Usage: cy.verifyToast('success message')
 */
Cypress.Commands.add('verifyToast', (message: string) => {
  cy.contains(message).should('be.visible');
});

/**
 * Create a unique test email
 * Usage: cy.uniqueEmail() or cy.uniqueEmail('prefix')
 */
Cypress.Commands.add('uniqueEmail', (prefix = 'test') => {
  return `${prefix}+${Date.now()}@example.com`;
});

// TypeScript definitions for custom commands
declare namespace Cypress {
  interface Chainable {
    login(email: string, password: string): Chainable<void>;
    register(user: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      userType?: string;
    }): Chainable<void>;
    setupAuth(auth: { token: string; user: Record<string, any> }): Chainable<void>;
    getAuthToken(): Chainable<string | null>;
    clearAuth(): Chainable<void>;
    visitProtected(
      path: string,
      email: string,
      password: string
    ): Chainable<void>;
    fillForm(data: Record<string, string>): Chainable<void>;
    waitForAPI(endpoint: string): Chainable<void>;
    isAuthenticated(): Chainable<boolean>;
    logout(): Chainable<void>;
    verifyToast(message: string): Chainable<void>;
    uniqueEmail(prefix?: string): Chainable<string>;
  }
}

export {};
