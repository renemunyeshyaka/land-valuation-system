import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSession } from 'next-auth/react';
import { refreshAccessToken } from '../../utils/tokenRefresh';

type AuditActionMeta = {
  label: string;
  category: string;
  badgeBg: string;
  badgeColor: string;
};

const ACTION_META_MAP: Record<string, AuditActionMeta> = {
  admin_user_role_updated: {
    label: 'User Role Updated',
    category: 'Role',
    badgeBg: '#f3e8ff',
    badgeColor: '#6b21a8',
  },
  admin_user_access_updated: {
    label: 'User Access Updated',
    category: 'Access',
    badgeBg: '#ede9fe',
    badgeColor: '#5b21b6',
  },
  admin_user_profile_updated: {
    label: 'User Profile Updated',
    category: 'Profile',
    badgeBg: '#e0f2fe',
    badgeColor: '#0369a1',
  },
};

const humanizeAction = (action: string) =>
  action
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getAuditActionMeta = (rawAction: unknown): AuditActionMeta => {
  const action = String(rawAction || '').trim();
  if (!action) {
    return {
      label: '-',
      category: 'Other',
      badgeBg: '#f3f4f6',
      badgeColor: '#374151',
    };
  }

  const exact = ACTION_META_MAP[action.toLowerCase()];
  if (exact) return exact;

  return {
    label: humanizeAction(action),
    category: 'Other',
    badgeBg: '#f3f4f6',
    badgeColor: '#374151',
  };
};

const SupportModeration = () => {
  const [search, setSearch] = useState('');
  const [tickets, setTickets] = useState<any[]>([]);
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

  const fetchTickets = async (page = currentPage, allowRetry = true) => {
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
        setTickets([]);
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/v1/admin/audit-logs`, {
        ...getAuthConfig(),
        params: { page, limit },
      });
      let rows = res.data?.data?.data || [];
      if (!Array.isArray(rows)) rows = [];
      setTickets(rows);
      setCurrentPage(Number(res.data?.data?.page || page));
      setTotal(Number(res.data?.data?.total || rows.length || 0));
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await fetchTickets(page, false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to fetch support/moderation data');
      setTickets([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets(currentPage);
  }, [session, currentPage]);

  const filtered = tickets.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(t?.id || '').toLowerCase().includes(q) ||
      String(t?.user_id || '').toLowerCase().includes(q) ||
      String(t?.action || '').toLowerCase().includes(q) ||
      String(t?.timestamp || '').toLowerCase().includes(q)
    );
  });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '1.25rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>Support & Moderation</h2>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button onClick={() => fetchTickets(1)} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>View Tickets</button>
        <button style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Moderate User</button>
      </div>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search tickets or users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={() => fetchTickets(1)}
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
          <p style={{ color: '#666' }}>Loading support data...</p>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Log ID</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>User</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Action</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Category</th>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} data-testid={`audit-log-row-${t.id}`}>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{t.id}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{t.user_id || '-'}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{getAuditActionMeta(t.action).label}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>
                      <span
                        data-testid={`audit-category-badge-${t.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '0.2rem 0.6rem',
                          borderRadius: 999,
                          fontWeight: 700,
                          fontSize: 12,
                          background: getAuditActionMeta(t.action).badgeBg,
                          color: getAuditActionMeta(t.action).badgeColor,
                        }}
                      >
                        {getAuditActionMeta(t.action).category}
                      </span>
                    </td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{t.timestamp || '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 12, border: '1px solid #eee', textAlign: 'center', color: '#666' }}>No logs found</td>
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

export default SupportModeration;
