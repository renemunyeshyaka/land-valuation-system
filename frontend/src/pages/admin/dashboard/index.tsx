
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { refreshAccessToken } from '@/utils/tokenRefresh';
import Footer from '@/components/Footer';
import UserManagement from '@/components/admin/UserManagement';
import MarketplaceManagement from '@/components/admin/MarketplaceManagement';
import PropertyListings from '@/components/admin/PropertyListings';
import AnalyticsRevenue from '@/components/admin/AnalyticsRevenue';
import SupportModeration from '@/components/admin/SupportModeration';
import Payments from '@/components/admin/Payments';
import SystemHealth from '@/components/admin/SystemHealth';
import DataImportExport from '@/components/admin/DataImportExport';

const NAV = [
  { key: 'overview', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
  { key: 'users', label: 'Users', icon: 'fas fa-users' },
  { key: 'marketplace', label: 'Marketplace', icon: 'fas fa-map-marked-alt' },
  { key: 'listings', label: 'Listings', icon: 'fas fa-building' },
  { key: 'payments', label: 'Payments', icon: 'fas fa-hand-holding-usd' },
  { key: 'analytics', label: 'Analytics', icon: 'fas fa-chart-line' },
  { key: 'support', label: 'Support', icon: 'fas fa-headset' },
  { key: 'system', label: 'System', icon: 'fas fa-sliders-h' },
  { key: 'data', label: 'System Data', icon: 'fas fa-database' },
];


function AdminDashboard() {
  const [active, setActive] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<{ fullName: string; firstName: string; email: string } | null>(null);
  const [overview, setOverview] = useState({
    totalProperties: 0,
    activeUsers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
  });
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  const toDisplayName = (user: any) => {
    const first = user?.first_name || user?.firstName || '';
    const last = user?.last_name || user?.lastName || '';
    const full = [first, last].join(' ').trim() || user?.name || 'Admin';
    return {
      fullName: full,
      firstName: first || String(full).split(' ')[0] || 'Admin',
      email: user?.email || 'No email',
    };
  };

  const getStoredUserProfile = () => {
    if (typeof window === 'undefined') return null;
    const rawUser = localStorage.getItem('user');
    if (!rawUser) return null;
    try {
      const user = JSON.parse(rawUser);
      return toDisplayName(user);
    } catch {
      return null;
    }
  };

  const getAuthToken = () => {
    if (session && (session as any).accessToken) return (session as any).accessToken as string;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) return token;
    }
    return null;
  };

  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = getAuthToken();
        if (!token) {
          const stored = getStoredUserProfile();
          if (stored) {
            setProfile(stored);
            return;
          }
          setProfile(null);
          return;
        }

        const res = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            const refreshedToken = getAuthToken();
            if (refreshedToken) {
              const retryRes = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
                headers: {
                  Authorization: `Bearer ${refreshedToken}`,
                },
              });
              if (retryRes.ok) {
                const retryPayload = await retryRes.json();
                const retryData = retryPayload?.data || retryPayload;
                setProfile(toDisplayName(retryData));
                return;
              }
            }
          }
        }
        if (res.ok) {
          const payload = await res.json();
          const data = payload?.data || payload;
          setProfile(toDisplayName(data));
        } else {
          const stored = getStoredUserProfile();
          if (stored) {
            setProfile(stored);
            return;
          }
          setProfile(null);
        }
      } catch (e) {
        const stored = getStoredUserProfile();
        if (stored) {
          setProfile(stored);
          return;
        }
        setProfile(null);
      }
    }
    fetchProfile();
  }, [session]);

  // Redirect to login if completely unauthenticated
  useEffect(() => {
    async function checkAuth() {
      const token = getAuthToken();
      if (!token) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          router.replace('/auth/login');
        }
      }
    }
    // Only check after session has resolved (not during loading)
    if (session !== undefined) {
      checkAuth();
    }
  }, [session]);

  useEffect(() => {
    async function fetchOverview() {
      let token = getAuthToken();
      if (!token) {
        const refreshed = await refreshAccessToken();
        if (refreshed) token = getAuthToken();
      }
      if (!token) return;

      const config = {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      };

      // Use allSettled so one failing endpoint doesn't zero out all cards
      const [usersRes, propsRes, subsRes, revRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/v1/admin/users`, { ...config, params: { page: 1, limit: 1 } }),
        axios.get(`${API_BASE_URL}/api/v1/admin/properties`, { ...config, params: { page: 1, limit: 1 } }),
        axios.get(`${API_BASE_URL}/api/v1/admin/subscriptions`, { ...config, params: { page: 1, limit: 1 } }),
        axios.get(`${API_BASE_URL}/api/v1/admin/analytics/revenue`, { ...config, params: { range: '30d' } }),
      ]);

      const val = <T,>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);

      setOverview({
        activeUsers:         Number((val(usersRes) as any)?.data?.data?.total   || 0),
        totalProperties:     Number((val(propsRes) as any)?.data?.data?.total   || 0),
        activeSubscriptions: Number((val(subsRes) as any)?.data?.data?.total    || 0),
        totalRevenue:        Number((val(revRes) as any)?.data?.data?.total_revenue || 0),
      });
    }

    fetchOverview();
  }, [session]);

  function renderSection() {
    switch (active) {
      case 'users': return <UserManagement />;
      case 'marketplace': return <MarketplaceManagement />;
      case 'listings': return <PropertyListings />;
      case 'payments': return <Payments />;
      case 'analytics': return <AnalyticsRevenue />;
      case 'support': return <SupportModeration />;
      case 'system': return <SystemHealth />;
      case 'data': return <DataImportExport />;
      case 'overview':
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-emerald-600 card-hover"><div className="flex justify-between"><div><p className="text-gray-500 text-sm">Total Properties</p><p className="text-3xl font-bold text-gray-800">{overview.totalProperties.toLocaleString()}</p><span className="text-xs text-green-600 mt-1">Live from database</span></div><i className="fas fa-building text-4xl text-emerald-200"></i></div></div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-amber-500 card-hover"><div className="flex justify-between"><div><p className="text-gray-500 text-sm">Active Users</p><p className="text-3xl font-bold text-gray-800">{overview.activeUsers.toLocaleString()}</p><span className="text-xs text-green-600">Live from database</span></div><i className="fas fa-user-friends text-4xl text-amber-200"></i></div></div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-blue-500 card-hover"><div className="flex justify-between"><div><p className="text-gray-500 text-sm">Total Revenue</p><p className="text-3xl font-bold text-gray-800">{overview.totalRevenue.toLocaleString()}</p><span className="text-xs text-green-600">RWF volume</span></div><i className="fas fa-chart-simple text-4xl text-blue-200"></i></div></div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-purple-500 card-hover"><div className="flex justify-between"><div><p className="text-gray-500 text-sm">Active Subscriptions</p><p className="text-3xl font-bold text-gray-800">{overview.activeSubscriptions.toLocaleString()}</p><span className="text-xs text-emerald-600">Live from database</span></div><i className="fas fa-globe-africa text-4xl text-purple-200"></i></div></div>
          </div>
        );
    }
  }

  // Prefer profile from backend, fallback to session/local user cache
  const sessionName = session?.user?.name || null;
  const storedProfile = getStoredUserProfile();
  const fullName = profile?.fullName || sessionName || storedProfile?.fullName || 'Admin';
  const firstName = profile?.firstName || (sessionName ? sessionName.split(' ')[0] : (storedProfile?.firstName || 'Admin'));
  const email = profile?.email || session?.user?.email || storedProfile?.email || 'No email';

  const switchToUltimateDashboard = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_experience_mode', JSON.stringify({ mode: 'ultimate', enabledAt: new Date().toISOString() }));
    }
    router.push('/dashboard');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="admin-sidebar w-72 bg-white border-r border-gray-200 shadow-xl z-20 flex-shrink-0 overflow-y-auto hidden lg:block">
        <div className="px-6 py-6 flex items-center gap-2 border-b border-gray-100">
          <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
            <i className="fas fa-crown text-white text-sm"></i>
          </div>
          <span className="font-bold text-xl tracking-tight text-emerald-900">Land<span className="text-emerald-600">Val</span></span>
          <span className="ml-2 text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">ADMIN</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {NAV.map(item => (
            <button
              key={item.key}
              className={`admin-nav-link flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition font-medium ${active === item.key ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => {
                setActive(item.key);
              }}
            >
              <i className={`${item.icon} w-5`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        {/* Dashboard Switcher */}
        <div className="px-5 pb-2">
          <button
            className="w-full flex items-center gap-2 px-4 py-2 mt-2 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium transition"
            onClick={switchToUltimateDashboard}
          >
            <i className="fas fa-exchange-alt"></i>
            Switch to Ultimate Dashboard
          </button>
        </div>
        {/* User Info & Logout */}
        <div className="border-t border-gray-100 p-5 mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
              {firstName[0]}
            </div>
            <div>
              <p className="text-sm font-semibold">
                {fullName}
              </p>
              <p className="text-xs text-gray-500">
                {email}
              </p>
            </div>
          </div>
          <button
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition"
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile/Tablet Sidebar Overlay */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile/Tablet Sidebar Drawer */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 shadow-xl z-50 flex-shrink-0 overflow-y-auto transform transition-transform duration-200 lg:hidden ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-6 py-6 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
              <i className="fas fa-crown text-white text-sm"></i>
            </div>
            <span className="font-bold text-xl tracking-tight text-emerald-900">Land<span className="text-emerald-600">Val</span></span>
            <span className="ml-2 text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">ADMIN</span>
          </div>
          <button
            type="button"
            className="p-2 rounded-md text-gray-600 hover:text-gray-900"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close admin menu"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {NAV.map(item => (
            <button
              key={`mobile-${item.key}`}
              className={`admin-nav-link flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition font-medium ${active === item.key ? 'bg-emerald-50 text-emerald-800' : 'text-gray-700 hover:bg-gray-50'}`}
              onClick={() => {
                setActive(item.key);
                setMobileNavOpen(false);
              }}
            >
              <i className={`${item.icon} w-5`}></i>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="px-5 pb-2">
          <button
            className="w-full flex items-center gap-2 px-4 py-2 mt-2 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-medium transition"
            onClick={() => {
              setMobileNavOpen(false);
              switchToUltimateDashboard();
            }}
          >
            <i className="fas fa-exchange-alt"></i>
            Switch to Ultimate Dashboard
          </button>
        </div>

        <div className="border-t border-gray-100 p-5 mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
              {firstName[0]}
            </div>
            <div>
              <p className="text-sm font-semibold">{fullName}</p>
              <p className="text-xs text-gray-500">{email}</p>
            </div>
          </div>
          <button
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-medium transition"
            onClick={() => signOut({ callbackUrl: '/auth/login' })}
          >
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden text-gray-600 text-xl"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open admin menu"
            >
              <i className="fas fa-bars"></i>
            </button>
            <h1 className="text-xl font-semibold text-gray-800">{NAV.find(n => n.key === active)?.label || 'Dashboard'}</h1>
          </div>
          <div className="flex gap-4 items-center">
            <i className="fas fa-bell text-gray-500 hover:text-emerald-600 cursor-pointer"></i>
            <div className="relative">
              <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 rounded-full border border-gray-200 bg-gray-50 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-emerald-400" />
              <i className="fas fa-search absolute left-3 top-2.5 text-gray-400 text-sm"></i>
            </div>
          </div>
        </header>

        {/* Section Content */}
        <div className="flex-1 p-6 md:p-8">
          {renderSection()}
        </div>
        <Footer />
      </main>
    </div>
  );
}

export default AdminDashboard;


