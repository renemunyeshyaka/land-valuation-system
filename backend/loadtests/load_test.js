import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const authFailureRate = new Rate('auth_failures');
const valuationFailureRate = new Rate('valuation_failures');
const apiTrend = new Trend('api_response_time');

const API_BASE = __ENV.API_URL || 'http://localhost:5001';
const FRONTEND_URL = __ENV.FRONTEND_URL || 'http://localhost:3001';

export const options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '2m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
    auth_failures: ['rate<0.1'],
    valuation_failures: ['rate<0.1'],
  },
};

var PROVINCES = ['Kigali', 'Eastern', 'Northern', 'Western', 'Southern'];
var DISTRICTS = {
  'Kigali': ['Gasabo', 'Kicukiro', 'Nyarugenge'],
  'Eastern': ['Bugesera', 'Gatsibo', 'Kayonza', 'Ngoma', 'Nyagatare', 'Rwamagana'],
  'Northern': ['Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo'],
  'Western': ['Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro'],
  'Southern': ['Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango'],
};

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getDistricts(province) {
  return DISTRICTS[province] || ['Gasabo'];
}

export default function () {
  // Public Endpoints
  group('Public APIs', function () {
    var resp = http.get(API_BASE + '/api/v1/payments/methods');
    check(resp, { 'methods ok': function (r) { return r.status === 200; } });
    apiTrend.add(resp.timings.duration);

    resp = http.get(API_BASE + '/api/v1/payments/providers');
    check(resp, { 'providers ok': function (r) { return r.status === 200; } });
    apiTrend.add(resp.timings.duration);

    resp = http.get(API_BASE + '/api/v1/marketplace/properties-for-sale');
    check(resp, { 'marketplace ok': function (r) { return r.status === 200; } });
    apiTrend.add(resp.timings.duration);

    sleep(0.5);
  });

  // Valuation
  group('Valuation', function () {
    var province = randomChoice(PROVINCES);
    var district = randomChoice(getDistricts(province));

    var resp = http.post(API_BASE + '/api/v1/estimate-search', JSON.stringify({
      province: province,
      district: district,
      sector: 'Kacyiru',
      cell: 'Biryogo',
      village: 'Gishushu',
      plot_size_sqm: 500,
    }), { headers: { 'Content-Type': 'application/json' } });

    var ok = check(resp, { 'estimate ok': function (r) { return r.status === 200 || r.status === 404; } });
    valuationFailureRate.add(!ok);
    apiTrend.add(resp.timings.duration);

    resp = http.post(API_BASE + '/api/v1/properties/search', JSON.stringify({
      latitude: -1.94,
      longitude: 30.06,
      radius_km: 50,
      page: 1,
      limit: 10,
    }), { headers: { 'Content-Type': 'application/json' } });

    check(resp, { 'search ok': function (r) { return r.status === 200; } });
    apiTrend.add(resp.timings.duration);

    sleep(0.5);
  });

  // Authentication + Subscription
  group('Auth', function () {
    var uniqueId = __VU + '-' + __ITER;
    var resp = http.post(API_BASE + '/api/v1/auth/register', JSON.stringify({
      email: 'load-' + uniqueId + '@test.com',
      password: 'Test1234!',
      first_name: 'Load',
      last_name: 'Test',
      phone: '+250788123456',
      user_type: 'individual',
    }), { headers: { 'Content-Type': 'application/json' } });

    var ok = check(resp, { 'register ok': function (r) { return r.status === 200 || r.status === 201 || r.status === 400; } });
    authFailureRate.add(!ok);
    apiTrend.add(resp.timings.duration);

    resp = http.get(API_BASE + '/api/v1/subscriptions/plans');
    check(resp, { 'plans ok': function (r) { return r.status === 200; } });
    apiTrend.add(resp.timings.duration);

    sleep(1);
  });

  // Frontend Pages
  group('Frontend', function () {
    var pages = ['/', '/marketplace', '/how-it-works', '/benefits', '/contact', '/auth/login', '/auth/register'];
    var page = pages[Math.floor(Math.random() * pages.length)];

    var resp = http.get(FRONTEND_URL + page);
    check(resp, { 'page loads': function (r) { return r.status === 200; } });
    apiTrend.add(resp.timings.duration);

    sleep(0.5);
  });
}
