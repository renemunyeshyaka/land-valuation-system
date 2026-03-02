import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Font Awesome 6.0.0-beta3 - Icon System */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css"
          crossOrigin="anonymous"
        />

        {/* Leaflet CSS - Map Library */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin="anonymous"
        />

        {/* Inter Font - Main typeface (loaded from system, fallback to Tailwind) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />

        {/* Metadata */}
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="description" content="Land Valuation System - Accurate property valuations powered by official Rwanda gazette data" />
        <meta name="keywords" content="land valuation, Rwanda, properties, real estate, diaspora, investors" />
        <meta name="author" content="Land Valuation System" />
        <meta name="theme-color" content="#0b5e42" />

        {/* Open Graph / Social Meta Tags */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Land Valuation System - Rwanda" />
        <meta property="og:description" content="Accurate property valuations powered by official Rwanda gazette data" />
        <meta property="og:site_name" content="LandVal" />
        <meta property="og:locale" content="en_US" />

        {/* Favicon / PWA Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
        <link rel="preconnect" href="https://unpkg.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://basemaps.cartocdn.com" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
