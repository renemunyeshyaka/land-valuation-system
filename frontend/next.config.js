/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  images: {
    remotePatterns: [
      // Add your image remote patterns here instead of domains
      // Example: { protocol: 'https', hostname: '**.example.com' }
    ],
  },
};

module.exports = nextConfig;
