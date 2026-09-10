import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import rw from './locales/rw.json';

/**
 * The language preference is mirrored into a cookie as well as localStorage.
 *
 * localStorage is not readable during SSR, so the server always painted the
 * fallback language ('rw') and the real preference was only applied in an
 * effect after hydration. Two consequences: every page flashed Kinyarwanda
 * first, and if hydration was slow or failed the page stayed in Kinyarwanda
 * permanently. The cookie lets _app.getInitialProps render the correct
 * language on the very first paint.
 */
export const LANGUAGE_COOKIE = 'preferred_language';
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const ALL_LANGUAGE_CODES = ['en', 'fr', 'rw'];

const isSupportedLanguage = (lang: unknown): lang is string =>
  typeof lang === 'string' && ALL_LANGUAGE_CODES.includes(lang);

const readLanguageFromCookieString = (cookieString: string | null | undefined): string | null => {
  if (!cookieString) return null;
  const prefix = `${LANGUAGE_COOKIE}=`;
  const part = cookieString
    .split(';')
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(prefix));
  if (!part) return null;
  const value = decodeURIComponent(part.slice(prefix.length));
  return isSupportedLanguage(value) ? value : null;
};

/** Reads the preference from document.cookie (client only). */
export const readLanguageCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  return readLanguageFromCookieString(document.cookie);
};

/** Reads the preference from a raw Cookie header (server, inside getInitialProps). */
export const readLanguageFromCookieHeader = (cookieHeader?: string | null): string | null =>
  readLanguageFromCookieString(cookieHeader);

/** Mirrors the language into a cookie so SSR can honour it. */
export const writeLanguageCookie = (lang: string): void => {
  if (typeof document === 'undefined') return;
  document.cookie = `${LANGUAGE_COOKIE}=${encodeURIComponent(lang)}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE}; SameSite=Lax`;
};

/**
 * Detects the user's preferred language from the cookie or localStorage.
 * This should ONLY be called on the client side, from an effect after hydration,
 * where it is safe for the result to differ from the server-rendered language.
 */
const detectClientLanguage = (): string => {
  // The cookie wins: it is what the server painted, so agreeing with it avoids a
  // visible switch right after hydration.
  const stored = readLanguageCookie() || localStorage.getItem('preferred_language');
  if (stored) return stored;

  // Check URL path for locale prefix
  const pathMatch = window.location.pathname.match(/^\/(en|fr|rw)(\/|$)/);
  if (pathMatch) return pathMatch[1];

  return 'rw';
};

/**
 * Language the i18n instance starts with.
 *
 * Server and client MUST resolve this to the same value, otherwise React reports
 * "Text content does not match server-rendered HTML" (#425). The cookie is the
 * only preference both sides can read, so:
 *  - client: read it synchronously at module load, matching the language the
 *    server just painted;
 *  - server: there is no `document`, so start on the fallback and let
 *    `_app.getInitialProps` switch to the cookie language before rendering.
 */
const getInitialLanguage = (): string => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'rw';
  return readLanguageCookie() || 'rw';
};

// Resources are bundled inline, so i18next initialises synchronously and the
// very first client render already uses the right language, not the fallback.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    rw: { translation: rw },
  },
  lng: getInitialLanguage(),
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
    const backendLang = data?.data?.preferred_language;
    if (!data?.success || !backendLang) return;
    if (!SUPPORTED_LANGUAGES.some((l) => l.code === backendLang)) return;

    // A language the user chose on THIS device wins. The backend copy can be stale
    // (an earlier sync may have failed), and letting it overwrite the local choice
    // on every page load looks like the translations are broken.
    const localPreference = readLanguageCookie() || localStorage.getItem('preferred_language');
    if (localPreference) {
      if (localPreference !== backendLang) {
        syncLanguageToBackend(localPreference);
      }
      return;
    }

    // No local choice yet (e.g. first visit on a new device): adopt the stored one.
    if (backendLang !== i18n.language) {
      i18n.changeLanguage(backendLang);
      localStorage.setItem('preferred_language', backendLang);
      writeLanguageCookie(backendLang);
      document.documentElement.lang = backendLang;
    }
  } catch {
    // Silently fail — fall back to localStorage preference
  }
};

export const changeLanguage = (lang: string) => {
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem('preferred_language', lang);
    writeLanguageCookie(lang);
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
