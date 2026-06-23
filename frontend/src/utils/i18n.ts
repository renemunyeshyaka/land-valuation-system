import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import rw from './locales/rw.json';

/**
 * Detects the user's preferred language from localStorage or URL path.
 * This should ONLY be called on the client side (inside useEffect).
 * During SSR / module init time we always use the fallback ('rw')
 * to keep server and client renders consistent (avoid hydration mismatch).
 */
const detectClientLanguage = (): string => {
  // Check localStorage for user preference
  const stored = localStorage.getItem('preferred_language');
  if (stored) return stored;

  // Check URL path for locale prefix
  const pathMatch = window.location.pathname.match(/^\/(en|fr|rw)(\/|$)/);
  if (pathMatch) return pathMatch[1];

  return 'rw';
};

// IMPORTANT: Always use the same initial language on both server and client
// to prevent hydration mismatch errors (#418, #423, #425).
// The user's actual preference is detected in a useEffect after first render.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    rw: { translation: rw },
  },
  lng: 'rw',
  fallbackLng: 'rw',
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

/** Call this from a useEffect in _app.tsx to apply the saved language after hydration. */
export const applySavedLanguage = (): void => {
  if (typeof window !== 'undefined') {
    const lang = detectClientLanguage();
    if (lang !== i18n.language) {
      i18n.changeLanguage(lang);
    }
  }
};

export default i18n;
