
import React, { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useSession } from 'next-auth/react';
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
  { key: 'data', label: 'Data', icon: 'fas fa-database' },
];


function AdminDashboard() {
  const [active, setActive] = useState('overview');
  const { data: session } = useSession();
  const [profile, setProfile] = useState<{ firstName: string; email: string } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch('/api/v1/users/profile', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          // Adjust field names as per backend response
          setProfile({
            firstName: data.firstName || data.name?.split(' ')[0] || 'Admin',
            email: data.email || 'No email',
          });
        } else {
          setProfile(null);
        }
      } catch (e) {
        setProfile(null);
      }
    }
    fetchProfile();
  }, []);

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
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-emerald-600 card-hover"><div className="flex justify-between"><div><p className="text-gray-500 text-sm">Total Properties</p><p className="text-3xl font-bold text-gray-800">2,847</p><span className="text-xs text-green-600 mt-1">+12% this month</span></div><i className="fas fa-building text-4xl text-emerald-200"></i></div></div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-amber-500 card-hover"><div className="flex justify-between"><div><p className="text-gray-500 text-sm">Active Users</p><p className="text-3xl font-bold text-gray-800">1,923</p><span className="text-xs text-green-600">+34 diaspora</span></div><i className="fas fa-user-friends text-4xl text-amber-200"></i></div></div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-blue-500 card-hover"><div className="flex justify-between"><div><p className="text-gray-500 text-sm">Total Valuations</p><p className="text-3xl font-bold text-gray-800">5.2B</p><span className="text-xs text-green-600">RWF volume</span></div><i className="fas fa-chart-simple text-4xl text-blue-200"></i></div></div>
            <div className="bg-white rounded-2xl shadow-sm p-5 border-l-8 border-purple-500 card-hover"><div className="flex justify-between"><div><p className="text-gray-500 text-sm">Diaspora leads</p><p className="text-3xl font-bold text-gray-800">208</p><span className="text-xs text-emerald-600">+18 new</span></div><i className="fas fa-globe-africa text-4xl text-purple-200"></i></div></div>
          </div>
        );
    }
  }

  // Prefer profile from backend, fallback to session
  const firstName = profile?.firstName || (session?.user?.name ? session.user.name.split(' ')[0] : 'Admin');
  const email = profile?.email || session?.user?.email || 'No email';

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="admin-sidebar w-72 bg-white border-r border-gray-200 shadow-xl z-20 flex-shrink-0 overflow-y-auto hidden md:block">
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
              onClick={() => setActive(item.key)}
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
            onClick={() => window.location.href = '/dashboard'}
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
                {firstName}
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button className="md:hidden text-gray-600 text-xl"><i className="fas fa-bars"></i></button>
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


