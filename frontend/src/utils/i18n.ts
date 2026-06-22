import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import rw from './locales/rw.json';

const getUserLanguage = (): string => {
  if (typeof window !== 'undefined') {
    // Check localStorage for user preference
    const stored = localStorage.getItem('preferred_language');
    if (stored) return stored;

    // Check URL path for locale prefix
    const pathMatch = window.location.pathname.match(/^\/(en|fr|rw)(\/|$)/);
    if (pathMatch) return pathMatch[1];
  }
  return 'en';
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    rw: { translation: rw },
  },
  lng: getUserLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  detection: {
    // Manual detection — we control it via the LanguageSwitcher
  },
});

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'fr', label: 'French', nativeLabel: 'Français' },
  { code: 'rw', label: 'Kinyarwanda', nativeLabel: 'Kinyarwanda' },
] as const;

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred_language', lang);
    // Update html lang attribute
    document.documentElement.lang = lang;
  }
};

export default i18n;
