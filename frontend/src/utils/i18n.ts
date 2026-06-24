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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

/**
 * Gets the auth token from localStorage if the user is logged in.
 */
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

/**
 * Sends the user's language preference to the backend so it persists across sessions.
 * Silently fails if the user is not logged in or the request fails.
 */
const syncLanguageToBackend = async (lang: string): Promise<void> => {
  const token = getAuthToken();
  if (!token) return; // Not logged in — no need to sync

  try {
    await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ preferred_language: lang }),
    });
  } catch {
    // Silently fail — language still works locally via localStorage
  }
};

/**
 * Fetches the user's preferred language from the backend profile.
 * Used on login / app init to sync the server-stored preference.
 */
export const syncLanguageFromBackend = async (): Promise<void> => {
  const token = getAuthToken();
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success && data.data?.preferred_language) {
      const lang = data.data.preferred_language;
      if (lang !== i18n.language && SUPPORTED_LANGUAGES.some(l => l.code === lang)) {
        i18n.changeLanguage(lang);
        localStorage.setItem('preferred_language', lang);
        document.documentElement.lang = lang;
      }
    }
  } catch {
    // Silently fail — fall back to localStorage preference
  }
};

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred_language', lang);
    document.documentElement.lang = lang;
    // Sync to backend (fire-and-forget)
    syncLanguageToBackend(lang);
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
