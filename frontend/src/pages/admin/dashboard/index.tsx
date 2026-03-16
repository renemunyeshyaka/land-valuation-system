
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import toast from 'react-hot-toast';
import { fetchWithTokenRefresh, startTokenRefreshInterval, clearAuth } from '@/utils/tokenRefresh';
import FourStepProcess from '../../../components/FourStepProcess';
import SubscriptionSelector from '../../../components/SubscriptionSelector';


// ...existing imports...



const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface AdminNotification {
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
    // Estimate Search State and handlers
    const [searchForm, setSearchForm] = useState({
      province: '',
      district: '',
      sector: '',
      upi: '',
    });
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [estimateResult, setEstimateResult] = useState<any>(null);

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchForm({ ...searchForm, [e.target.name]: e.target.value });
    };

    const handleEstimateSearch = async () => {
      setSearchLoading(true);
      setSearchError('');
      setEstimateResult(null);
      try {
        const payload = await fetchWithTokenRefresh(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/estimate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(searchForm),
          }
        ).then(res => res.json());
        if (!payload || payload.error) {
          const apiError = payload?.error;
          const errorMessage = typeof apiError === 'string' ? apiError : apiError?.message || payload?.message || 'Estimate not found.';
          throw new Error(errorMessage);
        }
        setEstimateResult(payload?.data || payload);
      } catch (err: any) {
        setSearchError(err.message || 'Failed to fetch estimate. Please try again.');
      } finally {
        setSearchLoading(false);
      }
    };

    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleEstimateSearch();
      }
    };
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [adminUser, setAdminUser] = useState<any>(null);
  const [adminExperienceMode, setAdminExperienceMode] = useState<'off' | 'user' | 'ultimate'>('off');
  const [tokenExpired, setTokenExpired] = useState(false); // Track if token is already known to be expired
  const [users, setUsers] = useState([
    { id: 1, name: 'Jean Munyeshyaka', email: 'jean@example.com', phone: '+250788620201', tier: 'Basic', status: 'active', joinDate: '2026-01-15' },
    { id: 2, name: 'Marie Uwayo', email: 'marie@example.com', phone: '+250787654321', tier: 'Professional', status: 'active', joinDate: '2026-02-01' },
    { id: 3, name: 'Pierre Habimana', email: 'pierre@example.com', phone: '+250789123456', tier: 'Free', status: 'inactive', joinDate: '2025-12-10' },
    { id: 4, name: 'Alice Kagaba', email: 'alice@example.com', phone: '+250788999888', tier: 'Ultimate', status: 'active', joinDate: '2026-01-20' },
    { id: 5, name: 'David Nkusi', email: 'david@example.com', phone: '+250787777666', tier: 'Basic', status: 'active', joinDate: '2026-02-05' },
  ]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', tier: 'Free', status: 'active' });
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationUser, setNotificationUser] = useState<any>(null);
  const [notificationData, setNotificationData] = useState({ title: '', message: '', type: 'info' });

  const clearAuthAndRedirectToLogin = () => {
    clearAuth();
    router.replace('/auth/login');  // Use replace instead of push for one-way navigation
  };

  const readAdminExperienceMode = (): 'off' | 'user' | 'ultimate' => {
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

  const setExperienceMode = (mode: 'off' | 'user' | 'ultimate') => {
    if (typeof window === 'undefined') {
      return;
    }

    if (mode === 'off') {
      localStorage.removeItem('admin_experience_mode');
      setAdminExperienceMode('off');
      toast.success('Admin mode restored');
      return;
    }

    localStorage.setItem(
      'admin_experience_mode',
      JSON.stringify({ mode, enabledAt: new Date().toISOString() })
    );
    setAdminExperienceMode(mode);

    if (mode === 'user') {
      toast.success('Switched to user experience mode');
    } else {
      toast.success('Switched to Ultimate non-expiry experience mode');
    }

    router.push('/dashboard');
  };

  const handleAdminExperienceMenu = (value: string) => {
    if (value === 'user') {
      setExperienceMode('user');
      return;
    }

    if (value === 'ultimate') {
      setExperienceMode('ultimate');
      return;
    }

    if (value === 'off') {
      setExperienceMode('off');
    }
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

      const response = await fetchWithTokenRefresh(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/users/profile`, {
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

  // Load users from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAdminExperienceMode(readAdminExperienceMode());
      const savedUsers = localStorage.getItem('admin_users');
      if (savedUsers) {
        try {
          setUsers(JSON.parse(savedUsers));
        } catch (e) {
          console.error('Failed to load saved users:', e);
        }
      }
    }
  }, []);

  // Save users to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && users.length > 0) {
      localStorage.setItem('admin_users', JSON.stringify(users));
    }
  }, [users]);

  // Mock KPI data
  const kpis = [
    { label: 'Total Users', value: '2,847', change: '+12.5%', trend: 'up', icon: 'fa-users' },
    { label: 'Total Revenue', value: 'FRW 84.2M', change: '+8.3%', trend: 'up', icon: 'fa-money-bill-wave' },
    { label: 'Active Subscriptions', value: '1,235', change: '+5.2%', trend: 'up', icon: 'fa-credit-card' },
    { label: 'Avg Valuation/Month', value: '542', change: '-2.1%', trend: 'down', icon: 'fa-chart-line' },
  ];

  // Mock revenue data
  const revenueByTier = [
    { tier: 'Free', users: 1200, revenue: 0, percentage: 0.0 },
    { tier: 'Basic', users: 980, revenue: 28420000, percentage: 33.8 },
    { tier: 'Professional', users: 420, revenue: 33180000, percentage: 39.4 },
    { tier: 'Ultimate', users: 115, revenue: 22885000, percentage: 26.8 },
  ];

  // Mock recent transactions
  const recentTransactions = [
    { id: 1, user: 'Jean Munyeshyaka', type: 'Upgrade', tier: 'Basic', amount: 'Rwf 29k/mo', date: '2026-03-01', status: 'completed' },
    { id: 2, user: 'Marie Uwayo', type: 'Upgrade', tier: 'Professional', amount: 'Rwf 79k/mo', date: '2026-02-28', status: 'completed' },
    { id: 3, user: 'Alice Kagaba', type: 'Upgrade', tier: 'Ultimate', amount: 'Rwf 199k/mo', date: '2026-02-27', status: 'completed' },
    { id: 4, user: 'David Nkusi', type: 'Renewal', tier: 'Basic', amount: 'Rwf 29k/mo', date: '2026-02-26', status: 'failed' },
  ];

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    // Check for localStorage tokens (MFA flow) first
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (accessToken) {
      const validateAdmin = async () => {
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
            if (userData) {
              console.debug('Token expired but using cached admin data');
              // Don't logout - continue with cached data
            } else {
              // No cached data and token is invalid - must logout
              clearAuthAndRedirectToLogin();
              setLoading(false);
              return;
            }
          } else {
            // Other error - use cached data if available
            if (!userData) {
              console.error('Failed to refresh profile:', response.status);
              setLoading(false);
              return;
            }
            console.debug(`Profile endpoint returned ${response.status}, using cached admin data`);
          }
        } catch (error) {
          // Network error - use cached data if available
          if (!userData) {
            console.error('Failed to refresh profile:', error);
            setLoading(false);
            return;
          }
          console.debug('Network error fetching profile, using cached admin data:', error);
        }

        if (!userData) {
          router.push('/auth/login');
          setLoading(false);
          return;
        }

        if (userData.user_type !== 'admin') {
          toast.error('Access denied: Admin privileges required');
          router.push('/dashboard');
          setLoading(false);
          return;
        }

        setAdminUser(userData);
        setLoading(false);
      };

      validateAdmin();
    } else if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      // Check NextAuth session credentials too
      // TODO: Verify admin role from session when available
      setLoading(false);
    }
  }, [status, router]);

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
  }, [adminUser?.user_type, tokenExpired]);

    // Handle logout
    const handleLogout = async () => {
      clearAuth();
      localStorage.removeItem('admin_experience_mode');
      await signOut({ redirect: false });
      router.push('/auth/login');
    };

  // Handle Add User
  const handleAddUser = () => {
    setFormData({ name: '', email: '', phone: '', tier: 'Free', status: 'active' });
    setEditingUser(null);
    setShowAddUserModal(true);
  };

  // Handle Edit User
  const handleEditUser = (user: any) => {
    setFormData({ name: user.name, email: user.email, phone: user.phone, tier: user.tier, status: user.status });
    setEditingUser(user);
    setShowEditUserModal(true);
  };

  // Handle Save User (Add/Edit)
  const handleSaveUser = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Name and email are required');
      return;
    }

    if (editingUser) {
      // Edit existing user
      const updatedUsers = users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u);
      setUsers(updatedUsers);
      localStorage.setItem('admin_users', JSON.stringify(updatedUsers));
      toast.success('User updated successfully');
      setShowEditUserModal(false);
    } else {
      // Add new user
      const newUser = {
        id: Math.max(...users.map(u => u.id), 0) + 1,
        ...formData,
        joinDate: new Date().toISOString().split('T')[0],
      };
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem('admin_users', JSON.stringify(updatedUsers));
      toast.success('User added successfully');
      setShowAddUserModal(false);
    }
    setFormData({ name: '', email: '', phone: '', tier: 'Free', status: 'active' });
  };

  // Handle Delete User
  const handleDeleteUser = (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);
      localStorage.setItem('admin_users', JSON.stringify(updatedUsers));
      toast.success('User deleted successfully');
      setShowEditUserModal(false);
    }
  };

  // Handle Send Notification
  const handleOpenNotification = (user: any) => {
    setNotificationUser(user);
    setNotificationData({ title: '', message: '', type: 'info' });
    setShowNotificationModal(true);
  };

  // Handle Send Notification
  const handleSendNotification = async () => {
    if (!notificationData.title || !notificationData.message) {
      toast.error('Title and message are required');
      return;
    }

    try {
      if (!notificationUser) {
        toast.error('No user selected');
        return;
      }

      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

      if (accessToken) {
        const response = await fetchWithTokenRefresh(`${API_BASE_URL}/api/v1/admin/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            user_id: String(notificationUser.id),
            title: notificationData.title.trim(),
            message: notificationData.message.trim(),
            type: notificationData.type,
          }),
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload?.error?.message || `Failed with status ${response.status}`);
        }
      } else {
        const payload: AdminNotification = {
          id: `${Date.now()}`,
          userId: String(notificationUser.id),
          userEmail: String(notificationUser.email || '').toLowerCase(),
          userName: String(notificationUser.name || ''),
          title: notificationData.title.trim(),
          message: notificationData.message.trim(),
          type: notificationData.type,
          sentAt: new Date().toISOString(),
          read: false,
          sentBy: 'Admin',
        };

        const existingNotifications = localStorage.getItem('user_notifications');
        const parsedNotifications: AdminNotification[] = existingNotifications
          ? JSON.parse(existingNotifications)
          : [];
        const updatedNotifications = [payload, ...parsedNotifications];
        localStorage.setItem('user_notifications', JSON.stringify(updatedNotifications));
      }
      
      // In production, this would call your backend API
      // await fetchWithTokenRefresh(`/api/notifications/send`, {
      //   method: 'POST',
      //   body: JSON.stringify({
      //     userId: notificationUser.id,
      //     title: notificationData.title,
      //     message: notificationData.message,
      //     type: notificationData.type
      //   })
      // });

      toast.success(`Notification sent to ${notificationUser.name}`);
      setShowNotificationModal(false);
      setNotificationUser(null);
      setNotificationData({ title: '', message: '', type: 'info' });
    } catch (error) {
      toast.error('Failed to send notification');
      console.error('Notification error:', error);
    }
  };

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
                <Link href="/dashboard/profile" className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-700 transition-colors hidden sm:block">
                  <i className="fas fa-user-circle mr-1"></i>
                  View Profile
                </Link>
                <span
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border ${
                    adminExperienceMode === 'ultimate'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {adminExperienceMode === 'ultimate'
                    ? 'Mode: Ultimate No Expiry'
                    : 'Mode: Admin'}
                </span>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    handleAdminExperienceMenu(e.target.value);
                    e.currentTarget.value = '';
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg bg-white hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="" disabled>
                    Admin Access
                  </option>
                  <option value="ultimate">View as Ultimate (No Expiry)</option>
                  <option value="off">Restore Admin Mode</option>
                </select>
                  {adminUser && (
                    <>
                      <span className="text-sm font-medium text-gray-700 border-r border-gray-300 pr-4">
                        {adminUser.email}
                      </span>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                      >
                        Logout
                      </button>
                    </>
                  )}
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
                  Admin Dashboard
                </h1>
                <p className="text-lg text-gray-600">
                  Manage users, monitor revenue, and track KPIs
                </p>
              </div>
              
              <div className="flex gap-3">
                <Link
                  href="/properties/add"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="fas fa-plus-circle"></i>
                  Add Property
                </Link>
                <Link
                  href="/analytics"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
                >
                  <i className="fas fa-chart-line"></i>
                  View Analytics
                </Link>
              </div>
            </div>


            {/* Four Steps Process */}
            <div className="mb-8">
              <FourStepProcess />
            </div>

            {/* Refined Estimate Search (matches home page) */}
            <div className="bg-white border border-amber-200 rounded-2xl shadow-sm p-6 mb-8 max-w-2xl">
              <h2 className="text-xl font-bold text-emerald-800 mb-2 flex items-center gap-2">
                <i className="fas fa-search-location text-amber-400"></i>
                Land Estimate Search
              </h2>
              <form
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2"
                onSubmit={e => { e.preventDefault(); handleEstimateSearch(); }}
              >
                <input
                  type="text"
                  name="province"
                  placeholder="Province (e.g., Kigali City)"
                  value={searchForm.province}
                  onChange={handleSearchInputChange}
                  className="w-full pl-4 pr-4 py-3.5 rounded-2xl text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-400 outline-none disabled:opacity-50"
                  disabled={searchLoading}
                />
                <input
                  type="text"
                  name="district"
                  placeholder="District (e.g., Gasabo)"
                  value={searchForm.district}
                  onChange={handleSearchInputChange}
                  className="w-full pl-4 pr-4 py-3.5 rounded-2xl text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-400 outline-none disabled:opacity-50"
                  disabled={searchLoading}
                />
                <input
                  type="text"
                  name="sector"
                  placeholder="Sector (e.g., Kimironko)"
                  value={searchForm.sector}
                  onChange={handleSearchInputChange}
                  className="w-full pl-4 pr-4 py-3.5 rounded-2xl text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-400 outline-none disabled:opacity-50"
                  disabled={searchLoading}
                />
                <input
                  type="text"
                  name="upi"
                  placeholder="UPI (e.g., 1/01/01/01/1234)"
                  value={searchForm.upi}
                  onChange={handleSearchInputChange}
                  onKeyPress={handleSearchKeyPress}
                  className="w-full pl-4 pr-4 py-3.5 rounded-2xl text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-400 outline-none disabled:opacity-50"
                  disabled={searchLoading}
                />
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="sm:col-span-2 bg-amber-400 hover:bg-amber-500 text-emerald-950 font-semibold px-6 py-3.5 rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {searchLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i> Loading...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-calculator"></i> Estimate
                    </>
                  )}
                </button>
              </form>
              {/* Error message */}
              {searchError && (
                <div className="mt-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl max-w-xl">
                  <i className="fas fa-exclamation-circle mr-2"></i> {searchError}
                </div>
              )}
              {/* Estimate result */}
              {estimateResult && (
                <div className="mt-4 bg-white/95 backdrop-blur-sm border-2 border-amber-300 text-gray-800 px-6 py-4 rounded-2xl max-w-xl shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-lg text-emerald-900">
                      <i className="fas fa-check-circle text-emerald-600 mr-2"></i>
                      Estimate Complete
                    </h3>
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-semibold">
                      UPI: {estimateResult.parcel?.upi}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Location</p>
                      <p className="font-semibold">{estimateResult.parcel?.district}, {estimateResult.parcel?.sector}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Area</p>
                      <p className="font-semibold">{estimateResult.parcel?.land_size_sqm?.toLocaleString()} m²</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Zone Coefficient</p>
                      <p className="font-semibold">{estimateResult.parcel?.zone_coefficient}x</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Base Price/sqm</p>
                      <p className="font-semibold">FRW {estimateResult.parcel?.base_price_per_sqm?.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-gray-600 font-medium mb-1">Gazette Considerations:</p>
                    <ul className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries(estimateResult.considerations || {}).map(([key, value]) => (
                        <li key={key} className={value ? 'text-emerald-700' : 'text-gray-500'}>
                          <i className={`fas fa-${value ? 'check-circle' : 'times-circle'} mr-1`}></i>
                          {key.replace(/_/g, ' ')}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-3">
                    <p className="text-gray-600 font-medium mb-1">Price Options:</p>
                    <ul className="flex gap-4">
                      {estimateResult.prices?.map((price: number, idx: number) => (
                        <li key={idx} className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 font-semibold text-emerald-900">
                          FRW {price.toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
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
                  <button 
                    onClick={handleAddUser}
                    className="px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 transition-colors">
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
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleEditUser(user)}
                                className="text-emerald-700 hover:text-emerald-800 text-xs font-medium hover:bg-emerald-50 px-2 py-1 rounded transition-colors">
                                <i className="fas fa-edit mr-1"></i>Edit
                              </button>
                              <button 
                                onClick={() => handleOpenNotification(user)}
                                className="text-blue-700 hover:text-blue-800 text-xs font-medium hover:bg-blue-50 px-2 py-1 rounded transition-colors">
                                <i className="fas fa-bell mr-1"></i>Notify
                              </button>
                            </div>
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
                        <span className="text-sm font-semibold text-gray-800">FRW {(tier.revenue / 1000000).toFixed(1)}M</span>
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
                  <p className="text-3xl font-bold text-emerald-700">FRW 84.2M</p>
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

          {/* Subscription Plans Selector */}
          <div className="mt-16 mb-12">
            <SubscriptionSelector currentPlan="ultimate" />
          </div>

        </main>

        {/* ADD USER MODAL */}
        {showAddUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Add New User</h3>
                <button 
                  onClick={() => setShowAddUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors">
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter user name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
                  <select 
                    value={formData.tier}
                    onChange={(e) => setFormData({...formData, tier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="Free">Free</option>
                    <option value="Basic">Basic</option>
                    <option value="Professional">Professional</option>
                    <option value="Ultimate">Ultimate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button 
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSaveUser}
                  className="px-4 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg font-medium transition-colors">
                  Add User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EDIT USER MODAL */}
        {showEditUserModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800">Edit User</h3>
                <button 
                  onClick={() => setShowEditUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors">
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Enter user name"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="Enter phone number"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Tier</label>
                  <select 
                    value={formData.tier}
                    onChange={(e) => setFormData({...formData, tier: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="Free">Free</option>
                    <option value="Basic">Basic</option>
                    <option value="Professional">Professional</option>
                    <option value="Ultimate">Ultimate</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button 
                  onClick={() => handleDeleteUser(editingUser.id)}
                  className="px-4 py-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors">
                  Delete
                </button>
                <button 
                  onClick={() => setShowEditUserModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSaveUser}
                  className="px-4 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg font-medium transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NOTIFICATION MODAL */}
        {showNotificationModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Send Notification</h3>
                <p className="text-sm text-gray-600 mt-1">To: <span className="font-medium">{notificationUser?.name}</span></p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notification Type</label>
                  <select 
                    value={notificationData.type}
                    onChange={(e) => setNotificationData({...notificationData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="info">Info</option>
                    <option value="success">Success</option>
                    <option value="warning">Warning</option>
                    <option value="error">Error</option>
                    <option value="promotion">Promotion</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input 
                    type="text"
                    value={notificationData.title}
                    onChange={(e) => setNotificationData({...notificationData, title: e.target.value})}
                    placeholder="e.g., Account Update"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea 
                    value={notificationData.message}
                    onChange={(e) => setNotificationData({...notificationData, message: e.target.value})}
                    placeholder="Enter notification message..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
                  ></textarea>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 flex gap-3 justify-end">
                <button 
                  onClick={() => setShowNotificationModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={handleSendNotification}
                  className="px-4 py-2 text-white bg-blue-700 hover:bg-blue-800 rounded-lg font-medium transition-colors">
                  <i className="fas fa-paper-plane mr-2"></i>Send
                </button>
              </div>
            </div>
          </div>
        )}

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
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">Docs</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">FAQ</a></li>
                  <li><Link href="/notifications" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">About</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors cursor-not-allowed">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/legal/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link></li>
                  <li><Link href="/legal/terms" className="hover:text-emerald-400 transition-colors">Terms</Link></li>
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
