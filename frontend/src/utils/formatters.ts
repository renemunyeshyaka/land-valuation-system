/**
 * Maps the i18n language code to the appropriate Intl locale for number/currency formatting.
 * Uses document.documentElement.lang (set by LanguageSwitcher) to avoid circular dependency on i18n.
 */
const getIntlLocale = (): string => {
  if (typeof window === 'undefined') return 'en-US';
  const lang = document.documentElement.lang || 'rw';
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    rw: 'en-RW',
  };
  return localeMap[lang] || 'en-US';
};

/**
 * Currency symbols by ISO code
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  RWF: 'Frw',
  USD: '$',
  EUR: '€',
  CAD: 'C$',
  GBP: '£',
};

/**
 * Format a price value with locale-aware number formatting.
 * Defaults to RWF if no currency code is provided.
 */
export const formatPrice = (value: number, currencyCode: string = 'RWF'): string => {
  if (!Number.isFinite(value)) {
    return `${CURRENCY_SYMBOLS[currencyCode] || currencyCode} 0`;
  }
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  const locale = getIntlLocale();
  const decimals = currencyCode === 'RWF' ? 0 : 2;
  return `${symbol} ${Math.round(value).toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const formatSize = (value: number, unit?: string): string => {
  if (!Number.isFinite(value)) {
    return `0 ${unit || 'sqm'}`;
  }

  return `${new Intl.NumberFormat(getIntlLocale()).format(value)} ${unit || 'sqm'}`;
};
