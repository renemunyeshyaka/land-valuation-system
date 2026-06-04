/**
 * Currency utility for multi-currency pricing display
 * Handles currency formatting, conversion, and user preference management
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export interface Currency {
  id: number;
  iso_code: string;
  symbol: string;
  name: string;
  exchange_rate_to_rwf: number;
  is_base: boolean;
  is_active: boolean;
  region: string;
}

const STORAGE_KEY = 'lvs_preferred_currency';

// Region to default currency mapping
const REGION_CURRENCY_MAP: Record<string, string> = {
  RW: 'RWF',
  EU: 'EUR',
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  KE: 'KES',
  UG: 'UGX',
  TZ: 'TZS',
  CD: 'CDF',
};

// Currency symbols for quick lookup
const CURRENCY_SYMBOLS: Record<string, string> = {
  RWF: 'Frw',
  USD: '$',
  EUR: '€',
  CAD: 'C$',
  GBP: '£',
  KES: 'KSh',
  UGX: 'USh',
  TZS: 'TSh',
  CDF: 'FC',
};

// Cached currencies from API
let cachedCurrencies: Currency[] | null = null;

/**
 * Get all active currencies from the API
 */
export async function getCurrencies(token?: string): Promise<Currency[]> {
  if (cachedCurrencies) return cachedCurrencies;

  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE_URL}/api/v1/currencies`, { headers });
    if (!res.ok) throw new Error('Failed to fetch currencies');

    const data = await res.json();
    const currencies = data?.data || [];
    cachedCurrencies = currencies;
    return currencies;
  } catch (error) {
    console.error('Failed to load currencies:', error);
    return getDefaultCurrencies();
  }
}

/**
 * Get default currencies as fallback
 */
function getDefaultCurrencies(): Currency[] {
  return [
    { id: 1, iso_code: 'RWF', symbol: 'Frw', name: 'Rwandan Franc', exchange_rate_to_rwf: 1, is_base: true, is_active: true, region: 'RW' },
    { id: 2, iso_code: 'USD', symbol: '$', name: 'US Dollar', exchange_rate_to_rwf: 1310, is_base: false, is_active: true, region: 'US' },
    { id: 3, iso_code: 'EUR', symbol: '€', name: 'Euro', exchange_rate_to_rwf: 1425, is_base: false, is_active: true, region: 'EU' },
  ];
}

/**
 * Get user's preferred currency from localStorage
 */
export function getPreferredCurrency(): string {
  if (typeof window === 'undefined') return 'RWF';
  return localStorage.getItem(STORAGE_KEY) || 'RWF';
}

/**
 * Set user's preferred currency in localStorage
 */
export function setPreferredCurrency(code: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, code);
  }
}

/**
 * Get default currency for a region
 */
export function getCurrencyForRegion(region: string): string {
  return REGION_CURRENCY_MAP[region.toUpperCase()] || 'USD';
}

/**
 * Get currency symbol by ISO code
 */
export function getCurrencySymbol(code: string): string {
  return CURRENCY_SYMBOLS[code.toUpperCase()] || code;
}

/**
 * Format an amount in the given currency
 */
export function formatCurrency(amount: number, currencyCode: string): string {
  const symbol = getCurrencySymbol(currencyCode);
  const locale = currencyCode === 'RWF' ? 'en-RW' : 'en-US';

  // RWF shows no decimals, others show 2
  const decimals = currencyCode === 'RWF' ? 0 : 2;

  try {
    return `${symbol} ${amount.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  } catch {
    return `${symbol} ${amount.toFixed(decimals)}`;
  }
}

/**
 * Convert an amount from RWF to target currency
 */
export function convertFromRwf(amountRwf: number, currency: Currency): number {
  if (currency.is_base || currency.exchange_rate_to_rwf <= 0) return amountRwf;
  return amountRwf / currency.exchange_rate_to_rwf;
}

/**
 * Convert an amount to RWF from source currency
 */
export function convertToRwf(amount: number, currency: Currency): number {
  if (currency.is_base) return amount;
  return amount * currency.exchange_rate_to_rwf;
}

/**
 * Get a currency object by ISO code from cached list
 */
export function findCurrency(currencies: Currency[], code: string): Currency | undefined {
  return currencies.find(c => c.iso_code === code.toUpperCase());
}

/**
 * Get a formatted price string for display in user's preferred currency
 */
export function formatPriceForDisplay(priceRwf: number, currencies: Currency[], preferredCode: string): string {
  const currency = findCurrency(currencies, preferredCode) || currencies[0];
  if (!currency || currency.is_base) {
    return formatCurrency(priceRwf, 'RWF');
  }
  const converted = convertFromRwf(priceRwf, currency);
  return formatCurrency(converted, preferredCode);
}

/**
 * Clear cached currencies (useful after admin sync)
 */
export function clearCurrencyCache(): void {
  cachedCurrencies = null;
}
