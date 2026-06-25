import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import CampaignForm from './CampaignForm';
import type { CampaignFormData } from './CampaignForm';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

interface Campaign {
  id: number;
  name: string;
  description: string;
  campaign_type: string;
  channel: string;
  language: string;
  status: string;
  sent_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  target_count: number;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface PaginatedResponse {
  data: Campaign[];
  total: number;
  page: number;
  limit: number;
}

export default function CampaignManagement() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'owner_outreach',
    channel: 'email',
    language: 'all',
  });
  const pageSize = 20;

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    if (!token) { setLoading(false); return; }

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('page_size', String(pageSize));
    if (statusFilter) params.set('status', statusFilter);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/campaigns?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const payload = data.data as PaginatedResponse;
        setCampaigns(payload.data);
        setTotal(payload.total);
      } else {
        toast.error(data.error?.message || 'Failed to load campaigns');
      }
    } catch {
      toast.error(t('toast.campaignLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!formData.name.trim()) { toast.error(t('toast.campaignNameRequired')); return; }
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/campaigns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('toast.campaignCreated'));
        setShowCreateForm(false);
        setFormData({ name: '', description: '', campaign_type: 'owner_outreach', channel: 'email', language: 'all' });
        fetchCampaigns();
      } else {
        toast.error(data.error?.message || 'Failed to create campaign');
      }
    } catch {
      toast.error(t('toast.campaignCreateFailed'));
    }
  };

  const handleLaunch = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/campaigns/${id}/launch`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('toast.campaignLaunched'));
        fetchCampaigns();
      } else {
        toast.error(data.error?.message || 'Launch failed');
      }
    } catch {
      toast.error(t('toast.campaignLaunchFailed'));
    }
  };

  const handlePause = async (id: number) => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/campaigns/${id}/pause`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('toast.campaignPaused'));
        fetchCampaigns();
      } else {
        toast.error(data.error?.message || 'Pause failed');
      }
    } catch {
      toast.error(t('toast.campaignPauseFailed'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this campaign?')) return;
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('toast.campaignDeleted'));
        fetchCampaigns();
      } else {
        toast.error(data.error?.message || 'Delete failed');
      }
    } catch {
      toast.error(t('toast.campaignDeleteFailed'));
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-blue-100 text-blue-700',
      running: 'bg-green-100 text-green-700',
      paused: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-teal-100 text-teal-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const formatRate = (part: number, total: number) => {
    if (total === 0) return '0%';
    return `${((part / total) * 100).toFixed(1)}%`;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <select
            className="border rounded px-3 py-2 text-sm"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New Campaign
        </button>
      </div>

      {showCreateForm && (
        <CampaignForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          submitLabel="Create"
          title="Create Campaign"
        />
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading campaigns...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t('admin.noCampaigns')}</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">{t('admin.campaignType')}</th>
                  <th className="text-left px-3 py-2 font-medium">{t('admin.campaignChannel')}</th>
                  <th className="text-center px-3 py-2 font-medium">Sent</th>
                  <th className="text-center px-3 py-2 font-medium">Opened</th>
                  <th className="text-center px-3 py-2 font-medium">Clicked</th>
                  <th className="text-center px-3 py-2 font-medium">{t('admin.leadStatus')}</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-gray-600">{c.campaign_type}</td>
                    <td className="px-3 py-2">{c.channel}</td>
                    <td className="px-3 py-2 text-center">{c.sent_count}</td>
                    <td className="px-3 py-2 text-center">
                      {c.sent_count > 0 ? (
                        <span title={`${c.opened_count}/${c.sent_count}`}>
                          {formatRate(c.opened_count, c.sent_count)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {c.opened_count > 0 ? (
                        <span title={`${c.clicked_count}/${c.opened_count}`}>
                          {formatRate(c.clicked_count, c.opened_count)}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === 'draft' && (
                          <button
                            onClick={() => handleLaunch(c.id)}
                            className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100"
                            title={t('admin.launch')}
                          >
                            ▶
                          </button>
                        )}
                        {c.status === 'running' && (
                          <button
                            onClick={() => handlePause(c.id)}
                            className="px-2 py-1 text-xs bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100"
                            title={t('admin.pause')}
                          >
                            ⏸
                          </button>
                        )}
                        {c.status === 'draft' && (
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                            title="Delete"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
              <span>Total: {total} campaigns</span>
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
