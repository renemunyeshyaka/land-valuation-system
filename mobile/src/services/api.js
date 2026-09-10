import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.70:5001/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach auth token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

// Token management
let storedToken = null;

export const setToken = (token) => { storedToken = token; };
export const clearToken = () => { storedToken = null; };
const getToken = () => storedToken;

// ============================================
// Auth API
// ============================================
export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  verifyOTP: (email, code) =>
    api.post('/auth/verify-otp', { email, code }),

  register: (data) =>
    api.post('/auth/register', data),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (email, code, password) =>
    api.post('/auth/reset-password', { email, code, password }),
};

// ============================================
// User API
// ============================================
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  // Self-service account deletion (right to delete your own account at any time).
  // The current password is required as confirmation.
  deleteAccount: (password, reason = '') =>
    api.delete('/users/account', { data: { password, reason } }),
};

// ============================================
// Properties API
// ============================================
export const propertiesAPI = {
  list: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  markInterested: (id) => api.post(`/properties/${id}/interested`),
};

// ============================================
// Marketplace API
// ============================================
export const marketplaceAPI = {
  listForSale: (params) => api.get('/marketplace/properties-for-sale', { params }),
};

// ============================================
// Estimate API
// ============================================
export const estimateAPI = {
  search: (data) => api.post('/estimate-search', data),
};

export default api;
