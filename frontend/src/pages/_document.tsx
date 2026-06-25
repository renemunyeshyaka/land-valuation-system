import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="rw">
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&display=swap" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <meta charSet="utf-8" />
        <meta name="description" content="Land Valuation System - Accurate property valuations powered by official Rwanda gazette data" />
        <meta name="keywords" content="land valuation, Rwanda, properties, real estate, diaspora, investors" />
        {/* International SEO — hreflang alternate language tags */}
        <link rel="alternate" href="https://landval.kcoders.org/" hrefLang="x-default" />
        <link rel="alternate" href="https://landval.kcoders.org/" hrefLang="en" />
        <link rel="alternate" href="https://landval.kcoders.org/" hrefLang="fr" />
        <link rel="alternate" href="https://landval.kcoders.org/" hrefLang="rw" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}