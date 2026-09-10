import React from 'react';
import DashboardLayout from './DashboardLayout';

interface DashboardLoadingProps {
  /** Optional message shown under the spinner. */
  message?: React.ReactNode;
  /** Rendered in place of the "Add Property" button when the user may not add one. */
  showAddProperty?: boolean;
  /** Extra controls rendered at the right of the top navigation. */
  navRightSlot?: React.ReactNode;
}

/**
 * Loading state for dashboard pages.
 *
 * It renders the shared dashboard chrome (top navigation + left menu) around the
 * spinner so the user always sees the dashboard navigation while data is loading,
 * and so server-rendered HTML never arrives as a navigation-less blank page.
 */
export default function DashboardLoading({
  message,
  showAddProperty,
  navRightSlot,
}: DashboardLoadingProps) {
  return (
    <DashboardLayout showAddProperty={showAddProperty} navRightSlot={navRightSlot}>
      <div className="py-16 text-center">
        <i className="fas fa-spinner fa-spin text-3xl text-emerald-700" aria-hidden="true"></i>
        {message ? <p className="mt-3 text-sm text-gray-600">{message}</p> : null}
        <span className="sr-only">Loading</span>
      </div>
    </DashboardLayout>
  );
}
