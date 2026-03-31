/// <reference types="cypress" />

// Subscription and Payment Flow Test

describe('Subscription and Payment Flow', () => {
	it('should allow a user to login, verify OTP, select a plan, and complete payment', () => {
		// 1. Check if already logged in by visiting dashboard
		cy.visit('/dashboard');
		cy.url().then((url) => {
			if (url.includes('/dashboard')) {
				cy.log('Already logged in, skipping login/OTP');
				proceedToSubscription();
			} else {
				// Not logged in, perform login
				cy.visit('/auth/login');
				cy.get('input[name="email"]').type('munyeshyaka@yahoo.fr');
				cy.get('input[name="password"]').type('KaruhurA@1708');
				cy.get('button[type="submit"]').click();
				// Handle OTP verification if redirected
				cy.url().then((url) => {
					if (url.includes('/auth/verify-otp')) {
						const otp = '00762';
						const otpDigits = otp.padStart(6, '0').split('');
						otpDigits.forEach((digit, idx) => {
							cy.get(`#otp-${idx}`).type(digit);
						});
						cy.get('button[type="submit"]').contains(/verify|login|submit/i).click();
						cy.url({ timeout: 10000 }).then((url) => {
							if (!url.includes('/dashboard')) {
								cy.get('body').then(($body) => {
									$body.find('.react-hot-toast').each((i, el) => {
										cy.log('Toast:', Cypress.$(el).text());
									});
									$body.find('.text-red-600').each((i, el) => {
										cy.log('Error:', Cypress.$(el).text());
									});
									$body.find('[role="alert"]').each((i, el) => {
										cy.log('Alert:', Cypress.$(el).text());
									});
									$body.find('[class*="error" i]').each((i, el) => {
										cy.log('ErrorClass:', Cypress.$(el).text());
									});
								});
								throw new Error('Did not redirect to dashboard. See Cypress logs for all captured error messages.');
							} else {
								proceedToSubscription();
							}
						});
					} else {
						cy.url().should('include', '/dashboard');
						proceedToSubscription();
					}
				});
			}
		});

		function proceedToSubscription() {
			// 3. Go to subscription page
			cy.visit('/dashboard/subscription');
			// 4. Wait for the "Choose Basic" button and click, or log available buttons if not found
			cy.url().then(url => {
				cy.log('Current URL:', url);
			});
			cy.get('body').then($body => {
				cy.log('Visible text on page:');
				cy.log($body.text());
			});
			cy.contains('Choose Basic', { timeout: 8000 })
				.should('be.visible')
				.click({ force: true });
			cy.url().should('include', '/subscription/checkout');
			// 5. Fill payment details
			cy.get('input[name="phoneNumber"]').type('46733123450'); // MTN sandbox test number
			cy.get('input[type="checkbox"]#terms').check();
			cy.get('button[type="submit"]').contains('Pay').click();
			// 6. Expect payment initiation and success toast
			cy.contains('Payment initiated').should('exist');
			cy.contains('Please check your phone').should('exist');
			// 7. Redirect to dashboard/subscription after payment
			cy.url({ timeout: 10000 }).should('include', '/dashboard/subscription');
		}
	});
});
