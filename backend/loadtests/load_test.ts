import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const authFailureRate = new Rate('auth_failures');
const paymentFailureRate = new Rate('payment_failures');
const valuationFailureRate = new Rate('valuation_failures');
const apiTrend = new Trend('api_response_time');

// Configuration
const API_BASE = __ENV.API_URL || 'http://localhost:5001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3001';

// Test stages: ramp up from 0 to 100 users, sustain, then ramp down
export const options = {
  stages: [
    { duration: '30s', target: 20 },   // Warm-up: 20 users
    { duration: '1m', target: 50 },    // Ramp to 50
    { duration: '2m', target: 100 },   // Ramp to 100
    { duration: '2m', target: 100 },   // Sustain at 100
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],    // Less than 5% failures
    auth_failures: ['rate<0.1'],       // Less than 10% auth failures
    valuation_failures: ['rate<0.1'],  // Less than 10% valuation failures
  },
};

// Test data
const TEST_USER = {
  email: 'loadtest@test.com',
  password: 'Test1234!',
  phone: '+250788123456',
  user_type: 'individual',
  first_name: 'Load',
  last_name: 'Test',
};

export function setup() {
  // Register a dedicated load test user
  const registerRes = http.post(`${API_BASE}/api/v1/auth/register`, JSON.stringify(TEST_USER), {
    headers: { 'Content-Type': 'application/json' },
  });

  // Activate the user directly in DB (since we can't verify email in setup)
  // This is handled via the login + OTP flow in the test

  return { userId: registerRes.json('data.user_id') };
}

// Generate random test data helpers
function randomProvince() { return ['Kigali', 'Eastern', 'Northern', 'Western', 'Southern'][Math.floor(Math.random() * 5)]; }
function randomDistrict(province: string): string {
  const districts: Record<string, string[]> = {
    'Kigali': ['Gasabo', 'Kicukiro', 'Nyarugenge'],
    'Eastern': ['Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana'],
    'Northern': ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
    'Western': ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'],
    'Southern': ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'],
  };
  const d = districts[province];
  return d[Math.floor(Math.random() * d.length)];
}

export default function (data: { userId?: number }) {
  // Group: Health & Public Endpoints
  group('Public Endpoints', () => {
    // Health check
    const healthResp = http.get(`${API_BASE}/api/health`);
    check(healthResp, { 'health endpoint responds': (r) => r.status === 200 || r.status === 404 });
    apiTrend.add(healthResp.timings.duration);

    // Payment methods (public)
    const methodsResp = http.get(`${API_BASE}/api/v1/payments/methods`);
    check(methodsResp, { 'payment methods': (r) => r.status === 200 });
    apiTrend.add(methodsResp.timings.duration);

    // Payment providers (public)
    const providersResp = http.get(`${API_BASE}/api/v1/payments/providers`);
    check(providersResp, { 'payment providers': (r) => r.status === 200 });
    apiTrend.add(providersResp.timings.duration);

    // Frontend home page
    const homeResp = http.get(`${FRONTEND_URL}/`);
    check(homeResp, { 'frontend home': (r) => r.status === 200 });
    apiTrend.add(homeResp.timings.duration);

    sleep(0.5);
  });

  // Group: Authentication
  group('Authentication', () => {
    // Login
    const loginResp = http.post(`${API_BASE}/api/v1/auth/login`, JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password,
    }), { headers: { 'Content-Type': 'application/json' } });

    const loginOk = check(loginResp, { 'login responds': (r) => r.status === 200 || r.status === 400 });
    authFailureRate.add(!loginOk);
    apiTrend.add(loginResp.timings.duration);

    // Register a new user (every 10th iteration to simulate new signups)
    if (__ITER % 10 === 0) {
      const uniqueEmail = `loadtest_${__VU}_${__ITER}@test.com`;
      const registerResp = http.post(`${API_BASE}/api/v1/auth/register`, JSON.stringify({
        email: uniqueEmail,
        password: TEST_USER.password,
        first_name: TEST_USER.first_name,
        last_name: TEST_USER.last_name,
        phone: TEST_USER.phone,
        user_type: TEST_USER.user_type,
      }), { headers: { 'Content-Type': 'application/json' } });

      const regOk = check(registerResp, { 'register responds': (r) => r.status === 200 || r.status === 201 });
      authFailureRate.add(!regOk);
      apiTrend.add(registerResp.timings.duration);
    }

    sleep(1);
  });

  // Group: Property Search & Valuation
  group('Valuation & Search', () => {
    // Multi-field estimate search
    const province = randomProvince();
    const district = randomDistrict(province);
    const estimateResp = http.post(`${API_BASE}/api/v1/estimate-search`, JSON.stringify({
      province,
      district,
      sector: 'Kacyiru',
      cell: 'Biryogo',
      village: 'Gishushu',
      plot_size_sqm: 500,
    }), { headers: { 'Content-Type': 'application/json' } });

    const estOk = check(estimateResp, { 'estimate search responds': (r) => r.status === 200 || r.status === 404 });
    valuationFailureRate.add(!estOk);
    apiTrend.add(estimateResp.timings.duration);

    // Search properties
    const searchResp = http.post(`${API_BASE}/api/v1/properties/search`, JSON.stringify({
      latitude: -1.94,
      longitude: 30.06,
      radius_km: 50,
      page: 1,
      limit: 10,
    }), { headers: { 'Content-Type': 'application/json' } });

    check(searchResp, { 'property search responds': (r) => r.status === 200 });
    apiTrend.add(searchResp.timings.duration);

    // Marketplace
    const marketplaceResp = http.get(`${API_BASE}/api/v1/marketplace/properties-for-sale`);
    check(marketplaceResp, { 'marketplace responds': (r) => r.status === 200 });
    apiTrend.add(marketplaceResp.timings.duration);

    sleep(0.5);
  });

  // Group: Subscription Plans
  group('Subscriptions', () => {
    const plansResp = http.get(`${API_BASE}/api/v1/subscriptions/plans`);
    check(plansResp, { 'subscription plans': (r) => r.status === 200 });
    apiTrend.add(plansResp.timings.duration);

    sleep(0.3);
  });

  // Group: Frontend Pages
  group('Frontend Pages', () => {
    const pages = ['/', '/marketplace', '/how-it-works', '/benefits', '/contact', '/auth/login', '/auth/register'];
    const page = pages[Math.floor(Math.random() * pages.length)];

    const pageResp = http.get(`${FRONTEND_URL}${page}`);
    check(pageResp, { `frontend ${page} loads`: (r) => r.status === 200 });
    apiTrend.add(pageResp.timings.duration);

    sleep(0.5);
  });
}
