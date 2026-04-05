import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { refreshAccessToken } from '../../utils/tokenRefresh';

const DataImportExport: React.FC = () => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState({ users: 0, properties: 0, logs: 0 });
  const [dataSets, setDataSets] = useState<any[]>([]);
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

  const fetchSnapshot = async (allowRetry = true) => {
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

      const [usersRes, propsRes, logsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/admin/users`, { ...getAuthConfig(), params: { page: 1, limit: 1 } }),
        axios.get(`${API_BASE_URL}/api/v1/admin/properties`, { ...getAuthConfig(), params: { page: 1, limit: 1 } }),
        axios.get(`${API_BASE_URL}/api/v1/admin/audit-logs`, { ...getAuthConfig(), params: { page: 1, limit: 25 } }),
      ]);

      const usersTotal = Number(usersRes.data?.data?.total || 0);
      const propsTotal = Number(propsRes.data?.data?.total || 0);
      const logsTotal = Number(logsRes.data?.data?.total || 0);

      setSnapshot({ users: usersTotal, properties: propsTotal, logs: logsTotal });

      let rows = logsRes.data?.data?.data || [];
      if (!Array.isArray(rows)) rows = [];
      setDataSets(rows);
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await fetchSnapshot(false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to fetch data snapshot');
      setDataSets([]);
      setSnapshot({ users: 0, properties: 0, logs: 0 });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSnapshot();
  }, [session]);

  const filteredSets = dataSets.filter((row) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(row?.id || '').toLowerCase().includes(q) ||
      String(row?.action || '').toLowerCase().includes(q) ||
      String(row?.user_id || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>Data Import/Export</h2>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button onClick={() => fetchSnapshot()} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Refresh Data</button>
        <button onClick={() => window.open(`${API_BASE_URL}/api/v1/admin/users/export`, '_blank')} style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Export Users</button>
      </div>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search data sets or logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={() => fetchSnapshot()}
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
          <p style={{ color: '#666' }}>Loading data snapshot...</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
              <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Users</div><div style={{ fontWeight: 700, fontSize: 20 }}>{snapshot.users}</div></div>
              <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Properties</div><div style={{ fontWeight: 700, fontSize: 20 }}>{snapshot.properties}</div></div>
              <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Audit Logs</div><div style={{ fontWeight: 700, fontSize: 20 }}>{snapshot.logs}</div></div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Log ID</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Action</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>User</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filteredSets.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{row.id}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{row.action || '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{row.user_id || '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{row.timestamp || '-'}</td>
                  </tr>
                ))}
                {filteredSets.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 12, border: '1px solid #eee', textAlign: 'center', color: '#666' }}>No records found</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

export default DataImportExport;
