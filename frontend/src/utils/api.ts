/**
 * Single source of truth for the backend API base URL.
 *
 * Reads NEXT_PUBLIC_API_URL, which Next.js inlines into the bundle at build time.
 *
 * - Production: NEXT_PUBLIC_API_URL MUST be set. If it is missing (or is a
 *   localhost value baked in from a stray .env.local), this throws a descriptive
 *   error instead of silently calling the user's own machine. Without this guard,
 *   login (OTP) and password reset silently fail for every user in production.
 * - Development: falls back to the local backend on port 5001.
 */
export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;

  if (url) {
    // Strip trailing slashes so callers can safely append /api/v1/...
    return url.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Configuration error: NEXT_PUBLIC_API_URL is not set. ' +
        'The production frontend must be built with NEXT_PUBLIC_API_URL ' +
        '(e.g. NEXT_PUBLIC_API_URL=https://landval.kcoders.org). ' +
        'Without it the app would silently call localhost and login/password ' +
        'reset would fail for every user.',
    );
  }

  // Local development only.
  return 'http://localhost:5001';
}
