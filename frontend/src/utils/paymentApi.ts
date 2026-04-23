
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

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

export async function getPaymentHistory(token: string) {
  if (!token) throw new Error('Not authenticated');
  try {
    const res = await axios.get(`${API_BASE_URL}/api/v1/payments/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (err: any) {
    throw new Error(err?.response?.data?.message || 'Failed to fetch payment history');
  }
}
