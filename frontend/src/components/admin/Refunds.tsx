import React, { useEffect, useMemo, useState } from 'react';

type RefundStatus = 'pending' | 'approved' | 'rejected' | 'escalated';
type TabFilter = 'all' | RefundStatus;

interface RefundRecord {
  id: string;
  user: string;
  parcel: string;
  paid: number;
  requested: number;
  reason: string;
  submitted: string;
  status: RefundStatus;
  adminNote?: string;
}

const STATUS_BADGE: Record<RefundStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  escalated: 'bg-orange-100 text-orange-700',
};

const TABS: { key: TabFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'escalated', label: 'Escalated' },
];

const fmt = (n: number) => n.toLocaleString();

export default function Refunds() {
  const [records, setRecords] = useState<RefundRecord[]>([]);
  const [tab, setTab] = useState<TabFilter>('all');
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'list' | 'policy'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);

  const [policy, setPolicy] = useState({
    duplicateWindow: 30,
    disputeWindow: 14,
    cancelWindow: 7,
    kycWindow: 60,
    autoApproveDuplicate: true,
    autoApproveCancel48h: true,
    requireDirectorAbove100M: true,
    smsOnStatusChange: true,
    slaTarget: 5,
    maxSingleRefund: 500,
  });

  const fetchRefunds = async (opts?: { page?: number; status?: TabFilter; from?: string; to?: string }) => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!accessToken) {
        throw new Error('Missing access token. Please sign in again.');
      }

      const targetPage = opts?.page ?? page;
      const targetTab = opts?.status ?? tab;
      const targetFrom = opts?.from ?? fromDate;
      const targetTo = opts?.to ?? toDate;

      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(limit));
      if (targetTab !== 'all') {
        params.set('status', targetTab);
      }
      if (targetFrom) {
        params.set('from', targetFrom);
      }
      if (targetTo) {
        params.set('to', targetTo);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/admin/refunds?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch refund requests');
      }

      const payload = await response.json();
      const envelope = payload?.data;
      const rows = Array.isArray(envelope?.data)
        ? envelope.data
        : (Array.isArray(payload?.data) ? payload.data : []);
      const totalCount = Number(envelope?.total || rows.length || 0);
      const currentPage = Number(envelope?.page || targetPage || 1);
      const normalized: RefundRecord[] = rows.map((row: any) => ({
        id: String(row.id),
        user: `${String(row?.user?.first_name || '').trim()} ${String(row?.user?.last_name || '').trim()}`.trim() || String(row?.user?.email || 'Unknown user'),
        parcel: String(row?.transaction?.property_id || '-'),
        paid: Number(row?.transaction?.amount || row?.transaction?.amount_rwf || 0),
        requested: Number(row?.requested_amount || 0),
        reason: String(row?.reason || ''),
        submitted: new Date(row?.created_at || Date.now()).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: String(row?.status || 'pending').toLowerCase() as RefundStatus,
        adminNote: String(row?.admin_note || ''),
      }));
      setRecords(normalized);
      setTotal(totalCount);
      setPage(currentPage);
    } catch (err: any) {
      setError(err?.message || 'Failed to load refund requests');
      setRecords([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRefunds();
  }, [tab, fromDate, toDate]);

  const updateStatus = async (id: string, status: 'approved' | 'rejected' | 'escalated') => {
    try {
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!accessToken) {
        setError('Missing access token. Please sign in again.');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/admin/refunds/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => null);
        throw new Error(errPayload?.error?.details || 'Failed to update refund status');
      }

      await fetchRefunds();
    } catch (err: any) {
      setError(err?.message || 'Failed to update refund status');
    }
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchesTab = tab === 'all' || r.status === tab;
      const q = search.toLowerCase();
      const matchesSearch = !q ||
        r.id.toLowerCase().includes(q) ||
        r.user.toLowerCase().includes(q) ||
        r.parcel.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q);
      return matchesTab && matchesSearch;
    });
  }, [records, tab, search]);

  const pending = records.filter((r) => r.status === 'pending').length;
  const approved = records.filter((r) => r.status === 'approved').length;
  const rejected = records.filter((r) => r.status === 'rejected').length;
  const escalated = records.filter((r) => r.status === 'escalated').length;
  const approvedVolume = records.filter((r) => r.status === 'approved').reduce((s, r) => s + r.requested, 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Refunds Management</h2>
          <p className="text-sm text-gray-500">Review, approve, or reject customer refund requests</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('list')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${view === 'list' ? 'bg-rose-600 text-white' : 'border text-gray-600 hover:bg-gray-50'}`}
          >
            <i className="fas fa-list mr-1"></i> Requests
          </button>
          <button
            onClick={() => setView('policy')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${view === 'policy' ? 'bg-rose-600 text-white' : 'border text-gray-600 hover:bg-gray-50'}`}
          >
            <i className="fas fa-file-contract mr-1"></i> Refund Policy
          </button>
        </div>
      </div>

      {view === 'list' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-rose-500">
              <p className="text-gray-500 text-sm">Pending</p>
              <p className="text-3xl font-bold text-gray-800">{pending}</p>
              <span className="text-xs text-rose-600">Awaiting review</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-emerald-500">
              <p className="text-gray-500 text-sm">Approved This Month</p>
              <p className="text-3xl font-bold text-gray-800">{approved}</p>
              <span className="text-xs text-emerald-600">Rwf {fmt(approvedVolume)} returned</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-gray-400">
              <p className="text-gray-500 text-sm">Rejected This Month</p>
              <p className="text-3xl font-bold text-gray-800">{rejected}</p>
              <span className="text-xs text-gray-500">Policy ineligible</span>
            </div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-orange-400">
              <p className="text-gray-500 text-sm">Escalated</p>
              <p className="text-3xl font-bold text-gray-800">{escalated}</p>
              <span className="text-xs text-orange-600">Require Finance Director</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-2 flex-wrap">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => {
                      setPage(1);
                      setTab(t.key);
                    }}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${tab === t.key ? 'bg-rose-600 text-white' : 'border text-gray-600 hover:bg-rose-50'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search Ref, User, Parcel..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 border rounded-lg text-sm w-52 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                  <i className="fas fa-search absolute left-2.5 top-2.5 text-gray-400 text-xs"></i>
                </div>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setPage(1);
                    setFromDate(e.target.value);
                  }}
                  className="border rounded-lg px-2 py-1.5 text-sm"
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setPage(1);
                    setToDate(e.target.value);
                  }}
                  className="border rounded-lg px-2 py-1.5 text-sm"
                  aria-label="To date"
                />
                <button onClick={() => fetchRefunds()} className="border px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  <i className="fas fa-sync mr-1"></i>Refresh
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}

            <div className="overflow-auto" style={{ maxHeight: '420px' }}>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">Ref ID</th>
                    <th className="p-3 text-left">User</th>
                    <th className="p-3 text-left">Parcel</th>
                    <th className="p-3 text-right">Paid (RWF)</th>
                    <th className="p-3 text-right">Req. (RWF)</th>
                    <th className="p-3 text-left">Reason</th>
                    <th className="p-3 text-left">Submitted</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-gray-400">No records match your filter.</td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-gray-400">Loading refund requests...</td>
                    </tr>
                  )}
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{r.id}</td>
                      <td className="p-3">{r.user}</td>
                      <td className="p-3">{r.parcel}</td>
                      <td className="p-3 text-right">{fmt(r.paid)}</td>
                      <td className="p-3 text-right">{fmt(r.requested)}</td>
                      <td className="p-3">{r.reason}</td>
                      <td className="p-3 text-gray-500">{r.submitted}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_BADGE[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3 text-center whitespace-nowrap">
                        {(r.status === 'pending' || r.status === 'escalated') && (
                          <>
                            <button
                              onClick={() => updateStatus(r.id, 'approved')}
                              className="text-emerald-600 hover:underline text-xs mr-2"
                              title="Approve"
                            >
                              <i className="fas fa-check"></i> Approve
                            </button>
                            <button
                              onClick={() => updateStatus(r.id, 'rejected')}
                              className="text-rose-500 hover:underline text-xs mr-2"
                              title="Reject"
                            >
                              <i className="fas fa-times"></i> Reject
                            </button>
                            {r.status === 'pending' && (
                              <button
                                onClick={() => updateStatus(r.id, 'escalated')}
                                className="text-orange-600 hover:underline text-xs"
                                title="Escalate"
                              >
                                <i className="fas fa-level-up-alt"></i> Escalate
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Showing {filtered.length} of {total} refund records
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchRefunds({ page: Math.max(1, page - 1) })}
                  disabled={page <= 1 || loading}
                  className="border rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => fetchRefunds({ page: Math.min(totalPages, page + 1) })}
                  disabled={page >= totalPages || loading}
                  className="border rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {view === 'policy' && (
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-3xl">
          <h2 className="text-xl font-bold mb-1">Refund Policy Configuration</h2>
          <p className="text-gray-500 text-sm mb-5">
            Define eligibility rules, processing windows, and auto-approval limits.
          </p>
          <div className="space-y-5">
            <div className="border rounded-xl p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Eligibility Windows (days)</h4>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Duplicate payment window', key: 'duplicateWindow' },
                  { label: 'Valuation dispute window', key: 'disputeWindow' },
                  { label: 'Cancelled deal window', key: 'cancelWindow' },
                  { label: 'KYC-related window', key: 'kycWindow' },
                ].map(({ label, key }) => (
                  <label key={key} className="block">
                    {label}
                    <input
                      type="number"
                      value={(policy as any)[key]}
                      onChange={(e) => setPolicy((p) => ({ ...p, [key]: Number(e.target.value) }))}
                      className="mt-1 border rounded-lg w-full p-2 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Auto-Approval Rules</h4>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Auto-approve duplicate payments ≤ Rwf 5M', key: 'autoApproveDuplicate' },
                  { label: 'Auto-approve cancelled deals within 48 h', key: 'autoApproveCancel48h' },
                  { label: 'Require Finance Director approval > Rwf 100M', key: 'requireDirectorAbove100M' },
                  { label: 'Notify user via SMS on status change', key: 'smsOnStatusChange' },
                ].map(({ label, key }) => (
                  <label key={key} className="flex items-center justify-between">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={(policy as any)[key]}
                      onChange={(e) => setPolicy((p) => ({ ...p, [key]: e.target.checked }))}
                      className="w-4 h-4 accent-emerald-600"
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="border rounded-xl p-4">
              <h4 className="font-semibold text-gray-700 mb-3">Processing Limits</h4>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <label className="block">
                  SLA target (days)
                  <input
                    type="number"
                    value={policy.slaTarget}
                    onChange={(e) => setPolicy((p) => ({ ...p, slaTarget: Number(e.target.value) }))}
                    className="mt-1 border rounded-lg w-full p-2 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </label>
                <label className="block">
                  Max single refund (Rwf M)
                  <input
                    type="number"
                    value={policy.maxSingleRefund}
                    onChange={(e) => setPolicy((p) => ({ ...p, maxSingleRefund: Number(e.target.value) }))}
                    className="mt-1 border rounded-lg w-full p-2 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="bg-rose-600 text-white px-6 py-2 rounded-xl hover:bg-rose-700">Save Policy</button>
              <button
                onClick={() => setPolicy({ duplicateWindow: 30, disputeWindow: 14, cancelWindow: 7, kycWindow: 60, autoApproveDuplicate: true, autoApproveCancel48h: true, requireDirectorAbove100M: true, smsOnStatusChange: true, slaTarget: 5, maxSingleRefund: 500 })}
                className="border px-6 py-2 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                Reset to Defaults
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
