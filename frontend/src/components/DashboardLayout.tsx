import React from 'react';
import DashboardNavbar from './DashboardNavbar';
import DashboardSidebar from './DashboardSidebar';
import DashboardBackButton from './DashboardBackButton';
import type { DashboardTabKey } from './DashboardSidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  /** Rendered inside the shell, below the content (keeps the sticky footer layout). */
  footer?: React.ReactNode;
  /** Forwarded to DashboardNavbar (hidden for government/partner accounts). */
  showAddProperty?: boolean;
  /** Forwarded to DashboardNavbar (e.g. the admin experience selector). */
  navRightSlot?: React.ReactNode;
  /** Dashboard home passes the current in-page tab so the left menu highlights it. */
  activeTab?: DashboardTabKey;
  /** Dashboard home switches tabs in-page instead of navigating. */
  onSelectTab?: (tab: DashboardTabKey) => void;
  /** Extra classes for the content column wrapper. */
  contentClassName?: string;
  /**
   * Shows the back control above the content. Disable it on the dashboard home,
   * which is the destination rather than a sub-page.
   */
  showBack?: boolean;
}

/**
 * Shared shell for every page inside the user dashboard.
 *
 * Provides the authenticated top navigation and the left menu, so the user sees
 * the same navigation on every dashboard page. Pages render only their own
 * content (plus their own <Head>) inside it.
 */
export default function DashboardLayout({
  children,
  footer,
  showAddProperty = false,
  navRightSlot,
  activeTab,
  onSelectTab,
  contentClassName = '',
  showBack = true,
}: DashboardLayoutProps) {
  return (
    <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">
      <DashboardNavbar showAddProperty={showAddProperty} rightSlot={navRightSlot} />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4 md:gap-6">
            <DashboardSidebar activeTab={activeTab} onSelect={onSelectTab} />
            <div className={`min-w-0 ${contentClassName}`.trim()}>
              {showBack && <DashboardBackButton />}
              {children}
            </div>
          </div>
        </div>
      </main>

      {footer}
    </div>
  );
}
