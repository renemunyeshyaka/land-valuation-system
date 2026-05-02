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
// @ts-nocheck
/**
 * AUTHENTICATION E2E TESTS · Land Valuation System
 * 
 * Test Coverage:
 * ✅ User signup with email verification
 * ✅ User login with OTP verification
 * ✅ Access dashboard after authentication
 * ✅ Invalid credentials error handling
 * ✅ Invalid email format rejection
 * ✅ Logout functionality
 * 
 * Prerequisites:
 * - Backend running on http://localhost:5000
 * - Database accessible and seeded
 * - Email service configured (or stubbed)
 */

describe('Land Valuation System - Authentication Flow', () => {
  const API_URL = Cypress.env('API_URL') || 'http://localhost:5000';
  const FRONTEND_URL = Cypress.env('FRONTEND_URL') || 'http://localhost:3000';
  
  // Test user credentials
  const testUser = {
    email: `testuser+${Date.now()}@example.com`,
    password: 'Test@Password123',
    firstName: 'Test',
    lastName: 'User',
    userType: 'individual',
  };

  // Helper function to intercept API calls
  beforeEach(() => {
    // Reset database state (optional - depends on your backend)
    cy.visit(FRONTEND_URL);
    
    // Clear localStorage to start fresh
    cy.window().then((win) => {
      win.localStorage.clear();
    });
  });
          first_name: 'John',
          last_name: 'Doe',
          referral_code: 'REF-12345',
          subscription_tier: 'free',
        }));
      });
      
      cy.visit(`${FRONTEND_URL}/dashboard`);
      
      // Check for referral code section
      cy.contains(/referral/i).should('be.visible');
      cy.contains('REF-12345').should('be.visible');
    });

    it('should allow copying referral code', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', 'mock-token');
        win.localStorage.setItem('user', JSON.stringify({
          id: '1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          referral_code: 'REF-12345',
          subscription_tier: 'free',
        }));
      });
      
      cy.visit(`${FRONTEND_URL}/dashboard`);
      
      // Find and click copy button
      cy.contains(/copy|share/i).click();
      
      // Check for success toast message
      cy.contains(/copied|success/i).should('be.visible');
    });
  });

  describe('Logout', () => {
    it('should logout user and redirect to home page', () => {
      // Set authenticated state
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', 'mock-token');
        win.localStorage.setItem('user', JSON.stringify({
          id: '1',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
        }));
      });
      
      cy.visit(`${FRONTEND_URL}/dashboard`);
      
      // Find logout button (usually in header/navigation)
      cy.contains(/logout|sign out/i).click();
      
      // Should clear tokens and redirect
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.be.null;
      });
      
      // Should redirect to home or login
      cy.url().should('not.include', '/dashboard');
    });

    it('should clear auth tokens on logout', () => {
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', 'mock-token');
        win.localStorage.setItem('user', JSON.stringify({
          id: '1',
          email: 'test@example.com',
        }));
      });
      
      cy.visit(`${FRONTEND_URL}/dashboard`);
      cy.contains(/logout|sign out/i).click();
      
      // Verify tokens are cleared
      cy.window().then((win) => {
        expect(win.localStorage.getItem('access_token')).to.be.null;
        expect(win.localStorage.getItem('user')).to.be.null;
      });
    });
  });

  describe('Session Timeout & Token Refresh', () => {
    it('should handle expired token gracefully', () => {
      // Set an expired token
      cy.window().then((win) => {
        win.localStorage.setItem('access_token', 'expired-token');
      });
      
      cy.visit(`${FRONTEND_URL}/dashboard`);
      
      // Should redirect to login if token is expired
      cy.url().should('include', '/auth/login');
    });
  });
});

export {};
