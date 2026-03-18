import LandEstimateResultCard from '../../components/LandEstimateResultCard';
import React, { useState, useEffect } from 'react';
import LandEstimateForm, { LandEstimateRequest } from '../../components/LandEstimateForm';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

/**
 * ANALYTICS DASHBOARD PAGE · Land Valuation System
 * 
 * Purpose: Advanced metrics, charts, trends, and property valuation insights
 * Features:
 * - Valuation trends (monthly chart)
 * - Revenue trends (monthly chart)
 * - Top locations insights
 * - Property type distribution
 * - User activity metrics
 * - Export reports
 */

const Analytics: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [estimateResult, setEstimateResult] = useState<any | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);

  const handleEstimate = async (params: LandEstimateRequest) => {
    setEstimateLoading(true);
    setEstimateError(null);
    setEstimateResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/v1/land-value-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Failed to fetch estimate');
      const payload = await res.json();
      setEstimateResult(payload.data || null);
    } catch (err: any) {
      setEstimateError(err.message || 'Unknown error');
    } finally {
      setEstimateLoading(false);
    }
  };
  const [dateRange, setDateRange] = useState('3months');

  // Mock valuation trend data
  const valuationTrends = [
    { month: 'Jan', valuations: 142, users: 245 },
    { month: 'Feb', valuations: 168, users: 312 },
    { month: 'Mar', valuations: 195, users: 387 },
  ];

  // Mock revenue trend data
  const revenueTrends = [
    { month: 'Jan', revenue: 2400, costs: 1200 },
    { month: 'Feb', revenue: 3100, costs: 1400 },
    { month: 'Mar', revenue: 3800, costs: 1600 },
  ];

  // Mock top locations
  const topLocations = [
    { location: 'Kigali Central', valuations: 487, avgPrice: 'FRW 85.2M', trend: '+18%' },
    { location: 'Nyarutarama', valuations: 342, avgPrice: 'FRW 52.6M', trend: '+12%' },
    { location: 'Kimironko', valuations: 298, avgPrice: 'FRW 45.3M', trend: '+8%' },
    { location: 'Rebero', valuations: 214, avgPrice: 'FRW 38.9M', trend: '+5%' },
    { location: 'Gisozi', valuations: 187, avgPrice: 'FRW 32.1M', trend: '+3%' },
  ];

  // Mock property types
  const propertyTypes = [
    { type: 'Residential', count: 892, percentage: 42, color: 'bg-emerald-600' },
    { type: 'Commercial', count: 524, percentage: 25, color: 'bg-blue-600' },
    { type: 'Agricultural', count: 356, percentage: 17, color: 'bg-amber-600' },
    { type: 'Industrial', count: 256, percentage: 12, color: 'bg-purple-600' },
  ];

  // Mock user activity
  const userActivity = [
    { metric: 'New Registrations', value: 142, change: '+12.5%', icon: 'fa-user-plus' },
    { metric: 'Active Users (30d)', value: 1847, change: '+8.3%', icon: 'fa-users' },
    { metric: 'Avg Session Time', value: '14min', change: '+3.2%', icon: 'fa-clock' },
    { metric: 'Repeat Users', value: '64%', change: '+5.1%', icon: 'fa-repeat' },
  ];

  // Redirect to login if not authenticated
  useEffect(() => {
    // Check for localStorage tokens (MFA flow) first
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

  const handleExportReport = (format: string) => {
    toast.success(`Report exported as ${format.toUpperCase()}!`);
    // In real app, this would trigger actual export
  };

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
        <title>Analytics · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Analytics dashboard with insights on valuations, revenue, and user activity" />
        <meta property="og:title" content="Analytics · LandVal" />
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
                  <span className="text-xs text-gray-500 leading-tight hidden sm:block">Rwanda Property Valuation</span>
                </div>
              </Link>

              {/* Navigation Menu - Right Side */}
              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors">
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">

            {/* Quick Land Value Estimate */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-5">Quick Land Value Estimate</h2>
              <LandEstimateForm onEstimate={handleEstimate} disabled={estimateLoading} />
              {estimateError && <div className="text-red-600 mt-4">{estimateError}</div>}
              {estimateResult && (
                <LandEstimateResultCard estimateResult={estimateResult} />
              )}
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-12">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
                  Analytics
                </h1>
                <p className="text-lg text-gray-600">
                  Insights into valuations, revenue, and user engagement
                </p>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportReport('pdf')}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-file-pdf"></i>
                  PDF
                </button>
                <button
                  onClick={() => handleExportReport('csv')}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-file-csv"></i>
                  CSV
                </button>
              </div>
            </div>

            {/* Date Range Selector */}
            <div className="mb-8 flex gap-2">
              {['1month', '3months', '6months', '1year'].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    dateRange === range
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {range === '1month' ? '1M' : range === '3months' ? '3M' : range === '6months' ? '6M' : '1Y'}
                </button>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-6 mb-12">

              {/* Valuation Trend */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Valuation Trend</h2>
                
                <div className="space-y-6">
                  {valuationTrends.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{item.month}</span>
                        <span className="text-sm font-semibold text-emerald-700">{item.valuations} valuations</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${(item.valuations / 200) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{item.users} users</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Total Monthly Valuations</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">505</p>
                  <p className="text-xs text-green-600 mt-2">
                    <i className="fas fa-arrow-up mr-1"></i>
                    +37.3% from last quarter
                  </p>
                </div>
              </div>

              {/* Revenue Trend */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Revenue Trend</h2>
                
                <div className="space-y-6">
                  {revenueTrends.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{item.month}</span>
                        <span className="text-sm font-semibold text-emerald-700">FRW {(item.revenue / 100).toFixed(0)}k</span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all duration-300"
                          style={{ width: `${(item.revenue / 4000) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Profit: FRW {(item.revenue - item.costs)}k</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Total Revenue (3M)</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">FRW 9.3M</p>
                  <p className="text-xs text-green-600 mt-2">
                    <i className="fas fa-arrow-up mr-1"></i>
                    +58.3% from previous quarter
                  </p>
                </div>
              </div>

            </div>

            {/* Top Locations & Property Types */}
            <div className="grid lg:grid-cols-3 gap-6 mb-12">

              {/* Top Locations */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Top Locations</h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Location</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Valuations</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Avg Price</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Trend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topLocations.map((loc, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 text-gray-800 font-medium">{loc.location}</td>
                          <td className="py-3 px-4 text-gray-600">{loc.valuations}</td>
                          <td className="py-3 px-4 text-gray-800 font-semibold">{loc.avgPrice}</td>
                          <td className="py-3 px-4">
                            <span className="text-green-600 font-semibold flex items-center gap-1">
                              <i className="fas fa-arrow-up text-xs"></i>
                              {loc.trend}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Property Type Distribution */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Property Types</h2>

                <div className="space-y-4">
                  {propertyTypes.map((pt, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">{pt.type}</span>
                        <span className="text-sm font-semibold text-gray-800">{pt.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pt.color} transition-all duration-300`}
                          style={{ width: `${pt.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{pt.count} properties</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-sm text-gray-600">Total Properties</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-1">2,028</p>
                </div>
              </div>

            </div>

            {/* User Activity Metrics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-6">User Activity</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {userActivity.map((activity, idx) => (
                  <div key={idx} className="p-4 border border-gray-100 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-sm font-medium text-gray-600">{activity.metric}</p>
                      <div className="w-8 h-8 bg-emerald-100 rounded text-emerald-700 flex items-center justify-center">
                        <i className={`fas ${activity.icon} text-sm`}></i>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{activity.value}</p>
                    <p className="text-xs text-green-600 mt-2">
                      <i className="fas fa-arrow-up mr-1"></i>
                      {activity.change}
                    </p>
                  </div>
                ))}
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

export default Analytics;
