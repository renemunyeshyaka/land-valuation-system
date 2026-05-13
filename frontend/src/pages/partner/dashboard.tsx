import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { clearAuth, fetchWithTokenRefresh } from '../../utils/tokenRefresh';

interface PartnerUser {
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
}

type PartnerTab = 'overview' | 'access' | 'valuation' | 'analytics' | 'properties';

const TABS: Array<{ key: PartnerTab; label: string; icon: string }> = [
  { key: 'overview', label: 'Overview', icon: 'fas fa-home' },
  { key: 'access', label: 'Access Policy', icon: 'fas fa-shield-alt' },
  { key: 'valuation', label: 'Valuation', icon: 'fas fa-calculator' },
  { key: 'analytics', label: 'Analytics', icon: 'fas fa-chart-line' },
  { key: 'properties', label: 'Properties (Restricted)', icon: 'fas fa-ban' },
];

const getValidPartnerTab = (rawTab: unknown): PartnerTab => {
  const tab = typeof rawTab === 'string' ? rawTab : 'overview';
  return TABS.some((item) => item.key === tab) ? (tab as PartnerTab) : 'overview';
};

const getCachedPartnerUser = (): PartnerUser | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawUser = localStorage.getItem('user');
  if (!rawUser) {
    return null;
  }

  try {
    const userData = JSON.parse(rawUser);
    return {
      firstName: String(userData?.first_name || userData?.firstName || 'Government'),
      lastName: String(userData?.last_name || userData?.lastName || 'User'),
      email: String(userData?.email || ''),
      userType: String(userData?.user_type || userData?.userType || 'government'),
    };
  } catch {
    return null;
  }
};

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PartnerTab>('overview');
  const [user, setUser] = useState<PartnerUser | null>(null);

  useEffect(() => {
    const cachedUser = getCachedPartnerUser();
    if (cachedUser) {
      setUser(cachedUser);
    }
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const tabFromQuery = getValidPartnerTab(router.query?.tab);
    setActiveTab(tabFromQuery);
  }, [router.isReady, router.query?.tab]);

  const navigateToTab = (tab: PartnerTab) => {
    setActiveTab(tab);
    router.replace(
      {
        pathname: '/partner/dashboard',
        query: { ...router.query, tab },
      },
      undefined,
      { shallow: true }
    );
  };

  useEffect(() => {
    const verifyPartnerAccess = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        router.replace('/auth/login');
        return;
      }

      try {
        const response = await fetchWithTokenRefresh(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/users/profile`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token') || accessToken}`,
          },
        });

        if (!response.ok) {
          clearAuth();
          router.replace('/auth/login');
          return;
        }

        const payload = await response.json();
        const profile = payload?.data;
        const userType = String(profile?.user_type || '').toLowerCase();

        if (userType === 'admin') {
          router.replace('/admin/dashboard');
          return;
        }

        if (userType !== 'government' && userType !== 'partner' && userType !== 'gov_partner') {
          router.replace('/dashboard');
          return;
        }

        setUser({
          firstName: profile?.first_name || 'Government',
          lastName: profile?.last_name || 'User',
          email: profile?.email || '',
          userType,
        });
      } catch {
        clearAuth();
        router.replace('/auth/login');
        return;
      } finally {
        setLoading(false);
      }
    };

    verifyPartnerAccess();
  }, [router]);

  const fullName = useMemo(() => {
    if (!user) return '';
    return `${user.firstName} ${user.lastName}`.trim();
  }, [user]);

  const renderTab = () => {
    if (activeTab === 'overview') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Account Type</p>
            <p className="text-lg font-semibold text-gray-900">Government / Partner</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Access Status</p>
            <p className="text-lg font-semibold text-emerald-700">Permanent Free Access</p>
          </div>
        </div>
      );
    }

    if (activeTab === 'access') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Access Policy</h2>
          <p className="text-sm text-gray-700">This dashboard remains active without subscription expiry.</p>
          <p className="text-sm text-gray-700">Property creation is intentionally disabled for government and partner users.</p>
        </div>
      );
    }

    if (activeTab === 'valuation') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Valuation Tools</h2>
          <p className="text-sm text-gray-700 mb-4">Use valuation and estimate services without property posting capability.</p>
          <Link href="/dashboard" className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors">
            Open Valuation Dashboard
          </Link>
        </div>
      );
    }

    if (activeTab === 'analytics') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h2>
          <p className="text-sm text-gray-700 mb-4">Analytics access remains available for partner-approved workflows.</p>
          <Link href="/analytics" className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 transition-colors">
            Open Analytics
          </Link>
        </div>
      );
    }

    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-red-700 mb-2">Properties Restricted</h2>
        <p className="text-sm text-red-700">Add Property is not available for government/partner accounts. This restriction is enforced in both UI and API authorization.</p>
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Partner Dashboard | Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Government / Partner Dashboard</p>
              <h1 className="text-lg font-semibold text-gray-900">{fullName}</h1>
            </div>
            <button
              className="md:hidden p-2 text-gray-700"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle partner menu"
              type="button"
            >
              <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside className={`bg-white border border-gray-200 rounded-xl p-3 h-fit ${mobileMenuOpen ? 'block' : 'hidden md:block'}`}>
            <nav className="space-y-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    navigateToTab(tab.key);
                    setMobileMenuOpen(false);
                  }}
                  aria-current={activeTab === tab.key ? 'page' : undefined}
                  data-testid={`partner-nav-${tab.key}`}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <i className={`${tab.icon} mr-2`}></i>
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <main>{renderTab()}</main>
        </div>
      </div>
    </>
  );
}
