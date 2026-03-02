import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';

/**
 * USER DASHBOARD · Land Valuation System
 * 
 * Purpose: Post-login hub for users
 * Features:
 * - Profile overview
 * - Subscription status & usage
 * - Recent valuations
 * - Referral code
 * 
 * Design System Compliance:
 * - Colors: Emerald primary, gray text/borders, white cards
 * - Layout: max-w-7xl container, py-12 spacing
 * - Components: Buttons, cards, stat boxes
 */

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  subscriptionTier: 'free' | 'basic' | 'professional' | 'ultimate';
  subscriptionExpiresAt?: string;
  referralCode: string;
  recentValuations: Array<{
    id: string;
    location: string;
    area: number;
    valuationPrice: number;
    createdAt: string;
  }>;
}

const Dashboard: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      // Load user data (mock for now)
      setUser({
        id: '1',
        email: session?.user?.email || 'user@example.com',
        firstName: 'Jean',
        lastName: 'Munyeshyaka',
        phone: '+250 788 123 456',
        subscriptionTier: 'free',
        subscriptionExpiresAt: '2026-04-02',
        referralCode: 'LV-JEANMUN-2026',
        recentValuations: [
          {
            id: '1',
            location: 'Kigali, Rwanda',
            area: 250,
            valuationPrice: 150000000,
            createdAt: '2026-03-01',
          },
          {
            id: '2',
            location: 'Nyanza, Rwanda',
            area: 150,
            valuationPrice: 89000000,
            createdAt: '2026-02-28',
          },
          {
            id: '3',
            location: 'Muhanga, Rwanda',
            area: 300,
            valuationPrice: 180000000,
            createdAt: '2026-02-25',
          },
        ],
      });
      setLoading(false);
    }
  }, [status, session, router]);

  // Copy referral code to clipboard
  const copyReferralCode = () => {
    if (user) {
      navigator.clipboard.writeText(user.referralCode);
      setCopied(true);
      toast.success('Referral code copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Get subscription tier info
  const getTierInfo = (tier: string) => {
    const tiers: { [key: string]: { color: string; name: string; valuations: number } } = {
      free: { color: 'emerald', name: 'Free', valuations: 5 },
      basic: { color: 'blue', name: 'Basic', valuations: 10 },
      professional: { color: 'purple', name: 'Professional', valuations: -1 },
      ultimate: { color: 'yellow', name: 'Ultimate', valuations: -1 },
    };
    return tiers[tier] || tiers.free;
  };

  const tierInfo = user ? getTierInfo(user.subscriptionTier) : null;
  const usedValuations = user?.recentValuations.length || 0;
  const maxValuations = tierInfo?.valuations || 5;

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-emerald-700"></i>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>Dashboard · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Your Land Valuation System dashboard - manage profile, subscriptions, and valuations" />
        <meta property="og:title" content="Dashboard · LandVal" />
        <meta property="og:description" content="Your personal land valuation dashboard" />
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
                {/* Dashboard Link */}
                <Link href="/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-emerald-700 transition-colors">
                  <i className="fas fa-home text-base"></i>
                  Dashboard
                </Link>

                {/* Language Selector */}
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-emerald-700 transition-colors">
                  <i className="fas fa-globe text-base"></i>
                  <span className="hidden sm:inline">EN</span>
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={() => signOut({ redirect: true, callbackUrl: '/' })}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Welcome back, {user.firstName}! 👋
              </h1>
              <p className="text-base text-gray-600">
                Manage your profile, subscription, and track your valuations
              </p>
            </div>

            {/* Quick Navigation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Link
                href="/search"
                className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-100 rounded-lg hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <i className="fas fa-search text-emerald-700 text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-gray-800">Search Properties</span>
              </Link>

              <Link
                href="/analytics"
                className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-100 rounded-lg hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <i className="fas fa-chart-line text-blue-700 text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-gray-800">Analytics</span>
              </Link>

              <Link
                href="/payments"
                className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-100 rounded-lg hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <i className="fas fa-credit-card text-purple-700 text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-gray-800">Payment History</span>
              </Link>

              <Link
                href="/dashboard/subscription"
                className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-100 rounded-lg hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <i className="fas fa-gem text-amber-700 text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-gray-800">Upgrade Plan</span>
              </Link>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              
              {/* Left Column: Profile & Stats */}
              <div className="lg:col-span-2 space-y-6">

                {/* Profile Card */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">Profile Overview</h2>
                    <Link
                      href="/dashboard/profile"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                    >
                      <i className="fas fa-edit"></i>
                      Edit Profile
                    </Link>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Profile Info */}
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Full Name</p>
                        <p className="text-base font-medium text-gray-800">{user.firstName} {user.lastName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Email</p>
                        <p className="text-base font-medium text-gray-800">{user.email}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Phone</p>
                        <p className="text-base font-medium text-gray-800">{user.phone || 'Not set'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Member Since</p>
                        <p className="text-base font-medium text-gray-800">March 2, 2026</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Total Valuations */}
                  <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Total Valuations</h3>
                      <i className="fas fa-chart-bar text-emerald-700 text-lg"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">{user.recentValuations.length}</p>
                    <p className="text-xs text-gray-500 mt-2">Lifetime property assessments</p>
                  </div>

                  {/* This Month */}
                  <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">This Month</h3>
                      <i className="fas fa-calendar-alt text-blue-600 text-lg"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">2</p>
                    <p className="text-xs text-gray-500 mt-2">Properties valued this month</p>
                  </div>

                  {/* Average Value */}
                  <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">Avg Value</h3>
                      <i className="fas fa-coins text-yellow-600 text-lg"></i>
                    </div>
                    <p className="text-3xl font-bold text-gray-800">₨140M</p>
                    <p className="text-xs text-gray-500 mt-2">Average valuation price</p>
                  </div>
                </div>

                {/* Recent Valuations */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">Recent Valuations</h2>
                  
                  {user.recentValuations.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="border-b border-gray-200">
                          <tr>
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Location</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Area (m²)</th>
                            <th className="text-right py-3 px-2 font-medium text-gray-700">Valuation</th>
                            <th className="text-left py-3 px-2 font-medium text-gray-700">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {user.recentValuations.slice(0, 5).map(valuation => (
                            <tr key={valuation.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-2 text-gray-800">{valuation.location}</td>
                              <td className="py-3 px-2 text-gray-700">{valuation.area.toLocaleString('en-US')}</td>
                              <td className="py-3 px-2 text-right font-medium text-emerald-700">
                                ₨{(valuation.valuationPrice / 1000000).toFixed(0)}M
                              </td>
                              <td className="py-3 px-2 text-gray-600">
                                {new Date(valuation.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-600 py-4">No valuations yet. Start by searching for properties!</p>
                  )}
                </div>

              </div>

              {/* Right Column: Subscription & Referral */}
              <div className="space-y-6">

                {/* Subscription Card */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Subscription</h2>
                  
                  {/* Tier Badge */}
                  <div className="mb-4 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Current Tier</span>
                      <span className="inline-block px-3 py-1 bg-emerald-700 text-white text-xs font-semibold rounded-full">
                        {tierInfo?.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Expires: {new Date(user.subscriptionExpiresAt || '').toLocaleDateString('en-US')}
                    </p>
                  </div>

                  {/* Usage Bar (for Free tier) */}
                  {user.subscriptionTier === 'free' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">Valuations Used</span>
                        <span className="text-sm font-semibold text-emerald-700">{usedValuations}/{maxValuations}</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-700 transition-all duration-300"
                          style={{ width: `${(usedValuations / maxValuations) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {maxValuations - usedValuations} valuations remaining
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2">
                    <Link
                      href="/dashboard/subscription"
                      className="block w-full px-4 py-2.5 text-center text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                    >
                      <i className="fas fa-arrow-right mr-2"></i>
                      Manage Subscription
                    </Link>
                    {user.subscriptionTier === 'free' && (
                      <Link
                        href="/checkout"
                        className="block w-full px-4 py-2.5 text-center text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        <i className="fas fa-star mr-2"></i>
                        Upgrade to Premium
                      </Link>
                    )}
                  </div>
                </div>

                {/* Referral Card */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                  <h2 className="text-lg font-semibold text-gray-800 mb-4">Referral Program</h2>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Share your referral code with friends and earn rewards!
                  </p>

                  {/* Referral Code */}
                  <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">Your Code</p>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-sm font-semibold text-gray-800 flex-1">{user.referralCode}</code>
                      <button
                        onClick={copyReferralCode}
                        className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <i className={`fas ${copied ? 'fa-check' : 'fa-copy'} text-base`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Referral Stats */}
                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="p-2.5 bg-gray-50 rounded">
                      <p className="text-xl font-bold text-emerald-700">0</p>
                      <p className="text-gray-600">Referrals</p>
                    </div>
                    <div className="p-2.5 bg-gray-50 rounded">
                      <p className="text-xl font-bold text-emerald-700">₨0</p>
                      <p className="text-gray-600">Earned</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              
              {/* Brand Column */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-map-marked-alt text-white text-lg"></i>
                  </div>
                  <span className="text-lg font-bold text-white">LandVal</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Rwanda's trusted platform for accurate land and property valuation.
                </p>
              </div>

              {/* Resources Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Resources</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/docs" className="hover:text-emerald-400 transition-colors">Documentation</Link></li>
                  <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                  <li><Link href="/support" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                  <li><Link href="/api" className="hover:text-emerald-400 transition-colors">API</Link></li>
                </ul>
              </div>

              {/* Company Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About</Link></li>
                  <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
                  <li><Link href="/careers" className="hover:text-emerald-400 transition-colors">Careers</Link></li>
                  <li><Link href="/partners" className="hover:text-emerald-400 transition-colors">Partners</Link></li>
                </ul>
              </div>

              {/* Legal Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link></li>
                  <li><Link href="/data-protection" className="hover:text-emerald-400 transition-colors">Data Protection</Link></li>
                  <li><Link href="/compliance" className="hover:text-emerald-400 transition-colors">Compliance</Link></li>
                </ul>
              </div>

            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} LandVal. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://twitter.com/landval" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  <i className="fab fa-twitter text-lg"></i>
                </a>
                <a href="https://linkedin.com/company/landval" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  <i className="fab fa-linkedin text-lg"></i>
                </a>
                <a href="https://facebook.com/landval" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  <i className="fab fa-facebook text-lg"></i>
                </a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default Dashboard;
