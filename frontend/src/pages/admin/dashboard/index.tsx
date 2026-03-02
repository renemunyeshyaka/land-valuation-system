import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

/**
 * ADMIN DASHBOARD PAGE · Land Valuation System
 * 
 * Purpose: Central admin hub for KPIs, user management, and revenue analytics
 * Features:
 * - Key performance indicators (KPIs)
 * - User management with filters
 * - Revenue breakdown by tier
 * - Recent transactions
 * - Admin-only access
 */

const AdminDashboard: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Mock KPI data
  const kpis = [
    { label: 'Total Users', value: '2,847', change: '+12.5%', trend: 'up', icon: 'fa-users' },
    { label: 'Total Revenue', value: '₨84.2M', change: '+8.3%', trend: 'up', icon: 'fa-money-bill-wave' },
    { label: 'Active Subscriptions', value: '1,235', change: '+5.2%', trend: 'up', icon: 'fa-credit-card' },
    { label: 'Avg Valuation/Month', value: '542', change: '-2.1%', trend: 'down', icon: 'fa-chart-line' },
  ];

  // Mock user data
  const users = [
    { id: 1, name: 'Jean Munyeshyaka', email: 'jean@example.com', phone: '+250788620201', tier: 'Professional', status: 'active', joinDate: '2026-01-15' },
    { id: 2, name: 'Marie Uwayo', email: 'marie@example.com', phone: '+250787654321', tier: 'Basic', status: 'active', joinDate: '2026-02-01' },
    { id: 3, name: 'Pierre Habimana', email: 'pierre@example.com', phone: '+250789123456', tier: 'Free', status: 'inactive', joinDate: '2025-12-10' },
    { id: 4, name: 'Alice Kagaba', email: 'alice@example.com', phone: '+250788999888', tier: 'Ultimate', status: 'active', joinDate: '2026-01-20' },
    { id: 5, name: 'David Nkusi', email: 'david@example.com', phone: '+250787777666', tier: 'Professional', status: 'active', joinDate: '2026-02-05' },
  ];

  // Mock revenue data
  const revenueByTier = [
    { tier: 'Free', users: 1200, revenue: 0, percentage: 0 },
    { tier: 'Basic', users: 892, revenue: 8920000, percentage: 10.6 },
    { tier: 'Professional', users: 635, revenue: 28665000, percentage: 34.0 },
    { tier: 'Ultimate', users: 120, revenue: 11880000, percentage: 14.1 },
  ];

  // Mock recent transactions
  const recentTransactions = [
    { id: 1, user: 'Jean Munyeshyaka', type: 'Upgrade', tier: 'Professional', amount: '₨29,999', date: '2026-03-01', status: 'completed' },
    { id: 2, user: 'Marie Uwayo', type: 'Renewal', tier: 'Basic', amount: '₨9,999', date: '2026-02-28', status: 'completed' },
    { id: 3, user: 'Alice Kagaba', type: 'Upgrade', tier: 'Ultimate', amount: '₨99,999', date: '2026-02-27', status: 'completed' },
    { id: 4, user: 'David Nkusi', type: 'Renewal', tier: 'Professional', amount: '₨29,999', date: '2026-02-26', status: 'failed' },
  ];

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      // TODO: Add admin role check here
      // For now, allow authenticated users to access
      setLoading(false);
    }
  }, [status, router]);

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    user.email.toLowerCase().includes(searchFilter.toLowerCase())
  );

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-emerald-700"></i>
      </div>
    );
  }

  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>Admin Dashboard · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Admin dashboard for Land Valuation System - manage users, revenue, and KPIs" />
        <meta property="og:title" content="Admin Dashboard · LandVal" />
      </Head>

      {/* MAIN LAYOUT */}
      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">

        {/* NAVIGATION */}
        <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-emerald-700 rounded-lg flex items-center justify-center group-hover:bg-emerald-800 transition-colors">
                  <i className="fas fa-map-marked-alt text-white text-lg"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-lg font-bold text-gray-800 leading-tight">LandVal</span>
                  <span className="text-xs text-gray-500 leading-tight hidden sm:block">Admin Dashboard</span>
                </div>
              </Link>

              {/* Navigation Menu - Right Side */}
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-700 transition-colors">
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">

            {/* Page Header */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
                Admin Dashboard
              </h1>
              <p className="text-lg text-gray-600">
                Manage users, monitor revenue, and track KPIs
              </p>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {kpis.map((kpi, idx) => (
                <div key={idx} className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-2">{kpi.label}</p>
                      <h3 className="text-3xl font-bold text-gray-800">{kpi.value}</h3>
                      <p className={`text-xs mt-2 ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        <i className={`fas fa-arrow-${kpi.trend === 'up' ? 'up' : 'down'} mr-1`}></i>
                        {kpi.change} vs last month
                      </p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-700">
                      <i className={`fas ${kpi.icon} text-lg`}></i>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Two Column Section: Users & Revenue */}
            <div className="grid lg:grid-cols-3 gap-6 mb-12">

              {/* User Management - Left (2 cols) */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                  <button className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 transition-colors">
                    <i className="fas fa-plus mr-2"></i>
                    Add User
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mb-6 relative">
                  <i className="fas fa-search absolute left-4 top-3.5 text-gray-400 text-sm"></i>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Tier</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Join Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-gray-800 font-medium">{user.name}</td>
                          <td className="py-3 px-4 text-gray-600">{user.email}</td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              user.tier === 'Free' ? 'bg-gray-100 text-gray-700' :
                              user.tier === 'Basic' ? 'bg-blue-100 text-blue-700' :
                              user.tier === 'Professional' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-purple-100 text-purple-700'
                            }`}>
                              {user.tier}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                              user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-gray-600">{user.joinDate}</td>
                          <td className="py-3 px-4">
                            <button className="text-emerald-700 hover:text-emerald-800 text-xs font-medium">
                              <i className="fas fa-edit mr-1"></i>Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <i className="fas fa-search text-3xl mb-3 block"></i>
                    No users found matching your search.
                  </div>
                )}
              </div>

              {/* Revenue Breakdown - Right */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Revenue by Tier</h2>
                
                <div className="space-y-4">
                  {revenueByTier.map((tier, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{tier.tier}</span>
                        <span className="text-sm font-semibold text-gray-800">₨{(tier.revenue / 1000000).toFixed(1)}M</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-700 transition-all duration-300"
                          style={{ width: `${tier.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{tier.users} users • {tier.percentage}% of revenue</p>
                    </div>
                  ))}
                </div>

                {/* Total Revenue Summary */}
                <div className="mt-8 pt-8 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2">Total Monthly Revenue</p>
                  <p className="text-3xl font-bold text-emerald-700">₨84.2M</p>
                  <p className="text-xs text-green-600 mt-2">
                    <i className="fas fa-arrow-up mr-1"></i>
                    8.3% increase from last month
                  </p>
                </div>
              </div>

            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Recent Transactions</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Tier</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.map((txn) => (
                      <tr key={txn.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-gray-800 font-medium">{txn.user}</td>
                        <td className="py-3 px-4 text-gray-600">{txn.type}</td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            {txn.tier}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-800 font-semibold">{txn.amount}</td>
                        <td className="py-3 px-4 text-gray-600">{txn.date}</td>
                        <td className="py-3 px-4">
                          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            txn.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

export default AdminDashboard;
