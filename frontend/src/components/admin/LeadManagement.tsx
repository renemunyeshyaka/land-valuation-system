import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Lead {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company: string;
  role: string;
  district: string;
  sector: string;
  source: string;
  status: string;
  ai_score: number;
  ai_segment: string;
  language_pref: string;
  total_emails: number;
  total_whatsapps: number;
  last_contacted: string | null;
  created_at: string;
}

interface PaginatedResponse {
  data: Lead[];
  total: number;
  page: number;
  limit: number;
}

export default function LeadManagement() {
  const { t } = useTranslation();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [segmentFilter, setSegmentFilter] = useState('');
  const [enrichingId, setEnrichingId] = useState<number | null>(null);
  const [rescoringId, setRescoringId] = useState<number | null>(null);
  const pageSize = 20;

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    if (segmentFilter) params.set('ai_segment', segmentFilter);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/leads?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const payload = data.data as PaginatedResponse;
        setLeads(payload.data);
        setTotal(payload.total);
      } else {
        toast.error(data.error?.message || 'Failed to load leads');
      }
    } catch {
      toast.error(t('toast.leadLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, segmentFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleEnrich = async (id: number) => {
    const token = getToken();
    if (!token) return;
    setEnrichingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/leads/${id}/enrich`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('toast.leadEnriched'));
        fetchLeads();
      } else {
        toast.error(data.error?.message || 'Enrichment failed');
      }
    } catch {
      toast.error(t('toast.leadEnrichFailed'));
    } finally {
      setEnrichingId(null);
    }
  };

  const handleRescore = async (id: number) => {
    const token = getToken();
    if (!token) return;
    setRescoringId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/leads/${id}/re-score`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Lead rescored: ${data.data.score.toFixed(2)}`);
        fetchLeads();
      } else {
        toast.error(data.error?.message || 'Re-scoring failed');
      }
    } catch {
      toast.error(t('toast.leadRescoreFailed'));
    } finally {
      setRescoringId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this lead?')) return;
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/leads/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Lead deleted');
        fetchLeads();
      } else {
        toast.error(data.error?.message || 'Delete failed');
      }
    } catch {
      toast.error('Delete request failed');
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const scoreColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      discovered: 'bg-gray-100 text-gray-700',
      enriched: 'bg-blue-100 text-blue-700',
      scored: 'bg-indigo-100 text-indigo-700',
      queued: 'bg-purple-100 text-purple-700',
      contacted: 'bg-yellow-100 text-yellow-700',
      engaged: 'bg-orange-100 text-orange-700',
      converted: 'bg-green-100 text-green-700',
      unresponsive: 'bg-red-100 text-red-700',
      warm_pool: 'bg-teal-100 text-teal-700',
      blacklisted: 'bg-gray-200 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name, email, company..."
          className="border rounded px-3 py-2 text-sm w-64"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border rounded px-3 py-2 text-sm"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">All statuses</option>
          <option value="discovered">Discovered</option>
          <option value="enriched">Enriched</option>
          <option value="scored">Scored</option>
          <option value="queued">Queued</option>
          <option value="contacted">Contacted</option>
          <option value="engaged">Engaged</option>
          <option value="converted">Converted</option>
        </select>
        <select
          className="border rounded px-3 py-2 text-sm"
          value={segmentFilter}
          onChange={e => { setSegmentFilter(e.target.value); setPage(1); }}
        >
          <option value="">All segments</option>
          <option value="high_value_owner">High Value Owner</option>
          <option value="mid_value_owner">Mid Value Owner</option>
          <option value="agent">Agent</option>
          <option value="developer">Developer</option>
          <option value="institution">Institution</option>
          <option value="diaspora">Diaspora</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t('admin.noLeads')}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-3 py-2 font-medium">{t('admin.leadSource')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('admin.leadSegment')}</th>
                  <th className="text-center px-3 py-2 font-medium">{t('admin.leadScore')}</th>
                  <th className="text-center px-3 py-2 font-medium">{t('admin.leadStatus')}</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2">
                      {lead.first_name} {lead.last_name}
                      {lead.company && <span className="text-gray-400 text-xs block">{lead.company}</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{lead.email || '-'}</td>
                    <td className="px-3 py-2">{lead.source}</td>
                    <td className="px-3 py-2">
                      {lead.ai_segment ? (
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-xs">{lead.ai_segment}</span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`font-semibold ${scoreColor(lead.ai_score)}`}>
                        {lead.ai_score > 0 ? lead.ai_score.toFixed(2) : '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(lead.status)}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEnrich(lead.id)}
                          disabled={enrichingId === lead.id}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-50"
                          title={t('admin.enrich')}
                        >
                          {enrichingId === lead.id ? '...' : 'AI'}
                        </button>
                        <button
                          onClick={() => handleRescore(lead.id)}
                          disabled={rescoringId === lead.id}
                          className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 disabled:opacity-50"
                          title={t('admin.rescore')}
                        >
                          {rescoringId === lead.id ? '...' : 'Σ'}
                        </button>
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>Total: {total} leads</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  ← Prev
                </button>
                <span className="px-3 py-1">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
