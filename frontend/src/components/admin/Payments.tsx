import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { refreshAccessToken } from '../../utils/tokenRefresh';

const Payments: React.FC = () => {
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
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

  const fetchTransactions = async (page = currentPage, allowRetry = true) => {
    setLoading(true);
    setError(null);
    try {
      let token = getAuthToken();
      if (!token) {
        const refreshed = await refreshAccessToken();
        if (refreshed) token = getAuthToken();
      }
      if (!token) {
        setTransactions([]);
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/v1/admin/subscriptions`, {
        ...getAuthConfig(),
        params: { page, limit },
      });

      let rows = res.data?.data?.data || [];
      if (!Array.isArray(rows)) rows = [];
      setTransactions(rows);
      setCurrentPage(Number(res.data?.data?.page || page));
      setTotal(Number(res.data?.data?.total || rows.length || 0));
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await fetchTransactions(page, false);
          return;
        }
      }
      setTransactions([]);
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to fetch payments');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions(currentPage);
  }, [session, currentPage]);

  const filtered = transactions.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(t?.id || '').toLowerCase().includes(q) ||
      String(t?.user_id || '').toLowerCase().includes(q) ||
      String(t?.plan_type || '').toLowerCase().includes(q) ||
      String(t?.status || '').toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>Payments Monitoring</h2>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button onClick={() => fetchTransactions(1)} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Refresh Transactions</button>
        <button onClick={() => window.print()} style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Export Report</button>
      </div>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search transactions by user, amount, or status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={() => fetchTransactions(1)}
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
      <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        {loading ? (
          <p style={{ color: '#666' }}>Loading transactions...</p>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>ID</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>User</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Plan</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Status</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Start Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{t.id}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{t.user_id}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{t.plan_type || '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{t.status || '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{t.start_date || '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 12, border: '1px solid #eee', textAlign: 'center', color: '#666' }}>No transactions found</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: 14, color: '#666' }}>Page {currentPage} of {totalPages}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} style={{ background: currentPage <= 1 ? '#ddd' : '#eee', border: 'none', borderRadius: 6, padding: '0.45rem 0.9rem', cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}>Previous</button>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} style={{ background: currentPage >= totalPages ? '#ddd' : '#2d6a4f', color: currentPage >= totalPages ? '#666' : '#fff', border: 'none', borderRadius: 6, padding: '0.45rem 0.9rem', cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}>Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Payments;
