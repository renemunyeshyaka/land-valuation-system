import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { refreshAccessToken } from '../../utils/tokenRefresh';

const SystemHealth: React.FC = () => {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
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

  const fetchHealth = async (allowRetry = true) => {
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

      const [healthRes, configRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/admin/health`, getAuthConfig()),
        axios.get(`${API_BASE_URL}/api/v1/admin/config`, getAuthConfig()),
      ]);

      setHealth(healthRes.data?.data || null);
      setConfig(configRes.data?.data || null);
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await fetchHealth(false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to fetch system health');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
  }, [session]);

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>System Health</h2>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search metrics or logs..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={() => fetchHealth()}
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
          <p style={{ color: '#666' }}>Loading system health...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Status</div><div style={{ fontWeight: 700 }}>{health?.status || '-'}</div></div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Database</div><div style={{ fontWeight: 700 }}>{health?.database || '-'}</div></div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Cache</div><div style={{ fontWeight: 700 }}>{health?.cache || '-'}</div></div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Uptime</div><div style={{ fontWeight: 700 }}>{health?.uptime || '-'}</div></div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>Payment Enabled</div><div style={{ fontWeight: 700 }}>{String(config?.payment_enabled ?? '-')}</div></div>
            <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}><div style={{ color: '#666', fontSize: 12 }}>KYC Required</div><div style={{ fontWeight: 700 }}>{String(config?.kyc_required ?? '-')}</div></div>
          </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        <button onClick={() => fetchHealth()} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.6rem 1.1rem', fontWeight: 600, cursor: 'pointer' }}>Refresh Health</button>
      </div>
    </div>
  );
};

export default SystemHealth;
