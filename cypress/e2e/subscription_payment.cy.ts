/// <reference types="cypress" />

// Subscription and Payment Flow Test

describe('Subscription and Payment Flow', () => {
  beforeEach(() => {
    // Optionally clear cookies/localStorage for a clean state
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should allow a user to login, select a plan, and complete payment', () => {
    // 1. Visit login page and login
    cy.visit('/auth/login');
    cy.get('input[name="email"]').type('testuser@example.com');
    cy.get('input[name="password"]').type('testpassword');
    cy.get('button[type="submit"]').click();

    // 2. Redirect to dashboard and go to subscription page
    cy.url().should('include', '/dashboard');
    cy.visit('/dashboard/subscription');

    // 3. Select a paid plan (e.g., Basic)
    cy.contains('Choose Basic').click();
    cy.url().should('include', '/subscription/checkout');

    // 4. Fill payment details
    cy.get('input[name="phoneNumber"]').type('46733123450'); // MTN sandbox test number
    cy.get('input[type="checkbox"]#terms').check();
    cy.get('button[type="submit"]').contains('Pay').click();

    // 5. Expect payment initiation and success toast
    cy.contains('Payment initiated').should('exist');
    cy.contains('Please check your phone').should('exist');

    // 6. Redirect to dashboard/subscription after payment
    cy.url({ timeout: 10000 }).should('include', '/dashboard/subscription');
  });
});
