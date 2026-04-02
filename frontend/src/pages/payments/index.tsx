import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import MainNavbar from '../../components/MainNavbar';
import ExchangeRateDisplay from '../../components/ExchangeRateDisplay';

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

const PaymentHistory: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock transactions data
  const allTransactions = [
    {
      id: 'TXN-202603-001',
      date: '2026-03-01',
      description: 'Professional Plan - Monthly Renewal',
      amount: 79000,
      status: 'completed',
      method: 'MTN Mobile Money',
      invoiceId: 'INV-202603-001'
    },
    {
      id: 'TXN-202602-005',
      date: '2026-02-28',
      description: 'Professional Plan - Monthly Renewal',
      amount: 79000,
      status: 'completed',
      method: 'Airtel Money',
      invoiceId: 'INV-202602-005'
    },
    {
      id: 'TXN-202602-001',
      date: '2026-02-15',
      description: 'Upgrade from Basic to Professional',
      amount: 50000,
      status: 'completed',
      method: 'Payment Gateway',
      invoiceId: 'INV-202602-001'
    },
    {
      id: 'TXN-202601-008',
      date: '2026-01-28',
      description: 'Basic Plan - Monthly Renewal',
      amount: 29000,
      status: 'completed',
      method: 'MTN Mobile Money',
      invoiceId: 'INV-202601-008'
    },
    {
      id: 'TXN-202601-001',
      date: '2026-01-15',
      description: 'Professional Plan - Monthly Renewal',
      amount: 79000,
      status: 'completed',
      method: 'Payment Gateway',
      invoiceId: 'INV-202601-001'
    },
    {
      id: 'TXN-202512-010',
      date: '2025-12-28',
      description: 'Basic Plan - Monthly Renewal',
      amount: 29000,
      status: 'failed',
      method: 'Airtel Money',
      invoiceId: 'INV-202512-010'
    },
    {
      id: 'TXN-202512-001',
      date: '2025-12-15',
      description: 'Initial Subscription - Basic Plan',
      amount: 29000,
      status: 'completed',
      method: 'Payment Gateway',
      invoiceId: 'INV-202512-001'
    },
  ];

  // Redirect to login if not authenticated
  useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (accessToken && storedUser) {
      setLoading(false);
    } else if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status, router]);

  // Filter transactions
  const filteredTransactions = filterStatus === 'all'
    ? allTransactions
    : allTransactions.filter(t => t.status === filterStatus);

  const handleDownloadReceipt = async (invoiceId: string) => {
    try {
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!accessToken) throw new Error('Not authenticated');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/invoice/${invoiceId}/download`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) throw new Error('Failed to download receipt');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${invoiceId}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Receipt ${invoiceId} downloaded!`);
    } catch (err: any) {
      toast.error(err.message || 'Download failed');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-emerald-700"></i>
      </div>
    );
  }

  // Calculate summary stats
  const totalSpent = allTransactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const completedCount = allTransactions.filter(t => t.status === 'completed').length;
  const failedCount = allTransactions.filter(t => t.status === 'failed').length;

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
      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">

        <MainNavbar />

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">

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
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <p className="text-sm font-medium text-gray-600 mb-2">Total Spent</p>
                <p className="text-3xl font-bold text-emerald-700">FRW {(totalSpent / 1000).toFixed(0)}k</p>
                <p className="text-xs text-gray-500 mt-2">All completed transactions</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <p className="text-sm font-medium text-gray-600 mb-2">Completed</p>
                <p className="text-3xl font-bold text-green-600">{completedCount}</p>
                <p className="text-xs text-gray-500 mt-2">Successful transactions</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <p className="text-sm font-medium text-gray-600 mb-2">Failed</p>
                <p className="text-3xl font-bold text-red-600">{failedCount}</p>
                <p className="text-xs text-gray-500 mt-2">Requires attention</p>
              </div>
              
              {/* Exchange Rate Display */}
              <ExchangeRateDisplay showConverter={false} />
            </div>

            {/* Filters & Transactions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-12">
              
              {/* Header with Filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Transactions</h2>
                
                {/* Filter Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus('completed')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filterStatus === 'completed'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Completed
                  </button>
                  <button
                    onClick={() => setFilterStatus('failed')}
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
                    {filteredTransactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-4 text-gray-800 font-medium">{txn.date}</td>
                        <td className="py-4 px-4 text-gray-600">{txn.description}</td>
                        <td className="py-4 px-4 text-gray-800 font-semibold">FRW {txn.amount.toLocaleString()}</td>
                        <td className="py-4 px-4 text-gray-600">{txn.method}</td>
                        <td className="py-4 px-4">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            txn.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleDownloadReceipt(txn.invoiceId)}
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

              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-receipt text-3xl mb-3 block"></i>
                  No transactions found.
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
                href="/support"
                className="inline-block px-6 py-2.5 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors"
              >
                <i className="fas fa-headset mr-2"></i>
                Contact Support
              </Link>
            </div>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-map-marked-alt text-white text-lg"></i>
                  </div>
                  <span className="text-lg font-bold text-white">LandVal</span>
                </div>
                <p className="text-sm text-gray-400">Rwanda's trusted land valuation platform.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Resources</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/docs" className="hover:text-emerald-400 transition-colors">Docs</Link></li>
                  <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                  <li><Link href="/support" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About</Link></li>
                  <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
              © {new Date().getFullYear()} LandVal. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default PaymentHistory;
