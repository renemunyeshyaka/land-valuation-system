/// <reference types="cypress" />

// Subscription and Payment Flow Test — PesaPal / PayPal
// Uses cy.request for auth setup to avoid UI login complexity,
// then tests the checkout UI and payment provider redirects.

describe('Subscription and Payment Flow', () => {
  // Set up authentication via API before each test
  function setupAuth() {
    const TEST_EMAIL = Cypress.env('TEST_EMAIL');
    const TEST_PASSWORD = Cypress.env('TEST_PASSWORD');
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      throw new Error('Cypress env vars TEST_EMAIL and TEST_PASSWORD must be set. See cypress.env.example.json');
    }

    // First trigger OTP send by attempting login
    cy.request({
      method: 'POST',
      url: `${Cypress.env('API_URL') || 'http://localhost:5001'}/api/v1/auth/login`,
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    });

    // Set OTP code in database
    const DB_PASSWORD = Cypress.env('DB_PASSWORD');
    const DB_USER = Cypress.env('DB_USER');
    const DB_NAME = Cypress.env('DB_NAME');
    if (DB_PASSWORD && DB_USER && DB_NAME) {
      cy.exec(`PGPASSWORD=${DB_PASSWORD} psql -U ${DB_USER} -d ${DB_NAME} -h localhost -c "UPDATE users SET otp_code='123456', otp_expires_at=now()+'1 hour'::interval, otp_attempts=0 WHERE email='${TEST_EMAIL}';"`, { failOnNonZeroExit: false });
    }

    // Verify OTP and get tokens
    cy.request({
      method: 'POST',
      url: `${Cypress.env('API_URL') || 'http://localhost:5001'}/api/v1/auth/verify-otp`,
      body: { email: TEST_EMAIL, otp: '123456', code: '123456' },
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    }).then((resp) => {
      const data = resp.body?.data;
      const token = data?.access_token || data?.token || '';
      if (token) {
        cy.window().then((win) => {
          win.localStorage.setItem('access_token', token);
          if (data.refresh_token) {
            win.localStorage.setItem('refresh_token', data.refresh_token);
          }
          win.localStorage.setItem('user', JSON.stringify(data.user || {}));
        });
      }
    });

    // Visit dashboard to warm up session
    cy.visit('/dashboard', { timeout: 30000 });
    cy.url({ timeout: 15000 }).should('include', '/dashboard');
  }

  it('should select PesaPal and redirect to PesaPal checkout', () => {
    cy.intercept('POST', '**/api/v1/subscriptions/upgrade', {
      statusCode: 200,
      body: { success: true, message: 'Subscription upgraded' },
    }).as('upgradeSubscription');

    cy.intercept('POST', '**/api/v1/payments/pesapal/initiate', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          success: true,
          redirect_url: 'https://sandbox.pesapal.com/checkout?token=mock-test',
          provider_ref: 'mock-order-123',
          payment_method: 'pesapal',
        },
        message: 'Payment initiated',
      },
    }).as('pesapalInitiate');

    setupAuth();

    cy.visit('/subscription/checkout?plan=basic&billing=monthly', { timeout: 30000 });
    cy.url({ timeout: 10000 }).should('include', '/subscription/checkout');

    // Wait for page to hydrate — look for the heading
    cy.contains('h1', 'Complete Your Subscription', { timeout: 15000 }).should('be.visible');

    // PesaPal should be default selected
    cy.contains('button', 'PesaPal', { timeout: 5000 }).should('be.visible');
    cy.get('input[type="checkbox"]#terms').check();
    cy.get('button[type="submit"]').contains('Pay').click();

    cy.wait('@upgradeSubscription', { timeout: 15000 });
    cy.wait('@pesapalInitiate', { timeout: 15000 });

    // Should redirect to PesaPal
    cy.url({ timeout: 10000 }).should('include', 'sandbox.pesapal.com');
  });

  it('should select PayPal and redirect to PayPal checkout', () => {
    cy.intercept('POST', '**/api/v1/subscriptions/upgrade', {
      statusCode: 200,
      body: { success: true, message: 'Subscription upgraded' },
    }).as('upgradeSubscription');

    cy.intercept('POST', '**/api/v1/payments/paypal/initiate', {
      statusCode: 201,
      body: {
        success: true,
        data: {
          success: true,
          redirect_url: 'https://www.sandbox.paypal.com/checkoutnow?token=mock-order',
          provider_ref: 'PAYPAL-MOCK-123',
          payment_method: 'paypal',
        },
        message: 'Payment initiated',
      },
    }).as('paypalInitiate');

    setupAuth();

    cy.visit('/subscription/checkout?plan=basic&billing=monthly', { timeout: 30000 });
    cy.url({ timeout: 10000 }).should('include', '/subscription/checkout');

    // Wait for page to hydrate
    cy.contains('h1', 'Complete Your Subscription', { timeout: 15000 }).should('be.visible');

    cy.contains('button', 'PayPal', { timeout: 5000 }).should('be.visible').click();
    cy.get('input[type="checkbox"]#terms').check();
    cy.get('button[type="submit"]').contains('Pay').click();

    cy.wait('@upgradeSubscription', { timeout: 15000 });
    cy.wait('@paypalInitiate', { timeout: 15000 });

    // Should redirect to PayPal
    cy.url({ timeout: 10000 }).should('include', 'sandbox.paypal.com');
  });

  it('disables Pay button without terms agreement', () => {
    setupAuth();

    cy.visit('/subscription/checkout?plan=basic&billing=monthly', { timeout: 30000 });
    cy.contains('h1', 'Complete Your Subscription', { timeout: 15000 }).should('be.visible');
    cy.get('input[type="checkbox"]#terms').should('not.be.checked');
    cy.get('button[type="submit"]').contains('Pay').should('be.disabled');
  });
});

