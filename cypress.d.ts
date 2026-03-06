declare namespace Cypress {
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

declare const cy: Cypress.cy & Cypress.Chainable<any>;
declare const describe: typeof Mocha.describe;
declare const it: typeof Mocha.it;
declare const beforeEach: typeof Mocha.beforeEach;
declare const afterEach: typeof Mocha.afterEach;
declare const before: typeof Mocha.before;
declare const after: typeof Mocha.after;

namespace Mocha {
  interface TestContext {}
}

declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function beforeEach(fn: () => void): void;
declare function afterEach(fn: () => void): void;
declare function before(fn: () => void): void;
declare function after(fn: () => void): void;
