/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      register(user: any): Chainable<void>;
      setupAuth(auth: any): Chainable<void>;
      getAuthToken(): Chainable<string>;
      clearAuth(): Chainable<void>;
      visitProtected(path: string, email: string, password: string): Chainable<void>;
      fillForm(data: any): Chainable<void>;
      waitForAPI(endpoint: string): Chainable<void>;
      isAuthenticated(): Chainable<boolean>;
      logout(): Chainable<void>;
      verifyToast(message: string): Chainable<void>;
      uniqueEmail(prefix: string): Chainable<string>;
    }
  }
}

export {};
