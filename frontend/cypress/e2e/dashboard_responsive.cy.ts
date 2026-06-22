const breakpoints = [
  { name: 'mobile', width: 375, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 900 },
  { name: 'wide', width: 1440, height: 900 },
];

function installAuthStubs(user: Record<string, any>) {
  cy.intercept('GET', '**/api/auth/session*', { statusCode: 200, body: null }).as('nextAuthSession');
  cy.intercept('GET', '**/api/v1/users/profile*', {
    statusCode: 200,
    body: { data: user },
  }).as('profile');
  cy.intercept('GET', '**/api/v1/users/me', {
    statusCode: 200,
    body: { data: user },
  }).as('userMe');
  cy.intercept('GET', '**/api/v1/users/notifications*', {
    statusCode: 200,
    body: { data: [] },
  }).as('notifications');
  cy.intercept('GET', '**/api/v1/dashboard/*', {
    statusCode: 200,
    body: { data: { properties: [], total: 0 } },
  }).as('dashboardApi');
  cy.intercept('GET', '**/api/v1/properties*', {
    statusCode: 200,
    body: { data: { properties: [], total: 0 } },
  }).as('propertiesApi');
  cy.intercept('GET', '**/api/v1/admin/users*', {
    statusCode: 200,
    body: { data: { total: 0, items: [] } },
  }).as('adminUsers');
  cy.intercept('GET', '**/api/v1/admin/properties*', {
    statusCode: 200,
    body: { data: { total: 0, items: [] } },
  }).as('adminProperties');
  cy.intercept('GET', '**/api/v1/admin/subscriptions*', {
    statusCode: 200,
    body: { data: { total: 0, items: [] } },
  }).as('adminSubscriptions');
  cy.intercept('GET', '**/api/v1/admin/analytics/revenue*', {
    statusCode: 200,
    body: { data: { total_revenue: 0 } },
  }).as('adminRevenue');
}

function visitWithAuth(path: string, user: Record<string, any>) {
  installAuthStubs(user);

  cy.visit(path, {
    timeout: 120000,
    onBeforeLoad(win) {
      win.localStorage.setItem('access_token', 'test-token');
      win.localStorage.setItem('refresh_token', 'test-refresh');
      win.localStorage.setItem('user', JSON.stringify(user));
    },
  });
}

function expectNoHorizontalOverflow() {
  cy.window().then((win) => {
    const doc = win.document.documentElement;
    expect(doc.scrollWidth, 'document scroll width').to.be.lte(doc.clientWidth + 1);
  });
}

describe('Dashboard responsiveness', () => {
  beforeEach(() => {
    cy.clearLocalStorage();
    cy.on('uncaught:exception', (err) => {
      if (String(err?.message || '').includes('attempted to hard navigate to the same URL')) {
        return false;
      }
      return true;
    });
  });

  breakpoints.forEach((breakpoint) => {
    it(`keeps the user dashboard responsive at ${breakpoint.name} (${breakpoint.width}px)`, () => {
      cy.viewport(breakpoint.width, breakpoint.height);
      visitWithAuth('/dashboard', {
        id: 1,
        first_name: 'Test',
        last_name: 'User',
        email: 'user@example.com',
        user_type: 'individual',
        subscription_tier: 'free',
      });

      cy.get('body', { timeout: 15000 }).should('not.contain', 'Loading your dashboard...');

      expectNoHorizontalOverflow();

      if (breakpoint.width < 1024) {
        cy.get('[aria-label="Toggle dashboard menu"]').should('be.visible');
        cy.get('[aria-label="Toggle dashboard menu"]').click();
        cy.get('a:visible').contains('View Profile').should('be.visible');
      } else {
        cy.get('a:visible').contains('View Profile').should('be.visible');
      }
    });

    it(`keeps the admin dashboard responsive at ${breakpoint.name} (${breakpoint.width}px)`, () => {
      cy.viewport(breakpoint.width, breakpoint.height);
      visitWithAuth('/admin/dashboard?tab=overview', {
        id: 2,
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@example.com',
        user_type: 'admin',
      });

      cy.get('main h1').contains('Dashboard').should('be.visible');
      expectNoHorizontalOverflow();

      if (breakpoint.width < 1024) {
        cy.get('[aria-label="Open admin menu"]').should('be.visible');
        cy.get('[aria-label="Open admin menu"]').click({ force: true });
        cy.get('aside.fixed.top-0.left-0').should('exist');
      } else {
        cy.get('.admin-sidebar').should('be.visible');
      }
    });

    it(`keeps the partner dashboard responsive at ${breakpoint.name} (${breakpoint.width}px)`, () => {
      cy.viewport(breakpoint.width, breakpoint.height);
      visitWithAuth('/partner/dashboard?tab=overview', {
        id: 3,
        first_name: 'Gov',
        last_name: 'Partner',
        email: 'partner@example.com',
        user_type: 'government',
      });

      cy.contains('Government / Partner Dashboard', { timeout: 15000 }).should('be.visible');
      expectNoHorizontalOverflow();

      if (breakpoint.width < 768) {
        cy.get('[aria-label="Toggle partner menu"]').should('be.visible');
        cy.get('[aria-label="Toggle partner menu"]').click({ force: true });
        cy.get('[data-testid="partner-nav-overview"]').should('exist');
      } else {
        cy.get('aside').first().should('be.visible');
      }
    });
  });
});
