import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '../../components/DashboardLayout';
import DashboardLoading from '../../components/DashboardLoading';
import ExchangeRateDisplay from '../../components/ExchangeRateDisplay';
import { getPaymentSummary, getPaymentHistory, getPaymentDetail, getRefundRequests, createRefundRequest } from '../../utils/paymentApi';
import Footer from "../../components/Footer";

/**
 * PAYMENT HISTORY PAGE · Land Valuation System
 * 
 * Purpose: Display user transactions, billing history, invoices, and receipts
 * Features:
 * - Transaction list with filters
 * - Invoice details
 * - Receipt download
 * - Payment status tracking
 * - Billing information
 */


interface PaymentSummary {
  totalPaid: number;
  pending: number;
  failed: number;
  lastPaymentDate: string;
}

interface Payment {
  id: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'completed';
  method: string;
  createdAt: string;
  description?: string;
  invoiceId?: string;
  receiptUrl?: string;
}

interface PaymentDetail extends Payment {
  providerTransactionId?: string;
  paymentReference?: string;
  currency?: string;
  serviceFee?: number;
  taxAmount?: number;
  totalAmount?: number;
  transactionType?: string;
  statusLabel?: string;
  notes?: string;
  sellerId?: number;
  buyerId?: number;
  propertyId?: number;
  createdBy?: number;
}

interface RefundRequestItem {
  id: number;
  transaction_id: number;
  requested_amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | string;
  admin_note?: string;
  created_at: string;
}

const normalizePayment = (txn: any): Payment => ({
  id: String(txn?.id || txn?.invoiceId || txn?.payment_reference || ''),
  amount: Number(txn?.amount || txn?.amount_rwf || txn?.total_amount || 0),
  status: String(txn?.status || txn?.payment_status || 'pending') as Payment['status'],
  method: String(txn?.method || txn?.payment_method || txn?.paymentProvider || txn?.payment_provider || 'unknown'),
  createdAt: String(txn?.createdAt || txn?.created_at || new Date().toISOString()),
  description: txn?.description || txn?.notes || '',
  invoiceId: String(txn?.invoiceId || txn?.id || ''),
  receiptUrl: txn?.receiptUrl,
});

const PaymentHistory: React.FC = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [refundRequests, setRefundRequests] = useState<RefundRequestItem[]>([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState('');
  const [refundStatus, setRefundStatus] = useState('all');
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [creatingRefund, setCreatingRefund] = useState(false);
  const [error, setError] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / pageLimit));

  const loadPayments = async (
    page = currentPage,
    overrides: Partial<{
      status: string;
      method: string;
      search: string;
      from: string;
      to: string;
    }> = {}
  ) => {
    setLoading(true);
    try {
      const token = (session as any)?.accessToken || (session as any)?.jwt || (session as any)?.user?.token;
      if (!token) throw new Error('Not authenticated');

      const nextStatus = overrides.status ?? filterStatus;
      const nextMethod = overrides.method ?? filterMethod;
      const nextSearch = overrides.search ?? filterSearch;
      const nextFrom = overrides.from ?? filterFrom;
      const nextTo = overrides.to ?? filterTo;

      const [summaryData, paymentData] = await Promise.all([
        getPaymentSummary(token),
        getPaymentHistory(token, {
          page,
          limit: pageLimit,
          status: nextStatus,
          method: nextMethod,
          search: nextSearch,
          from: nextFrom,
          to: nextTo,
        }),
      ]);

      setSummary(summaryData);
      setPayments((paymentData.transactions || []).map(normalizePayment));
      setTotal(Number(paymentData.total || 0));
      setCurrentPage(Number(paymentData.page || page));
      setPageLimit(Number(paymentData.limit || pageLimit));
      setError('');
    } catch (err: any) {
      const msg = err?.message || 'Failed to load payment data.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const loadRefundRequests = async (statusOverride = refundStatus) => {
    try {
      setRefundLoading(true);
      setRefundError('');
      const token = (session as any)?.accessToken || (session as any)?.jwt || (session as any)?.user?.token;
      if (!token) throw new Error('Not authenticated');

      const data = await getRefundRequests(token, { page: 1, limit: 10, status: statusOverride });
      setRefundRequests(data.refunds || []);
    } catch (err: any) {
      setRefundError(err?.message || 'Failed to load refund requests');
    } finally {
      setRefundLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadPayments(1);
      loadRefundRequests('all');
    }
    // Do not redirect unauthenticated users; show friendly message instead
  }, [status, session]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadRefundRequests(refundStatus);
    }
  }, [refundStatus]);

  const handleDownloadReceipt = async (txn: Payment) => {
    try {
      // Get JWT token from next-auth session
      const token = (session as any)?.accessToken || (session as any)?.jwt || (session as any)?.user?.token;
      if (!token) throw new Error('Not authenticated');
      const url = txn.receiptUrl || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/invoice/${txn.invoiceId || txn.id}/download`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Failed to download receipt');
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `invoice_${txn.invoiceId || txn.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast.success(t('toast.receiptDownloaded'));
    } catch (err: any) {
      toast.error(err.message || t('toast.downloadFailed'));
    }
  };

  const openPaymentDetail = async (txnId: string) => {
    try {
      setDetailLoading(true);
      setDetailError('');
      setSelectedPayment(null);

      const token = (session as any)?.accessToken || (session as any)?.jwt || (session as any)?.user?.token;
      if (!token) throw new Error('Not authenticated');

      const detail = await getPaymentDetail(token, txnId);
      const rawTxn = detail?.transaction || detail;

      setSelectedPayment({
        ...normalizePayment(rawTxn),
        providerTransactionId: rawTxn?.provider_transaction_id || rawTxn?.providerTransactionID || rawTxn?.providerTransactionId,
        paymentReference: rawTxn?.payment_reference || rawTxn?.paymentReference,
        currency: rawTxn?.currency || 'RWF',
        serviceFee: Number(rawTxn?.service_fee || rawTxn?.serviceFee || 0),
        taxAmount: Number(rawTxn?.tax_amount || rawTxn?.taxAmount || 0),
        totalAmount: Number(rawTxn?.total_amount || rawTxn?.totalAmount || rawTxn?.amount || 0),
        transactionType: rawTxn?.transaction_type || rawTxn?.transactionType,
        statusLabel: rawTxn?.status || rawTxn?.payment_status || rawTxn?.paymentStatus,
        notes: rawTxn?.notes || '',
        sellerId: Number(rawTxn?.seller_id || rawTxn?.sellerId || 0),
        buyerId: Number(rawTxn?.buyer_id || rawTxn?.buyerId || 0),
        propertyId: Number(rawTxn?.property_id || rawTxn?.propertyId || 0),
        createdBy: Number(rawTxn?.created_by || rawTxn?.createdBy || 0),
      });
      setRefundAmount(String(Number(rawTxn?.amount || rawTxn?.amount_rwf || 0)));
      setRefundReason('');
    } catch (err: any) {
      const msg = err?.message || 'Failed to load payment detail.';
      setDetailError(msg);
      toast.error(msg);
    } finally {
      setDetailLoading(false);
    }
  };

  const applyFilters = async () => {
    setCurrentPage(1);
    await loadPayments(1);
  };

  const goToPage = async (page: number) => {
    const nextPage = Math.min(Math.max(1, page), totalPages);
    await loadPayments(nextPage);
  };

  const handleCreateRefundRequest = async () => {
    if (!selectedPayment) return;

    const amount = Number(refundAmount);
    const reason = refundReason.trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('toast.refundAmountInvalid'));
      return;
    }
    if (reason.length < 8) {
      toast.error(t('toast.refundReasonRequired'));
      return;
    }

    const confirmed = window.confirm(
      `Submit refund request for RWF ${amount.toLocaleString()}?\n\nReason: ${reason}`
    );
    if (!confirmed) {
      return;
    }

    try {
      setCreatingRefund(true);
      const token = (session as any)?.accessToken || (session as any)?.jwt || (session as any)?.user?.token;
      if (!token) throw new Error('Not authenticated');

      await createRefundRequest(token, {
        transaction_id: Number(selectedPayment.id),
        requested_amount: amount,
        reason,
      });

      toast.success(t('toast.refundSubmitted'));
      await loadRefundRequests(refundStatus);
      setRefundReason('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit refund request');
    } finally {
      setCreatingRefund(false);
    }
  };



  if (status === 'loading' || loading) {
    return <DashboardLoading message="Loading your payment history..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-600 mb-4"></i>
          <h2 className="text-2xl font-bold mb-2">Payment History Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            className="inline-block px-6 py-2.5 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors"
            onClick={() => window.location.reload()}
          >
            <i className="fas fa-redo mr-2"></i>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <i className="fas fa-lock text-4xl text-emerald-700 mb-4"></i>
          <h2 className="text-2xl font-bold mb-2">Please log in to view your payment history</h2>
          <p className="text-gray-600 mb-6">You must be signed in to access your transactions, invoices, and receipts.</p>
          <Link href="/auth/login" className="inline-block px-6 py-2.5 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors">
            <i className="fas fa-sign-in-alt mr-2"></i>
            Log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>Payment History · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="View your payment history, invoices, and receipts" />
        <meta property="og:title" content="Payment History · LandVal" />
      </Head>

      {/* MAIN LAYOUT */}
      <DashboardLayout footer={<Footer />}>

        <div className="min-w-0">

            {/* Page Header */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Payment History
              </h1>
              <p className="text-lg text-gray-600">
                View your transactions, invoices, and download receipts
              </p>
            </div>

            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">Total Paid</p>
                  <p className="text-3xl font-bold text-emerald-700">RWF {summary.totalPaid?.toLocaleString() || 0}</p>
                  <p className="text-xs text-gray-500 mt-2">All paid transactions</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{summary.pending}</p>
                  <p className="text-xs text-gray-500 mt-2">Awaiting payment</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <p className="text-sm font-medium text-gray-600 mb-2">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{summary.failed}</p>
                  <p className="text-xs text-gray-500 mt-2">Requires attention</p>
                </div>
                {/* Exchange Rate Display */}
                <ExchangeRateDisplay showConverter={false} />
              </div>
            )}

            {/* Filters & Transactions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-12">
              
              {/* Header with Filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Transactions</h2>
                
                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      loadPayments(1, { status: 'all' });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('completed');
                      loadPayments(1, { status: 'completed' });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === 'completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('failed');
                      loadPayments(1, { status: 'failed' });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === 'failed'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Failed
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mb-6">
                <input
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Search reference, description, or ID"
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <select
                  value={filterMethod}
                  onChange={(e) => setFilterMethod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">All methods</option>
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mortgage">Mortgage</option>
                </select>
                <input
                  type="date"
                  value={filterFrom}
                  onChange={(e) => setFilterFrom(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="date"
                  value={filterTo}
                  onChange={(e) => setFilterTo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={applyFilters}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-700 text-white hover:bg-emerald-800 transition-colors"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={() => {
                      setFilterStatus('all');
                      setFilterMethod('all');
                      setFilterSearch('');
                      setFilterFrom('');
                      setFilterTo('');
                      loadPayments(1, { status: 'all', method: 'all', search: '', from: '', to: '' });
                    }}
                    className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Method</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((txn) => (
                      <tr
                        key={txn.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => openPaymentDetail(txn.id)}
                      >
                        <td className="py-4 px-4 text-gray-800 font-medium">{new Date(txn.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 px-4 text-gray-600">{txn.description || '-'}</td>
                        <td className="py-4 px-4 text-gray-800 font-semibold">RWF {txn.amount?.toLocaleString()}</td>
                        <td className="py-4 px-4 text-gray-600">{txn.method}</td>
                        <td className="py-4 px-4">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            txn.status === 'completed' || txn.status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : txn.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDownloadReceipt(txn);
                            }}
                            className="text-emerald-700 hover:text-emerald-800 text-sm font-medium transition-colors"
                          >
                            <i className="fas fa-download mr-1"></i>Receipt
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {payments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-receipt text-3xl mb-3 block"></i>
                  No transactions found.
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Showing page {currentPage} of {totalPages} ({total} transactions)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

              {selectedPayment || detailLoading || detailError ? (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-3xl rounded-xl bg-white p-6 shadow-2xl">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">Transaction Detail</h3>
                        <p className="text-sm text-gray-500">Review billing amount, payment references, and status details</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPayment(null);
                          setDetailError('');
                        }}
                        className="text-2xl text-gray-400 hover:text-gray-700"
                        aria-label="Close transaction detail"
                      >
                        &times;
                      </button>
                    </div>

                    {detailLoading ? (
                      <div className="py-12 text-center text-gray-600">
                        <i className="fas fa-spinner fa-spin text-2xl text-emerald-700 mb-3 block"></i>
                        Loading transaction detail...
                      </div>
                    ) : detailError ? (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{detailError}</div>
                    ) : selectedPayment ? (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-4">
                          <div className="rounded-lg border border-gray-200 p-4">
                            <p className="text-sm text-gray-500">Amount</p>
                            <p className="text-3xl font-bold text-emerald-700">RWF {selectedPayment.amount.toLocaleString()}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg border border-gray-200 p-3"><span className="text-gray-500 block">Status</span><span className="font-semibold">{selectedPayment.status}</span></div>
                            <div className="rounded-lg border border-gray-200 p-3"><span className="text-gray-500 block">Method</span><span className="font-semibold">{selectedPayment.method}</span></div>
                            <div className="rounded-lg border border-gray-200 p-3"><span className="text-gray-500 block">Created</span><span className="font-semibold">{new Date(selectedPayment.createdAt).toLocaleString()}</span></div>
                            <div className="rounded-lg border border-gray-200 p-3"><span className="text-gray-500 block">Currency</span><span className="font-semibold">{selectedPayment.currency || 'RWF'}</span></div>
                          </div>
                        </div>

                        <div className="space-y-4 text-sm text-gray-700">
                          <div><span className="font-semibold">Description:</span> {selectedPayment.description || '-'}</div>
                          <div><span className="font-semibold">Payment Reference:</span> {selectedPayment.paymentReference || selectedPayment.invoiceId || '-'}</div>
                          <div><span className="font-semibold">Provider Transaction ID:</span> {selectedPayment.providerTransactionId || '-'}</div>
                          <div><span className="font-semibold">Transaction Type:</span> {selectedPayment.transactionType || '-'}</div>
                          <div><span className="font-semibold">Service Fee:</span> RWF {(selectedPayment.serviceFee || 0).toLocaleString()}</div>
                          <div><span className="font-semibold">Tax Amount:</span> RWF {(selectedPayment.taxAmount || 0).toLocaleString()}</div>
                          <div><span className="font-semibold">Total Amount:</span> RWF {(selectedPayment.totalAmount || selectedPayment.amount).toLocaleString()}</div>
                          <div><span className="font-semibold">Notes:</span> {selectedPayment.notes || '-'}</div>
                          {(selectedPayment.status === 'completed' || selectedPayment.status === 'paid') ? (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                              <p className="font-semibold text-amber-800">Need a refund?</p>
                              <input
                                type="number"
                                min="1"
                                value={refundAmount}
                                onChange={(event) => setRefundAmount(event.target.value)}
                                className="w-full rounded-md border border-amber-300 px-3 py-2"
                                placeholder="Refund amount"
                              />
                              <textarea
                                value={refundReason}
                                onChange={(event) => setRefundReason(event.target.value)}
                                className="w-full rounded-md border border-amber-300 px-3 py-2"
                                placeholder="Reason for refund request"
                                rows={2}
                              />
                              <button
                                type="button"
                                disabled={creatingRefund}
                                onClick={handleCreateRefundRequest}
                                className="px-3 py-2 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-60"
                              >
                                {creatingRefund ? 'Submitting...' : 'Submit Refund Request'}
                              </button>
                            </div>
                          ) : null}
                          <div className="flex gap-3 pt-3">
                            <button
                              type="button"
                              onClick={() => handleDownloadReceipt(selectedPayment)}
                              className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800"
                            >
                              <i className="fas fa-download mr-2"></i>Receipt
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-12">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <h2 className="text-2xl font-bold text-gray-800">Refund Audit</h2>
                <select
                  value={refundStatus}
                  onChange={(event) => setRefundStatus(event.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                >
                  <option value="all">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="escalated">Escalated</option>
                </select>
              </div>

              {refundLoading ? (
                <div className="py-8 text-center text-gray-600">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Loading refunds...
                </div>
              ) : refundError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">{refundError}</div>
              ) : refundRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No refund requests found for the selected filter.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Created</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Transaction</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refundRequests.map((refund) => (
                        <tr key={refund.id} className="border-b border-gray-100">
                          <td className="py-3 px-4">{new Date(refund.created_at).toLocaleString()}</td>
                          <td className="py-3 px-4">#{refund.transaction_id}</td>
                          <td className="py-3 px-4">RWF {Number(refund.requested_amount || 0).toLocaleString()}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              refund.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : refund.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : refund.status === 'escalated'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {String(refund.status).charAt(0).toUpperCase() + String(refund.status).slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <p>{refund.reason}</p>
                            {refund.admin_note ? <p className="text-xs text-gray-500 mt-1">Admin note: {refund.admin_note}</p> : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Billing Information */}
            <div className="grid lg:grid-cols-2 gap-6">
              
              {/* Payment Methods */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Payment Method</h2>
                
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <i className="fas fa-mobile-alt text-2xl text-emerald-600"></i>
                      <div>
                        <p className="font-medium text-gray-800">MTN Mobile Money</p>
                        <p className="text-sm text-gray-600">+250 788 620 201</p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                      Primary
                    </span>
                  </div>
                </div>

                <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  <i className="fas fa-plus mr-2"></i>
                  Add Payment Method
                </button>
              </div>

              {/* Billing Cycle */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Current Plan</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                    <span className="text-gray-600">Plan</span>
                    <span className="font-semibold text-gray-800">Professional</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                    <span className="text-gray-600">Monthly Cost</span>
                    <span className="font-semibold text-emerald-700">Rwf 79k/mo</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                    <span className="text-gray-600">Billing Cycle</span>
                    <span className="font-semibold text-gray-800">Monthly</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Next Billing Date</span>
                    <span className="font-semibold text-gray-800">2026-04-01</span>
                  </div>
                </div>

                <button className="w-full mt-6 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                  <i className="fas fa-pencil-alt mr-2"></i>
                  Change Plan
                </button>
              </div>

            </div>

            {/* Help Section */}
            <div className="mt-12 bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Having issues with payment?</h3>
              <p className="text-gray-600 mb-4">
                If a payment failed or you need help with your invoice, please contact our support team. We're here to help!
              </p>
              <Link
                href="/contact"
                className="inline-block px-6 py-2.5 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors"
              >
                <i className="fas fa-headset mr-2"></i>
                Contact Support
              </Link>
            </div>

          </div>
      </DashboardLayout>
    </>
  );
};

export default PaymentHistory;
