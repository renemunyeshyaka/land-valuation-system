import i18n from './i18n';

/**
 * Maps the i18n language code to the appropriate Intl locale for number/currency formatting.
 */
const getIntlLocale = (): string => {
  const lang = i18n.language || 'rw';
  const localeMap: Record<string, string> = {
    en: 'en-US',
    fr: 'fr-FR',
    rw: 'en-RW',
  };
  return localeMap[lang] || 'en-US';
};

export const formatPrice = (value: number): string => {
  if (!Number.isFinite(value)) {
    return 'RWF 0';
  }
  return `RWF ${new Intl.NumberFormat(getIntlLocale()).format(Math.round(value))}`;
};

export const formatSize = (value: number, unit?: string): string => {
  if (!Number.isFinite(value)) {
    return `0 ${unit || 'sqm'}`;
  }

  return `${new Intl.NumberFormat(getIntlLocale()).format(value)} ${unit || 'sqm'}`;
};
