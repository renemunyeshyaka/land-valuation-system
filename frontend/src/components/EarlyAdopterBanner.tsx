import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

interface PromoStatus {
  name: string;
  granted: number;
  limit: number;
  remaining: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * EarlyAdopterBanner — short, simple announcement for the first-20k one-month
 * free-membership promotion. Shows a live "X / 20,000 claimed" counter when the
 * backend promo endpoint is reachable; otherwise the banner still renders.
 */
const EarlyAdopterBanner: React.FC<{ showCta?: boolean }> = ({ showCta = false }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<PromoStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/api/v1/promo/early-adopter`)
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (cancelled) return;
        if (payload?.success && payload?.data) {
          setStatus(payload.data);
        }
      })
      .catch(() => {
        /* Counter is optional — banner renders without it. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counterLabel = status
    ? t('promo.claimed', { count: status.granted })
    : t('promo.claimedPlaceholder');

  return (
    <div className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
      <p className="text-sm font-medium flex-1">
        <span aria-hidden="true">🎉 </span>
        {t('promo.bannerText')}
      </p>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-amber-200 rounded-full px-3 py-1 whitespace-nowrap"
          title={t('promo.oneMonthFree')}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {counterLabel}
        </span>
        {showCta && (
          <Link
            href="/auth/register"
            className="text-xs font-semibold bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-full px-4 py-1.5 transition whitespace-nowrap"
          >
            {t('promo.cta', { defaultValue: t('auth.signup') })}
          </Link>
        )}
      </div>
    </div>
  );
};

export default EarlyAdopterBanner;
