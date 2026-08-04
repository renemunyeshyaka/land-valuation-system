/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  generateEtags: true,

  // Image optimization
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 768, 1024, 1280, 1536],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Cache static pages aggressively
  staticPageGenerationTimeout: 120,

  // Enable experimental optimizations
  experimental: {
    optimizeCss: false, // Set to true if you have @next/bundle-analyzer setup
    optimizePackageImports: ['@heroicons/react', 'lucide-react'],
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/:path*.(jpg|jpeg|gif|png|ico|svg|webp|avif|woff|woff2|ttf|eot)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.(css|js)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/:path*.(json)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
    ];
  },
};

// Fail the production build loudly if the API base URL is missing or is a
// localhost value. This prevents baking http://localhost:5001 into the bundle,
// which silently breaks login (OTP) and password reset for every user in
// production. Use `next dev` for local development instead of `next build`.
//
// To test a production build locally against your own backend, explicitly opt
// in with ALLOW_LOCALHOST_API_URL=1, e.g.:
//   ALLOW_LOCALHOST_API_URL=1 NEXT_PUBLIC_API_URL=http://localhost:5001 npm run build
// This override is never set in CI/production, so the guard still protects real
// deployments.
const nextPublicApiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const allowLocalhostApiUrl = process.env.ALLOW_LOCALHOST_API_URL === '1';
if (
  process.env.NODE_ENV === 'production' &&
  process.argv.includes('build') &&
  !allowLocalhostApiUrl &&
  (!nextPublicApiUrl || /localhost|127\.0\.0\.1/.test(nextPublicApiUrl))
) {
  throw new Error(
    'NEXT_PUBLIC_API_URL must be a real server URL (not localhost) when building for production. ' +
      'Example: NEXT_PUBLIC_API_URL=https://landval.kcoders.org next build\n' +
      'For a local test build, set ALLOW_LOCALHOST_API_URL=1 explicitly.',
  );
}

module.exports = nextConfig;
