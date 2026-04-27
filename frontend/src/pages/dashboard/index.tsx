import SubscriptionSelector from '../../components/SubscriptionSelector';
import FourStepProcess from '../../components/FourStepProcess';
import Link from 'next/link';
import toast from 'react-hot-toast';
// Notification type for dashboard notifications
interface DashboardNotification {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  title: string;
  message: string;
  type: string;
  sentAt: string;
  read: boolean;
  sentBy: string;
}
import LandEstimateResultCard from '../../components/LandEstimateResultCard';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { clearAuth, fetchWithTokenRefresh } from '../../utils/tokenRefresh';
import LandEstimateForm, { LandEstimateRequest } from '../../components/LandEstimateForm';
import Head from 'next/head';
// import Link from 'next/link';
import dynamic from 'next/dynamic';
const UserEditPropertyModal = dynamic(() => import('../../components/property/UserEditPropertyModal'), { ssr: false });
// ...existing code...

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// ...existing code...


// ...existing code...

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
  userType: string;
  phone?: string;
  subscriptionTier: string;
  subscriptionExpiresAt?: string | null;
  referralCode: string;
  recentValuations: any[];
}


function Dashboard() {
        // Handle property edit (PUT request)
        const handleEditProperty = async (updatedProperty: any) => {
          try {
            const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
            if (!accessToken) {
              toast.error('Not authenticated. Please log in again.');
              return;
            }
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/properties/${updatedProperty.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(updatedProperty),
            });
            if (!response.ok) {
              throw new Error('Failed to update property');
            }
            toast.success('Property updated successfully!');
            handleCloseEditModal();
            // Refresh properties list
            fetchProperties(propertyTab);
          } catch (err: any) {
            toast.error(err.message || 'Failed to update property');
          }
        };
      // --- Location Data for Property Modal ---
      const [provinceNames, setProvinceNames] = useState<string[]>([]);
      const [adminHierarchy, setAdminHierarchy] = useState<any>({});

      useEffect(() => {
        // Load hierarchical location JSON for province/district/sector/cell/village selectors
        const fetchLocationData = async () => {
          try {
            const res = await fetch('/land_admin_hierarchy_from_csv.json');
            const data = await res.json();
            setAdminHierarchy(data);
            setProvinceNames(Object.keys(data));
          } catch (e) {
            setAdminHierarchy({});
            setProvinceNames([]);
          }
        };
        fetchLocationData();
      }, []);
    // --- Edit Property Modal State & Handlers ---
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);

    // Open the edit modal with the selected property
    const handleOpenEditModal = (property: any) => {
      setEditForm(property);
      setEditModalOpen(true);
    };

    // Close the edit modal
    const handleCloseEditModal = () => {
      setEditModalOpen(false);
      setEditForm(null);
    };
  // Modal state and logic for View Properties (profile version)
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [propertyTab, setPropertyTab] = useState<'public' | 'registered' | 'mine'>('public');
  const [properties, setProperties] = useState<any[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  // --- Payment History modal state and logic ---
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [paymentTab, setPaymentTab] = useState<'all' | 'success' | 'failed'>('all');
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Fetch properties based on selected tab
  const fetchProperties = async (tab: 'public' | 'registered' | 'mine') => {
    setPropertiesLoading(true);
    setPropertiesError(null);
    let url = '';
    let options: RequestInit = {};
    if (tab === 'public') {
      url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/properties?visibility=public`;
    } else if (tab === 'registered') {
      url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/properties?visibility=registered`;
    } else if (tab === 'mine') {
      url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/properties/my`;
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (accessToken) {
        options.headers = { Authorization: `Bearer ${accessToken}` };
      }
    }
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }
      const data = await response.json();
      setProperties(data?.data || []);
    } catch (err: any) {
      setPropertiesError(err.message || 'Failed to fetch properties');
    } finally {
      setPropertiesLoading(false);
    }
  };

  // Payment History API fetch
  const fetchPayments = async (tab: 'all' | 'success' | 'failed') => {
    setPaymentLoading(true);
    setPaymentError(null);
    let url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/payments/history`;
    let options: RequestInit = {};
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (accessToken) {
      options.headers = { Authorization: `Bearer ${accessToken}` };
    }
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error('Failed to fetch payment history');
      }
      const data = await response.json();
      let txns = Array.isArray(data?.data) ? data.data : [];
      if (tab === 'success') {
        txns = txns.filter((t: any) => t.status === 'success');
      } else if (tab === 'failed') {
        txns = txns.filter((t: any) => t.status === 'failed');
      }
      setPayments(txns);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to fetch payment history');
    } finally {
      setPaymentLoading(false);
    }
  };

  // Open/close Payment History modal
  const handleOpenPaymentHistoryModal = () => {
    setShowPaymentHistoryModal(true);
    setPaymentTab('all');
    fetchPayments('all');
  };
  const handleClosePaymentHistoryModal = () => {
    setShowPaymentHistoryModal(false);
    setPayments([]);
    setPaymentError(null);
  };
  // Handle Payment tab change
  const handlePaymentTabChange = (tab: 'all' | 'success' | 'failed') => {
    setPaymentTab(tab);
    fetchPayments(tab);
  };

  // Open modal and fetch properties for default tab
  const handleOpenPropertiesModal = () => {
    setShowPropertiesModal(true);
    setPropertyTab('public');
    fetchProperties('public');
  };

  const handleClosePropertiesModal = () => {
    setShowPropertiesModal(false);
    setProperties([]);
    setPropertiesError(null);
  };

  // Handle tab change
  const handleTabChange = (tab: 'public' | 'registered' | 'mine') => {
    setPropertyTab(tab);
    fetchProperties(tab);
  };
    // Handles land estimate form submission
    const handleEstimate = async (estimateRequest: any) => {
      setEstimateLoading(true);
      setEstimateError(null);
      setEstimateResult(null);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/estimate-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(estimateRequest),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const apiError = payload?.error;
          const errorMessage = typeof apiError === 'string' ? apiError : apiError?.message || payload?.message || 'Estimate not found.';
          throw new Error(errorMessage);
        }
        // Always include plot_size_sqm in the result for correct total calculation
        const result = payload?.data || payload;
        const plotSize = estimateRequest.plot_size_sqm || estimateRequest.plot_size || 0;
        if (result) {
          result.plot_size_sqm = plotSize;
          // Use both ..._per_sqm and ..._value_per_sqm keys for robustness
          const min = Number(result.min_value_per_sqm ?? result.min_value ?? 0);
          const avg = Number(result.weighted_avg_per_sqm ?? result.weighted_avg_value_per_sqm ?? result.weighted_avg ?? 0);
          const max = Number(result.max_value_per_sqm ?? result.max_value ?? 0);
          if (!result.total_min_value || result.total_min_value === 0) {
            result.total_min_value = Math.round(min * plotSize);
          }
          if (!result.total_weighted_avg || result.total_weighted_avg === 0) {
            result.total_weighted_avg = Math.round(avg * plotSize);
          }
          if (!result.total_max_value || result.total_max_value === 0) {
            result.total_max_value = Math.round(max * plotSize);
          }
        }
        setEstimateResult(result);
      } catch (error: any) {
        setEstimateError(error.message || 'Failed to get estimate. Please try again.');
      } finally {
        setEstimateLoading(false);
      }
    };
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [authRedirecting, setAuthRedirecting] = useState(false);
  const [selectorError, setSelectorError] = useState<string | null>(null);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimateResult, setEstimateResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const clearAuthAndRedirectToLogin = () => {
    if (authRedirecting) {
      return;
    }
    setAuthRedirecting(true);
    setLoading(false);
    clearAuth();
    toast.error('Session expired. Please sign in again.');
    router.replace('/auth/login');
  };

  const handleLogout = async () => {
    clearAuth();
    await signOut({ redirect: false });
    router.push('/auth/login');
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
      setSelectorError('Failed to parse admin experience mode. Please reset selector.');
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

      const response = await fetchWithTokenRefresh(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/users/profile`, {
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
        // Token could not be refreshed - logout required
        console.debug('Admin token refresh failed: 401 Unauthorized');
        clearAuthAndRedirectToLogin();
      }
    } catch (error) {
      // Network error - don't logout, just skip refresh
      console.debug('Token refresh failed (network issue):', error);
    }
  };

  // Enhanced: Redirect to login if not authenticated, verify admin from backend, and block non-admins
  useEffect(() => {
    if (authRedirecting) {
      return;
    }

    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    // Helper: Set user and loading
    const setUserAndLoading = (userData: any) => {
      const adminExperienceMode = getAdminExperienceMode();
      const isAdminExperiencingUserMode = userData.user_type === 'admin' && adminExperienceMode !== 'off';
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
        recentValuations: userData.recent_valuations || [],
      });
      setLoading(false);
    };

    // Always verify with backend for up-to-date user info
    const verifyUserFromBackend = async () => {
      if (!accessToken) {
        router.replace('/auth/login');
        setLoading(false);
        return;
      }
      try {
        const response = await fetchWithTokenRefresh(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/users/profile`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (response.ok) {
          const payload = await response.json();
          if (!payload?.data) {
            router.replace('/auth/login');
            setLoading(false);
            return;
          }
          // Block banned, inactive, or deleted users (if backend provides status)
          if (payload.data.status && payload.data.status !== 'active') {
            toast.error('Account is not active. Contact support.');
            clearAuthAndRedirectToLogin();
            return;
          }
          // Block non-admins from admin dashboard
          if (payload.data.user_type === 'admin') {
            // If adminExperienceMode is off, redirect to admin dashboard
            const adminExperienceMode = getAdminExperienceMode();
            if (adminExperienceMode === 'off' && router.pathname !== '/admin/dashboard') {
              toast('Redirecting to admin dashboard...', { icon: '🔒' });
              router.replace('/admin/dashboard');
              return;
            }
          } else if (router.pathname.startsWith('/admin')) {
            // Non-admin trying to access admin dashboard
            toast.error('Access denied. Admins only.');
            router.replace('/dashboard');
            return;
          }
          setUserAndLoading(payload.data);
        } else if (response.status === 401) {
          clearAuthAndRedirectToLogin();
        } else {
          handleProfileFetchError(`Profile endpoint error: ${response.status}`);
        }
      } catch (error) {
        handleProfileFetchError(error);
      }
    };

    verifyUserFromBackend();
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

  const loadNotificationsForUser = async (targetUser: UserData) => {
    if (typeof window === 'undefined') {
      return;
    }

    const accessToken = localStorage.getItem('access_token');

    if (accessToken) {
      try {
        const response = await fetchWithTokenRefresh(`${API_BASE_URL}/api/v1/users/notifications?limit=20`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          const payload = await response.json();
          const apiNotifications: any[] = Array.isArray(payload?.data)
            ? payload.data
            : [];

          const normalized: DashboardNotification[] = apiNotifications.map((item: any) => ({
            id: item.id,
            userId: String(item.user_id ?? item.userId ?? ''),
            userEmail: String(item.userEmail ?? ''),
            userName: String(item.userName ?? ''),
            title: String(item.title ?? ''),
            message: String(item.message ?? ''),
            type: String(item.type ?? 'info'),
            sentAt: String(item.created_at ?? item.sentAt ?? new Date().toISOString()),
            read: Boolean(item.is_read ?? item.read),
            sentBy: String(item.sentBy ?? 'Admin'),
          }));

          normalized.sort(
            (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
          );

          setNotifications(normalized);
          return;
        }
      } catch (error) {
        console.debug('Failed to load notifications from API, using fallback:', error);
      }
    }

    const storedNotifications = localStorage.getItem('user_notifications');
    if (!storedNotifications) {
      setNotifications([]);
      return;
    }

    let parsedNotifications: DashboardNotification[] = [];
    try {
      parsedNotifications = JSON.parse(storedNotifications);
    } catch (error) {
      console.error('Failed to parse notifications:', error);
      setNotifications([]);
      return;
    }

    const normalizedEmail = targetUser.email.toLowerCase();
    const filtered = parsedNotifications
      .filter((item) => item.userEmail === normalizedEmail || item.userId === String(targetUser.id))
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

    setNotifications(filtered);
  };

  const markNotificationAsRead = (notificationId: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    const notificationIdStr = String(notificationId);
    const accessToken = localStorage.getItem('access_token');

    if (accessToken) {
      fetchWithTokenRefresh(`${API_BASE_URL}/api/v1/users/notifications/${notificationIdStr}/read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch((error) => {
        console.debug('Failed to mark notification read via API:', error);
      });
    }

    const storedNotifications = localStorage.getItem('user_notifications');
    if (!storedNotifications) {
      return;
    }

    let parsedNotifications: DashboardNotification[] = [];
    try {
      parsedNotifications = JSON.parse(storedNotifications);
    } catch (error) {
      console.error('Failed to parse notifications:', error);
      return;
    }

    const updated = parsedNotifications.map((item) =>
      String(item.id) === notificationIdStr ? { ...item, read: true } : item
    );

    localStorage.setItem('user_notifications', JSON.stringify(updated));
    setNotifications((prev) => prev.map((item) =>
      String(item.id) === notificationIdStr ? { ...item, read: true } : item
    ));
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    void loadNotificationsForUser(user);
  }, [user]);

  // Get subscription tier info
  const getTierInfo = (tier: string) => {
    const tiers: { [key: string]: { color: string; name: string; valuations: number } } = {
      free: { color: 'emerald', name: 'Free', valuations: 3 },
      basic: { color: 'blue', name: 'Basic', valuations: 15 },
      professional: { color: 'purple', name: 'Professional', valuations: -1 },
      ultimate: { color: 'yellow', name: 'Ultimate', valuations: -1 },
    };
    return tiers[tier] || tiers.free;
  };

  const tierInfo = user ? getTierInfo(user.subscriptionTier) : null;
  const usedValuations = user?.recentValuations.length || 0;
  const maxValuations = tierInfo?.valuations || 3;
  const unreadNotifications = notifications.filter((item) => !item.read).length;
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
        <title>User Dashboard · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="User dashboard for Land Valuation System - manage your profile, subscription, and valuations" />
        <meta property="og:title" content="User Dashboard · LandVal" />
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
                  <span className="text-xs text-gray-500 leading-tight hidden sm:block">User Dashboard</span>
                </div>
              </Link>
              {/* Navigation Menu - Right Side */}
              <div className="hidden lg:flex items-center gap-2 sm:gap-4">
                <Link href="/dashboard/profile" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-700 transition-colors">
                  <i className="fas fa-user-circle mr-1"></i>
                  View Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>

              <div className="lg:hidden flex items-center">
                <button
                  aria-label="Toggle dashboard menu"
                  type="button"
                  className="inline-flex items-center justify-center p-2 rounded-md text-emerald-800 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                >
                  {mobileMenuOpen ? <i className="fas fa-times text-2xl"></i> : <i className="fas fa-bars text-2xl"></i>}
                </button>
              </div>
            </div>

            {mobileMenuOpen && (
              <div className="lg:hidden fixed left-0 right-0 top-16 bg-white border-b border-gray-200 shadow-lg z-[80] pointer-events-auto">
                <div className="flex flex-col gap-2 pt-4">
                  <Link
                    href="/dashboard/profile"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fas fa-user-circle mr-2"></i>
                    View Profile
                  </Link>
                  <Link
                    href="/properties/add"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fas fa-plus-circle mr-2"></i>
                    Add Property
                  </Link>
                  <Link
                    href="/dashboard/subscription"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fas fa-gem mr-2"></i>
                    Upgrade Plan
                  </Link>
                  <Link
                    href="/analytics"
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-50"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="fas fa-chart-line mr-2"></i>
                    Analytics
                  </Link>
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                  >
                    <i className="fas fa-sign-out-alt mr-2"></i>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            {/* Admin Experience Selector for Admins */}
            {selectorError && (
              <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                {selectorError}
                <button
                  className="ml-4 px-3 py-1 bg-red-600 text-white rounded"
                  onClick={() => {
                    localStorage.removeItem('admin_experience_mode');
                    window.location.reload();
                  }}
                >
                  Reset Selector
                </button>
              </div>
            )}
            {/* Quick Navigation - moved above FourStepProcess as requested */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
              <Link
                href="/properties/add"
                className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-emerald-500 to-emerald-600 border border-emerald-600 rounded-lg hover:shadow-lg hover:from-emerald-600 hover:to-emerald-700 transition-all group"
              >
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                  <i className="fas fa-plus-circle text-emerald-700 text-xl"></i>
                </div>
                <span className="text-sm font-semibold text-white">Add Property</span>
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
                href="/dashboard/subscription"
                className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-100 rounded-lg hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <i className="fas fa-gem text-amber-700 text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-gray-800">Upgrade Plan</span>
              </Link>
              {/* View Properties quick nav card (profile modal version) */}
              <button
                type="button"
                onClick={handleOpenPropertiesModal}
                className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-100 rounded-lg hover:shadow-md hover:border-emerald-200 transition-all group"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <i className="fas fa-eye text-emerald-700 text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-gray-800">View Properties</span>
              </button>
              {/* Payment History quick nav card */}
              <button
                type="button"
                onClick={handleOpenPaymentHistoryModal}
                className="flex flex-col items-center gap-3 p-4 bg-white border border-gray-100 rounded-lg hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <i className="fas fa-wallet text-blue-700 text-lg"></i>
                </div>
                <span className="text-sm font-semibold text-gray-800">Payment History</span>
              </button>

              {/* View Properties Modal (profile version) */}

              {showPropertiesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                  <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative animate-fade-in">
                    <button
                      className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
                      onClick={handleClosePropertiesModal}
                      aria-label="Close"
                    >
                      &times;
                    </button>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <i className="fas fa-building"></i>
                      View Properties
                    </h2>
                    {/* Selector Tabs */}
                    <div className="flex gap-2 mb-4">
                      <button
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${propertyTab === 'public' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}
                        onClick={() => handleTabChange('public')}
                      >
                        Public
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${propertyTab === 'registered' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}
                        onClick={() => handleTabChange('registered')}
                      >
                        Registered
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${propertyTab === 'mine' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}
                        onClick={() => handleTabChange('mine')}
                      >
                        Only mine
                      </button>
                    </div>
                    {propertiesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <i className="fas fa-spinner fa-spin text-2xl text-emerald-700"></i>
                        <span className="ml-3 text-gray-600">Loading...</span>
                      </div>
                    ) : propertiesError ? (
                      <div className="text-red-600 py-4">{propertiesError}</div>
                    ) : properties.length === 0 ? (
                      <div className="text-gray-600 py-4">No properties found.</div>
                    ) : (
                      <div className="overflow-y-auto max-h-96 divide-y divide-gray-100">
                        {properties.map((prop) => (
                          <div key={prop.id} className="py-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-800">{prop.title || 'Untitled Property'}</div>
                                <div className="text-sm text-gray-500">{prop.location}</div>
                                {prop.price && (
                                  <div className="text-sm text-emerald-700 font-bold">RWF {prop.price.toLocaleString()}</div>
                                )}
                                {prop.description && (
                                  <div className="text-xs text-gray-600 mt-1">{prop.description}</div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {prop.owner_id === user.id && propertyTab === 'mine' && (
                                  <button
                                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                    onClick={() => handleOpenEditModal(prop)}
                                  >
                                    <i className="fas fa-edit mr-1"></i>Edit
                                  </button>
                                )}
                                {prop.owner_name && (
                                  <div className="text-xs text-gray-400 text-right">By: {prop.owner_name}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* User Edit Property Modal */}
                  {editModalOpen && editForm && (
                    <UserEditPropertyModal
                      editForm={editForm}
                      setEditForm={setEditForm}
                      onEdit={handleEditProperty}
                      onClose={handleCloseEditModal}
                      provinceNames={provinceNames}
                      adminHierarchy={adminHierarchy}
                    />
                  )}
                </div>
              )}


            {/* Payment History Modal (always at root, not inside grid) */}
            {showPaymentHistoryModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative animate-fade-in">
                  <button
                    className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
                    onClick={handleClosePaymentHistoryModal}
                    aria-label="Close"
                  >
                    &times;
                  </button>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <i className="fas fa-wallet"></i>
                    Payment History
                  </h2>
                  {/* Selector Tabs */}
                  <div className="flex gap-2 mb-4">
                    <button
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${paymentTab === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}
                      onClick={() => handlePaymentTabChange('all')}
                    >
                      All
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${paymentTab === 'success' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-green-50'}`}
                      onClick={() => handlePaymentTabChange('success')}
                    >
                      Success
                    </button>
                    <button
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${paymentTab === 'failed' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-red-50'}`}
                      onClick={() => handlePaymentTabChange('failed')}
                    >
                      Failed
                    </button>
                  </div>
                  {paymentLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <i className="fas fa-spinner fa-spin text-2xl text-blue-700"></i>
                      <span className="ml-3 text-gray-600">Loading...</span>
                    </div>
                  ) : paymentError ? (
                    <div className="text-red-600 py-4">{paymentError}</div>
                  ) : payments.length === 0 ? (
                    <div className="text-gray-600 py-4">No payment records found.</div>
                  ) : (
                    <div className="overflow-y-auto max-h-96 divide-y divide-gray-100">
                      {payments.map((txn) => (
                        <div key={txn.id} className="py-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-800">{txn.description || 'Payment'}</div>
                              <div className="text-sm text-gray-500">{txn.date}</div>
                              <div className="text-sm font-bold text-blue-700">RWF {txn.amount?.toLocaleString()}</div>
                              <div className={`text-xs mt-1 ${txn.status === 'success' ? 'text-green-600' : txn.status === 'failed' ? 'text-red-600' : 'text-gray-600'}`}>{txn.status}</div>
                            </div>
                            {txn.reference && (
                              <div className="text-xs text-gray-400 text-right">Ref: {txn.reference}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
            {/* Four Steps Process - now below Quick Navigation */}
            <FourStepProcess />
            {renderAdminExperienceSelector(user, router, getAdminExperienceMode)}

            {/* Refined Estimate Search (matches home page) */}
            {/* Registration Prompt Modal */}
            {showRegisterPrompt && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
                  <h2 className="text-2xl font-bold mb-2 text-emerald-800">Register to Continue</h2>
                  <p className="mb-4 text-gray-700">You need to create an account to use the Estimate feature.</p>
                  <Link href="/auth/register" className="inline-block bg-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-emerald-700 transition mb-2">Register Now</Link>
                  <br />
                  <button onClick={() => setShowRegisterPrompt(false)} className="mt-2 text-sm text-gray-500 hover:underline">Cancel</button>
                </div>
              </div>
            )}
            {/* Two-column layout for Land Estimate Search and Result */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left: Land Estimate Search */}
              <div className="bg-white border border-amber-200 rounded-2xl shadow-sm p-6">
                <h2 className="text-xl font-bold text-emerald-800 mb-2 flex items-center gap-2">
                  <i className="fas fa-search-location text-amber-400"></i>
                  Land Estimate Search
                </h2>
                <LandEstimateForm onEstimate={handleEstimate} disabled={estimateLoading} />
                {estimateError && (
                  <div className="mt-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl max-w-xl">
                    <i className="fas fa-exclamation-circle mr-2"></i> {estimateError}
                  </div>
                )}
              </div>
              {/* Right: Land Value Estimate Result */}
              <div className="flex items-start justify-center">
                {estimateResult ? (
                  <LandEstimateResultCard estimateResult={estimateResult} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 italic p-8">
                    <span>No estimate result yet.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Navigation moved above FourStepProcess */}

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
                  
                  <div>
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
                    <p className="text-3xl font-bold text-gray-800">RWF 140M</p>
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
                                RWF {(valuation.valuationPrice / 1000000).toFixed(0)}M
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
                        Choose Basic
                      </Link>
                    )}
                  </div>
                </div>

                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">Admin Notifications</h2>
                    {unreadNotifications > 0 && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                        {unreadNotifications} new
                      </span>
                    )}
                  </div>

                  {notifications.length > 0 ? (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {notifications.slice(0, 5).map((notification) => (
                        <div
                          key={notification.id}
                          className={`border rounded-lg p-3 ${notification.read ? 'border-gray-200 bg-gray-50' : 'border-blue-200 bg-blue-50'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{notification.title}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.sentAt).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            {!notification.read && (
                              <button
                                onClick={() => markNotificationAsRead(String(notification.id))}
                                className="text-xs font-medium text-blue-700 hover:text-blue-800"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-700 mt-2">{notification.message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">No notifications yet.</p>
                  )}
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
                      <p className="text-xl font-bold text-emerald-700">RWF 0</p>
                      <p className="text-gray-600">Earned</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Subscription Plans Selector */}
            <div className="mt-16 mb-12">
              <SubscriptionSelector currentPlan={user.subscriptionTier} />
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
                  <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
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
}

export default Dashboard;

// Admin experience mode selector for admins (now takes arguments)
const renderAdminExperienceSelector = (
  user: UserData | null,
  router: ReturnType<typeof useRouter>,
  getAdminExperienceMode: () => 'off' | 'user' | 'ultimate'
) => {
  try {
    // Accept only userType (UserData interface)
    const isAdmin = user?.userType === 'admin';
    if (isAdmin) {
      const adminExperienceMode = getAdminExperienceMode();
      return (
        <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex gap-2 items-center">
            <span className="text-xs font-semibold rounded-lg border px-3 py-1 bg-amber-50 text-amber-700 border-amber-200">
              Admin Experience Mode:
              <span className="ml-2 font-bold">{adminExperienceMode === 'off' ? 'Admin' : adminExperienceMode === 'ultimate' ? 'Ultimate (No Expiry)' : 'User'}</span>
            </span>
            <select
              value={adminExperienceMode}
              onChange={e => {
                const mode = e.target.value;
                if (mode === 'off' || mode === 'user' || mode === 'ultimate') {
                  try {
                    localStorage.setItem('admin_experience_mode', JSON.stringify({ mode, enabledAt: new Date().toISOString() }));
                    window.location.reload();
                  } catch (err) {
                    alert('Failed to update admin experience mode. Please clear your browser storage and try again.');
                  }
                }
              }}
              className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg bg-white hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="off">Admin Mode</option>
              <option value="user">View as User</option>
              <option value="ultimate">View as Ultimate (No Expiry)</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow"
            >
              <i className="fas fa-user-shield"></i>
              Go to Admin Dashboard
            </button>
          </div>
        </div>
      );
    }
    return null;
  } catch (err) {
    // Fallback UI if selector fails
    return (
      <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg">
        <i className="fas fa-exclamation-triangle mr-2"></i>
        Failed to render admin experience selector. Please reload the page or clear your browser storage.
      </div>
    );
  }
};
