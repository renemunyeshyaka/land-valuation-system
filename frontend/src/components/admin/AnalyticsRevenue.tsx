import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { refreshAccessToken } from '../../utils/tokenRefresh';

const AnalyticsRevenue: React.FC = () => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  const { data: session } = useSession();

  const getAuthToken = () => {
    if (session && (session as any).accessToken) return (session as any).accessToken as string;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) return token;
    }
    return null;
  };

  const getAuthConfig = () => {
    const token = getAuthToken();
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    };
  };

  const fetchData = async (allowRetry = true) => {
    setLoading(true);
    setError(null);
    try {
      let token = getAuthToken();
      if (!token) {
        const refreshed = await refreshAccessToken();
        if (refreshed) token = getAuthToken();
      }
      if (!token) {
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const [revRes, trendRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/admin/analytics/revenue`, { ...getAuthConfig(), params: { range: '30d' } }),
        axios.get(`${API_BASE_URL}/api/v1/analytics/market-trends`, { ...getAuthConfig(), params: { range: '90d' } }),
      ]);

      setRevenue(revRes.data?.data || null);
      setTrends(trendRes.data?.data || null);
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await fetchData(false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to fetch analytics');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [session]);

  const formatMoney = (v: any) => Number(v || 0).toLocaleString();

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>Analytics & Revenue</h2>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search analytics by keyword..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={() => fetchData()}
          style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Search
        </button>
        <button
          onClick={() => setSearch('')}
          style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      <div style={{ marginBottom: '2rem' }}>
        {loading ? (
          <p style={{ color: '#666' }}>Loading analytics...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#666', fontSize: 12 }}>Total Revenue</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{formatMoney(revenue?.total_revenue)} RWF</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#666', fontSize: 12 }}>Subscription Revenue</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{formatMoney(revenue?.subscription_revenue)} RWF</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#666', fontSize: 12 }}>Valuation Revenue</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{formatMoney(revenue?.valuation_revenue)} RWF</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#666', fontSize: 12 }}>Active Users</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{Number(revenue?.active_users || 0)}</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#666', fontSize: 12 }}>Market Avg Price</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{formatMoney(trends?.average_price)} RWF</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12 }}>
              <div style={{ color: '#666', fontSize: 12 }}>Price Change</div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{Number(trends?.price_change || 0)}%</div>
            </div>
          </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        {/* Additional analytics controls */}
        <button onClick={() => fetchData()} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Refresh Analytics</button>
      </div>
    </div>
  );
};

export default AnalyticsRevenue;
