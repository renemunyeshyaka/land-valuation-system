import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';
import { signOut } from 'next-auth/react';
import LanguageSwitcher from './LanguageSwitcher';
import { clearAuth } from '../utils/tokenRefresh';

interface DashboardNavbarProps {
  /**
   * Renders the "Add Property" entry. Pages pass `false` for government and
   * partner accounts, which are not allowed to list properties.
   */
  showAddProperty?: boolean;
  /** Extra controls shown next to the navigation (e.g. admin experience mode). */
  rightSlot?: React.ReactNode;
}

/**
 * Top navigation for the authenticated user dashboard.
 *
 * Contains only in-dashboard destinations. The public marketing menus
 * (Home / How It Works / Benefits / Marketplace / Contact) belong to the public
 * site and must not appear once the user is inside their dashboard.
 */
export default function DashboardNavbar({ showAddProperty = false, rightSlot }: DashboardNavbarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // The left menu already offers Dashboard, Properties, Payments, Notifications and
  // Analytics, so repeating them here is duplicated navigation. Keep this list short.
  const navItems = useMemo(
    () => [
      { href: '/reports', label: t('userNav.reports'), icon: 'fas fa-file-alt' },
    ],
    [t],
  );

  const isActive = (href: string) => {
    // Guard: pathname is always set by Next.js, but tests and non-router
    // renders can supply a partial router.
    const path = router.pathname || '';
    return path === href || path.startsWith(`${href}/`);
  };

  const handleLogout = async () => {
    clearAuth();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_experience_mode');
    }

    const frontendBaseUrl =
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      process.env.NEXTAUTH_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
    const logoutCallbackUrl = `${frontendBaseUrl.replace(/\/$/, '')}/auth/login`;

    await signOut({ redirect: false, callbackUrl: logoutCallbackUrl });
    if (typeof window !== 'undefined') {
      window.location.href = logoutCallbackUrl;
    }
  };

  const mobileLinkClass = 'px-3 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-50';

  return (
    <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20 gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 group shrink-0">
            <div className="w-9 h-9 bg-emerald-700 rounded-lg flex items-center justify-center group-hover:bg-emerald-800 transition-colors">
              <i className="fas fa-map-marked-alt text-white text-lg"></i>
            </div>
            <div className="flex flex-col">
              <span className="text-base md:text-lg font-bold text-gray-800 leading-tight">LandVal</span>
              <span className="text-xs text-gray-500 leading-tight hidden sm:block">{t('userNav.subtitle')}</span>
            </div>
          </Link>

          {/* Desktop navigation */}
          <div className="hidden xl:flex items-center gap-0.5 flex-1 justify-center min-w-0">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive(item.href)
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:text-emerald-700 hover:bg-gray-50'
                }`}
              >
                <i className={`${item.icon} mr-1.5 hidden 2xl:inline`}></i>
                {item.label}
              </Link>
            ))}
            {showAddProperty && (
              <Link
                href="/properties/add"
                className={`px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive('/properties')
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:text-emerald-700 hover:bg-gray-50'
                }`}
              >
                <i className="fas fa-plus-circle mr-1.5 hidden 2xl:inline"></i>
                {t('dashboard.addProperty')}
              </Link>
            )}
          </div>

          {/* Desktop actions */}
          <div className="hidden xl:flex items-center gap-1.5 shrink-0">
            {rightSlot}
            <LanguageSwitcher />
            <Link
              href="/settings"
              className="px-2.5 py-2 text-sm font-medium text-gray-700 hover:text-emerald-700 whitespace-nowrap transition-colors"
            >
              <i className="fas fa-cog mr-1 hidden 2xl:inline"></i>
              {t('userNav.settings')}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg whitespace-nowrap transition-colors"
            >
              {t('userNav.logout')}
            </button>
          </div>

          {/* Mobile toggle */}
          <div className="xl:hidden flex items-center">
            <button
              aria-label={t('userNav.menu')}
              aria-expanded={mobileMenuOpen}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-emerald-800 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? <i className="fas fa-times text-2xl"></i> : <i className="fas fa-bars text-2xl"></i>}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="xl:hidden fixed left-0 right-0 top-16 md:top-20 bg-white border-b border-gray-200 shadow-lg z-[80] pointer-events-auto">
            <div className="flex flex-col gap-1 px-4 py-4">
              {navItems.map((item) => (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  className={mobileLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className={`${item.icon} mr-2`}></i>
                  {item.label}
                </Link>
              ))}
              {showAddProperty && (
                <Link
                  href="/properties/add"
                  className={mobileLinkClass}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className="fas fa-plus-circle mr-2"></i>
                  {t('dashboard.addProperty')}
                </Link>
              )}

              <div className="border-t border-gray-200 my-2"></div>

              <Link
                href="/settings"
                className={mobileLinkClass}
                onClick={() => setMobileMenuOpen(false)}
              >
                <i className="fas fa-cog mr-2"></i>
                {t('userNav.settings')}
              </Link>

              <div className="px-3 py-2">
                <LanguageSwitcher />
              </div>

              {rightSlot && <div className="px-3 pb-2">{rightSlot}</div>}

              <button
                type="button"
                onClick={async () => {
                  setMobileMenuOpen(false);
                  await handleLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <i className="fas fa-sign-out-alt mr-2"></i>
                {t('userNav.logout')}
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
