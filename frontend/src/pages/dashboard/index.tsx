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
  userType?: string;
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
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false); // Track if token is already known to be expired

  const clearAuthAndRedirectToLogin = () => {
    if (authRedirecting) {
      return;
    }

    setAuthRedirecting(true);
    setLoading(false);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      // DO NOT clear admin_experience_mode - it's unrelated to auth failure
    }

    toast.error('Session expired. Please sign in again.');
    router.replace('/auth/login');
  };

  const handleProfileFetchError = (error: any) => {
    // Profile fetch errors should NOT immediately logout
    // Only logout if the response explicitly says unauthorized (401)
    console.error('Profile fetch failed:', error);
    setLoading(false);
    // Don't redirect - show a useful error instead
    toast.error('Unable to load profile. Please refresh the page or try again.');
  };

  const getAdminExperienceMode = (): 'off' | 'user' | 'ultimate' => {
    if (typeof window === 'undefined') {
      return 'off';
    }

    const rawMode = localStorage.getItem('admin_experience_mode');
    if (!rawMode) {
      return 'off';
    }

    try {
      const parsed = JSON.parse(rawMode);
      if (parsed?.mode === 'user' || parsed?.mode === 'ultimate') {
        return parsed.mode;
      }
    } catch (e) {
      console.error('Failed to parse admin experience mode:', e);
    }

    return 'off';
  };

  const refreshAdminToken = async () => {
    // Silently refresh the token for admin users to keep session alive
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (!accessToken || !storedUser) {
      return; // Not logged in
    }

    try {
      let userData: any = null;
      try {
        userData = JSON.parse(storedUser);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        return;
      }

      // Only auto-refresh for admins
      if (userData?.user_type !== 'admin') {
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/users/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload?.data) {
          // Update cached user data
          localStorage.setItem('user', JSON.stringify(payload.data));
        }
      } else if (response.status === 401) {
        // Token is expired - DON'T logout here
        // Only the main loader should handle logout on 401
        // This background refresh should fail silently
        console.debug('Admin token refresh failed: 401 Unauthorized');
      }
    } catch (error) {
      // Network error - don't logout, just skip refresh
      console.debug('Token refresh failed (network issue):', error);
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (authRedirecting) {
      return;
    }

    // Check for localStorage tokens (MFA flow) first
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (accessToken) {
      const loadUserProfile = async () => {
        let userData: any = null;

        if (storedUser) {
          try {
            userData = JSON.parse(storedUser);
          } catch (e) {
            console.error('Failed to parse stored user data:', e);
          }
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/users/profile`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (response.ok) {
            const payload = await response.json();
            if (payload?.data) {
              userData = payload.data;
              localStorage.setItem('user', JSON.stringify(userData));
            }
          } else if (response.status === 401) {
            // Token expired - mark it so we stop retrying
            setTokenExpired(true);
            // but if we have cached user data, keep using it
            // The user can continue working with stale data
            if (userData) {
              console.debug('Token expired but using cached user data');
              // Don't logout - continue with cached data
            } else {
              // No cached data and token is invalid - must logout
              clearAuthAndRedirectToLogin();
              return;
            }
          } else {
            // Other server error - but if we have cached data, continue
            if (!userData) {
              handleProfileFetchError(`Profile endpoint error: ${response.status}`);
              return;
            }
            console.debug(`Profile endpoint returned ${response.status}, using cached data`);
          }
        } catch (error) {
          // Network error - but if we have cached data, continue with it
          if (!userData) {
            handleProfileFetchError(error);
            return;
          }
          console.debug('Network error fetching profile, using cached data:', error);
        }

        if (!userData) {
          router.push('/auth/login');
          setLoading(false);
          return;
        }

        const adminExperienceMode = getAdminExperienceMode();

        if (userData.user_type === 'admin' && adminExperienceMode === 'off') {
          router.push('/admin/dashboard');
          return;
        }

        const isAdminExperiencingUserMode =
          userData.user_type === 'admin' && adminExperienceMode !== 'off';

        const effectiveSubscriptionTier = isAdminExperiencingUserMode
          ? (adminExperienceMode === 'ultimate' ? 'ultimate' : 'free')
          : (userData.subscription_tier || 'free');

        const effectiveSubscriptionExpiry = isAdminExperiencingUserMode
          ? null
          : userData.subscription_expiry;

        const effectiveUserType = isAdminExperiencingUserMode
          ? 'individual'
          : userData.user_type;

        setUser({
          id: userData.id || '1',
          email: userData.email || 'user@example.com',
          firstName: userData.first_name || 'User',
          lastName: userData.last_name || 'Account',
          userType: effectiveUserType,
          phone: userData.phone,
          subscriptionTier: effectiveSubscriptionTier,
          subscriptionExpiresAt: effectiveSubscriptionExpiry,
          referralCode: `LV-${userData.email?.split('@')[0]?.toUpperCase()}-2026`,
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
      };

      loadUserProfile();
    } else if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      // Load user data from NextAuth session
      setUser({
        id: '1',
        email: session?.user?.email || 'user@example.com',
        firstName: 'Jean',
        lastName: 'Munyeshyaka',
        userType: 'individual',
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
  }, [authRedirecting, status, session, router]);

  // Auto-refresh token for admins to prevent session expiry
  useEffect(() => {
    // Don't try to refresh if token is already expired
    if (tokenExpired) {
      return;
    }

    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (!accessToken || !storedUser) {
      return; // Not logged in
    }

    try {
      const userData = JSON.parse(storedUser);
      if (userData?.user_type !== 'admin') {
        return; // Not an admin, skip auto-refresh
      }
    } catch (e) {
      return;
    }

    // Refresh token every 5 minutes for admins
    const interval = setInterval(() => {
      refreshAdminToken();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial refresh on mount
    refreshAdminToken();

    return () => clearInterval(interval);
  }, [user?.userType, tokenExpired]);

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
  const hasValidExpiry = Boolean(
    user?.subscriptionExpiresAt && !Number.isNaN(new Date(user.subscriptionExpiresAt).getTime())
  );
  const subscriptionExpiryText = hasValidExpiry
    ? new Date(user?.subscriptionExpiresAt as string).toLocaleDateString('en-US')
    : 'Never';

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
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      localStorage.removeItem('admin_experience_mode');
                    }
                    signOut({ redirect: true, callbackUrl: '/' });
                  }}
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
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800">
                  Welcome back, {user.firstName}! 👋
                </h1>
                {user.userType === 'admin' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                    ADMIN
                  </span>
                )}
              </div>
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
                    <p className="text-3xl font-bold text-gray-800">FRW 140M</p>
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
                                FRW {(valuation.valuationPrice / 1000000).toFixed(0)}M
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
                      Expires: {subscriptionExpiryText}
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
                        href="/dashboard/subscription"
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
                      <p className="text-xl font-bold text-emerald-700">FRW 0</p>
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
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">Documentation</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">FAQ</a></li>
                  <li><Link href="/notifications" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">API</a></li>
                </ul>
              </div>

              {/* Company Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">About</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">Contact</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">Careers</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">Partners</a></li>
                </ul>
              </div>

              {/* Legal Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/legal/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link></li>
                  <li><Link href="/legal/terms" className="hover:text-emerald-400 transition-colors">Terms</Link></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">Data Protection</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">Compliance</a></li>
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
