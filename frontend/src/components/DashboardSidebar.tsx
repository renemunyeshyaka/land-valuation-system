import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';

export type DashboardTabKey =
  | 'overview'
  | 'profile'
  | 'estimate'
  | 'properties'
  | 'billing'
  | 'refunds'
  | 'subscription'
  | 'notifications';

export const DASHBOARD_TAB_KEYS: DashboardTabKey[] = [
  'overview',
  'profile',
  'estimate',
  'properties',
  'billing',
  'refunds',
  'subscription',
  'notifications',
];

const TAB_ICONS: Record<DashboardTabKey, string> = {
  overview: 'fas fa-home',
  profile: 'fas fa-user-circle',
  estimate: 'fas fa-search-location',
  properties: 'fas fa-building',
  billing: 'fas fa-wallet',
  refunds: 'fas fa-undo-alt',
  subscription: 'fas fa-gem',
  notifications: 'fas fa-bell',
};

/**
 * Where each entry goes when the sidebar is used outside the dashboard home.
 * The dashboard home handles every tab in-page (some open modals), so it passes
 * `onSelect` instead and these targets are not used there.
 */
const TAB_TARGETS: Record<DashboardTabKey, { pathname: string; tab?: string }> = {
  overview: { pathname: '/dashboard' },
  estimate: { pathname: '/dashboard', tab: 'estimate' },
  subscription: { pathname: '/dashboard/subscription' },
  billing: { pathname: '/payments' },
  properties: { pathname: '/dashboard/properties' },
  refunds: { pathname: '/dashboard', tab: 'refunds' },
  profile: { pathname: '/dashboard/profile' },
  notifications: { pathname: '/notifications' },
};

export const getDashboardTabHref = (key: DashboardTabKey): string => {
  const target = TAB_TARGETS[key];
  return target.tab ? `${target.pathname}?tab=${target.tab}` : target.pathname;
};

/**
 * Destinations that are not dashboard tabs but belong in the same menu, so the
 * user can reach them from any dashboard page.
 */
const EXTRA_LINKS: Array<{ key: string; href: string; icon: string; labelKey: string }> = [
  { key: 'analytics', href: '/analytics', icon: 'fas fa-chart-line', labelKey: 'userNav.analytics' },
];

interface DashboardSidebarProps {
  /** Highlights an entry without reading the router (used by the dashboard home). */
  activeTab?: DashboardTabKey;
  /** When provided, entries call this instead of navigating (dashboard home). */
  onSelect?: (tab: DashboardTabKey) => void;
}

/**
 * Left-hand menu shown on every page of the user dashboard.
 *
 * On the dashboard home it drives the in-page tabs; everywhere else it links to
 * the matching destination, so the user always has the same menu available.
 */
export default function DashboardSidebar({ activeTab, onSelect }: DashboardSidebarProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  // Admins get their way back to the admin dashboard from anywhere in the user
  // dashboard. This is resolved after mount: localStorage does not exist on the
  // server, so deciding during render would produce a hydration mismatch.
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      setIsAdmin(Boolean(raw) && JSON.parse(raw as string)?.user_type === 'admin');
    } catch {
      setIsAdmin(false);
    }
  }, []);

  const isActive = (key: DashboardTabKey) => {
    if (activeTab) {
      return activeTab === key;
    }

    const target = TAB_TARGETS[key];
    const path = router.pathname || '';
    const currentTab = typeof router.query?.tab === 'string' ? router.query.tab : undefined;

    if (target.tab) {
      return path === target.pathname && currentTab === target.tab;
    }
    // A plain destination is only active when no tab query selects another entry.
    return path === target.pathname && !currentTab;
  };

  const isExtraActive = (href: string) => (router.pathname || '') === href;

  const itemClass = (active: boolean) =>
    `w-full text-left px-3 py-2.5 md:py-2 rounded-lg text-sm font-medium transition-colors block ${
      active ? 'bg-emerald-100 text-emerald-800' : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <aside
      data-testid="dashboard-sidebar"
      className="bg-white border border-gray-100 rounded-lg shadow-sm p-2 md:p-3 h-fit lg:sticky lg:top-24"
    >
      <h2 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide px-2 md:px-3 py-2">
        {t('dashboard.title')}
      </h2>
      <nav className="space-y-0.5 md:space-y-1">
        {DASHBOARD_TAB_KEYS.map((key) => {
          const active = isActive(key);
          const label = t(`dashboard.${key}`);
          const icon = TAB_ICONS[key];

          if (onSelect) {
            return (
              <button
                key={key}
                type="button"
                data-testid={`user-dashboard-tab-${key}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelect(key)}
                className={itemClass(active)}
              >
                <i className={`${icon} mr-2 w-4 text-center`}></i>
                {label}
              </button>
            );
          }

          return (
            <Link
              key={key}
              href={getDashboardTabHref(key)}
              data-testid={`user-dashboard-tab-${key}`}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              <i className={`${icon} mr-2 w-4 text-center`}></i>
              {label}
            </Link>
          );
        })}

        <div className="my-1 border-t border-gray-200" />

        {EXTRA_LINKS.map((item) => {
          const active = isExtraActive(item.href);
          return (
            <Link
              key={item.key}
              href={item.href}
              data-testid={`user-dashboard-link-${item.key}`}
              aria-current={active ? 'page' : undefined}
              className={itemClass(active)}
            >
              <i className={`${item.icon} mr-2 w-4 text-center`}></i>
              {t(item.labelKey)}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="my-1 border-t border-gray-200" />
            <Link
              href="/admin/dashboard"
              data-testid="user-dashboard-link-admin"
              aria-current={(router.pathname || '') === '/admin/dashboard' ? 'page' : undefined}
              className={itemClass((router.pathname || '') === '/admin/dashboard')}
            >
              <i className="fas fa-user-shield mr-2 w-4 text-center"></i>
              {t('userNav.adminDashboard')}
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}
