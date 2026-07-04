import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface PaymentHistoryQuery {
  page?: number;
  limit?: number;
  status?: string;
  method?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface RefundQuery {
  page?: number;
  limit?: number;
  status?: string;
  from?: string;
  to?: string;
}

export interface CreateRefundRequestPayload {
  transaction_id: number;
  requested_amount: number;
  reason: string;
}

// Fetch payment summary for dashboard cards
export async function getPaymentSummary(token: string) {
  if (!token) throw new Error('Not authenticated');
  try {
    const res = await axios.get(`${API_BASE_URL}/api/v1/payments/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to fetch payment summary');
  }
}

// Fetch payment history for table
export async function getPaymentHistory(token: string, query: PaymentHistoryQuery = {}) {
  if (!token) throw new Error('Not authenticated');
  try {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.status && query.status !== 'all') params.set('status', query.status);
    if (query.method && query.method !== 'all') params.set('method', query.method);
    if (query.search?.trim()) params.set('search', query.search.trim());
    if (query.from?.trim()) params.set('from', query.from.trim());
    if (query.to?.trim()) params.set('to', query.to.trim());

    const res = await axios.get(`${API_BASE_URL}/api/v1/payments/history?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = res.data?.data || {};
    return {
      transactions: payload.transactions || payload.data || [],
      total: payload.total || 0,
      page: payload.page || query.page || 1,
      limit: payload.limit || query.limit || 20,
    };
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to fetch payment history');
  }
}

export async function getPaymentDetail(token: string, transactionId: string) {
  if (!token) throw new Error('Not authenticated');
  if (!transactionId) throw new Error('Transaction id is required');

  try {
    const res = await axios.get(`${API_BASE_URL}/api/v1/payments/${transactionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data?.data || res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to fetch payment detail');
  }
}

export async function getRefundRequests(token: string, query: RefundQuery = {}) {
  if (!token) throw new Error('Not authenticated');

  try {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.status && query.status !== 'all') params.set('status', query.status);
    if (query.from?.trim()) params.set('from', query.from.trim());
    if (query.to?.trim()) params.set('to', query.to.trim());

    const res = await axios.get(`${API_BASE_URL}/api/v1/payments/refunds?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = res.data?.data || {};
    return {
      refunds: payload.data || [],
      total: payload.total || 0,
      page: payload.page || query.page || 1,
      limit: payload.limit || query.limit || 10,
    };
  } catch (err: any) {
    throw new Error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to fetch refund requests');
  }
}

export async function createRefundRequest(token: string, payload: CreateRefundRequestPayload) {
  if (!token) throw new Error('Not authenticated');

  try {
    const res = await axios.post(`${API_BASE_URL}/api/v1/payments/refunds`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.data?.data || res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.error?.message || err?.response?.data?.message || 'Failed to create refund request');
  }
}

// ============================================================
// MTN MANUAL PAYMENT APIs
// ============================================================

export interface MTNManualPaymentInitRequest {
  amount: number;
  currency: string;
  plan_type: string;
  billing_period: 'monthly' | 'yearly';
  description?: string;
}

export interface MTNManualPaymentInitResponse {
  transaction_id: string;
  status: string;
  message: string;
  mtn_phone_number: string;
  mtn_account_name: string;
  amount: number;
  currency: string;
  plan_type: string;
  billing_period: string;
  reference_number: string;
  instructions: string;
}

export interface MTNManualPaymentProofRequest {
  transaction_id: string;
  mtn_transaction_ref: string;
  sender_phone_number: string;
  payment_date: string;
  sender_name: string;
  notes?: string;
}

/**
 * Initiate a manual MTN payment (user sees phone number to send money to)
 */
export async function initiateMTNManualPayment(
  token: string,
  data: MTNManualPaymentInitRequest
): Promise<MTNManualPaymentInitResponse> {
  if (!token) throw new Error('Not authenticated');
  try {
    const res = await axios.post(
      `${API_BASE_URL}/api/v1/payments/mtn-manual/initiate`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data?.data || res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message || 'Failed to initiate MTN payment'
    );
  }
}

/**
 * Submit proof of MTN manual payment
 */
export async function submitMTNPaymentProof(
  token: string,
  data: MTNManualPaymentProofRequest
): Promise<void> {
  if (!token) throw new Error('Not authenticated');
  try {
    await axios.post(
      `${API_BASE_URL}/api/v1/payments/mtn-manual/submit-proof`,
      data,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message || 'Failed to submit payment proof'
    );
  }
}

/**
 * Get MTN manual payment status
 */
export async function getMTNManualPaymentStatus(
  token: string,
  transactionId: string
): Promise<MTNManualPaymentInitResponse> {
  if (!token) throw new Error('Not authenticated');
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/v1/payments/mtn-manual/status/${transactionId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data?.data || res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message || 'Failed to get payment status'
    );
  }
}

/**
 * Get MTN manual payment methods / instructions
 */
export async function getMTNManualPaymentMethods(
  token: string
): Promise<any> {
  if (!token) throw new Error('Not authenticated');
  try {
    const res = await axios.get(
      `${API_BASE_URL}/api/v1/payments/mtn-manual/methods`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data?.data || res.data;
  } catch (err: any) {
    throw new Error(
      err?.response?.data?.message || 'Failed to get payment methods'
    );
  }
}
