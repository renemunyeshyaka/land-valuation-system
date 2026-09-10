import React from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from 'react-i18next';

interface DashboardBackButtonProps {
  /**
   * Used when there is no page history to return to (page opened directly, new
   * tab, bookmark). Defaults to the dashboard home.
   */
  fallbackHref?: string;
  /** Extra classes for the control. */
  className?: string;
}

/**
 * Back control for the user dashboard.
 *
 * Guarantees that no dashboard page is a dead end: it returns to the previous
 * page when there is history, and to the dashboard home otherwise.
 */
export default function DashboardBackButton({
  fallbackHref = '/dashboard',
  className = '',
}: DashboardBackButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const goBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  };

  return (
    <button
      type="button"
      data-testid="dashboard-back"
      onClick={goBack}
      className={`inline-flex items-center gap-2 mb-4 px-3 py-1.5 -ml-1 rounded-lg text-sm font-medium text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors ${className}`.trim()}
    >
      <i className="fas fa-arrow-left" aria-hidden="true"></i>
      {t('common.back')}
    </button>
  );
}
