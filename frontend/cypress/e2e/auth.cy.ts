const FRONTEND_URL = Cypress.env('FRONTEND_URL') || 'http://localhost:3001';

describe('International User Registration', () => {
  const users = [
    { country: 'France', phone: '+33612345678' },
    { country: 'Belgium', phone: '+32470123456' },
    { country: 'US', phone: '+14155552671' },
    { country: 'Canada', phone: '+15145551234' },
    { country: 'UK', phone: '+447911123456' },
  ];

  users.forEach(({ country, phone }) => {
    it(`should register user from ${country} with phone ${phone}`, () => {
      const email = `test_${country.toLowerCase()}_${Date.now()}@example.com`;
      cy.visit(`${FRONTEND_URL}/auth/register`);
      cy.get('input[type="email"]').type(email);
      cy.get('input[name*="password" i]').first().type('Test@Password123');
      cy.get('input[name*="first" i]').type(`Test${country}`);
      cy.get('input[name*="last" i]').type('User');
      cy.get('input[name="phone"]').type(phone);
      cy.get('select').select('buyer');
      cy.get('button[type="submit"]').click();
      cy.contains(/success|verification|check email/i, { timeout: 10000 }).should('be.visible');
    });
  });
});
