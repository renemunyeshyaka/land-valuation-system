const breakpoints = [
  { name: 'mobile', width: 375, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1024, height: 900 },
  { name: 'wide', width: 1440, height: 900 },
];

const apiBasePattern = '**/api/v1/**';

function installAuthStubs(user: Record<string, any>) {
  cy.intercept('GET', '**/api/auth/session*', { statusCode: 200, body: null }).as('nextAuthSession');
  cy.intercept('GET', `${apiBasePattern}users/profile`, (req) => {
    req.reply({ statusCode: 200, body: { data: user } });
  }).as('profile');
  cy.intercept('GET', `${apiBasePattern}users/notifications*`, (req) => {
    req.reply({ statusCode: 200, body: { data: [] } });
  }).as('notifications');
  cy.intercept('GET', `${apiBasePattern}admin/users*`, (req) => {
    req.reply({ statusCode: 200, body: { data: { total: 0, items: [] } } });
  }).as('adminUsers');
  cy.intercept('GET', `${apiBasePattern}admin/properties*`, (req) => {
    req.reply({ statusCode: 200, body: { data: { total: 0, items: [] } } });
  }).as('adminProperties');
  cy.intercept('GET', `${apiBasePattern}admin/subscriptions*`, (req) => {
    req.reply({ statusCode: 200, body: { data: { total: 0, items: [] } } });
  }).as('adminSubscriptions');
  cy.intercept('GET', `${apiBasePattern}admin/analytics/revenue*`, (req) => {
    req.reply({ statusCode: 200, body: { data: { total_revenue: 0 } } });
  }).as('adminRevenue');
}

function visitWithAuth(path: string, user: Record<string, any>) {
  installAuthStubs(user);

  cy.visit(path, {
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

      expectNoHorizontalOverflow();

      if (breakpoint.width < 1024) {
        cy.get('[aria-label="Toggle dashboard menu"]').should('be.visible');
        cy.get('[aria-label="Toggle dashboard menu"]').click();
        cy.contains('View Profile').should('be.visible');
      } else {
        cy.contains('View Profile').should('be.visible');
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

      cy.contains('Dashboard').should('be.visible');
      expectNoHorizontalOverflow();

      if (breakpoint.width < 1024) {
        cy.get('[aria-label="Open admin menu"]').should('be.visible');
        cy.get('[aria-label="Open admin menu"]').click({ force: true });
        cy.get('aside.fixed.top-0.left-0').should('have.class', 'translate-x-0');
        cy.contains('Switch to Ultimate Dashboard').should('be.visible');
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
        cy.get('[aria-label="Toggle partner menu"]').click();
        cy.get('[data-testid="partner-nav-overview"]').should('be.visible');
      } else {
        cy.get('aside').first().should('be.visible');
      }
    });
  });
});
