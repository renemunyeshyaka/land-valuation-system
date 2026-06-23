import React, { useEffect, useState } from 'react';
import Footer from '@/components/Footer';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
// ...existing code...

declare global {
  interface Window {
    L: any;
    mapInitialized?: boolean;
  }
}

interface ValuationResult {
  upi: string;
  property: {
    district: string;
    sector: string;
    property_type: string;
    area_sqm: number;
  };
  valuation: {
    base_price_rwf: number;
    total_value_rwf: number;
    coefficient: number;
  };
}

const Home: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [upi, setUpi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [estimateResult, setEstimateResult] = useState<any | null>(null);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpi(e.target.value);
  };

  const handleEstimate = async () => {
    // Always redirect to register page before allowing estimate
    window.location.href = 'http://localhost:3001/auth/register';
    return;
    // --- The code below will not run due to the redirect above ---
    // if (!upi.trim()) {
    //   setError('Please enter a valid UPI code.');
    //   return;
    // }
    // setLoading(true);
    // setError('');
    // setEstimateResult(null);
    // try {
    //   const payloadToSend = { upi: upi.trim() };
    //   const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/estimate-search`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(payloadToSend),
    //   });
    //   const payload = await response.json().catch(() => null);
    //   if (!response.ok) {
    //     const apiError = payload?.error;
    //     const errorMessage = typeof apiError === 'string' ? apiError : apiError?.message || payload?.message || 'Estimate not found.';
    //     throw new Error(errorMessage);
    //   }
    //   setEstimateResult(payload?.data || payload);
    // } catch (err: any) {
    //   setError(err.message || 'Failed to fetch estimate. Please try again.');
    // } finally {
    //   setLoading(false);
    // }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEstimate();
    }
  };
  useEffect(() => {
    // Load Leaflet CSS and JS dynamically
    if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
      // Leaflet CSS
      const leafletCss = document.createElement('link');
      leafletCss.id = 'leaflet-css';
      leafletCss.rel = 'stylesheet';
      leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(leafletCss);

      // Leaflet JS
      const leafletScript = document.createElement('script');
      leafletScript.id = 'leaflet-js';
      leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      leafletScript.async = true;
      leafletScript.onload = () => {
        if (window.L && !window.mapInitialized) {
          window.mapInitialized = true;
          const mapEl = document.getElementById('miniMap');
          if (mapEl) {
            const map = window.L.map(mapEl, {
              zoomControl: false,
              dragging: false,
              scrollWheelZoom: false,
              attributionControl: false
            }).setView([-1.9441, 30.0619], 10);
            
            window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
              subdomains: 'abcd'
            }).addTo(map);
            
            // Markers for major cities
            window.L.marker([-1.9441, 30.0619]).addTo(map).bindTooltip('Kigali');
            window.L.marker([-1.4997, 29.6370]).addTo(map).bindTooltip('Rubavu');
            window.L.marker([-2.4797, 28.8963]).addTo(map).bindTooltip('Rusizi');
            
            // Highlight zone polygon
            window.L.polygon([
              [-1.93, 30.04],
              [-1.90, 30.10],
              [-1.98, 30.12],
              [-2.00, 30.05]
            ], {
              color: '#0b5e42',
              weight: 3,
              fillOpacity: 0.1
            }).addTo(map);
          }
        }
      };
      document.body.appendChild(leafletScript);
    }

    // Cleanup function
    return () => {
      const script = document.getElementById('leaflet-js');
      const css = document.getElementById('leaflet-css');
      if (script) document.body.removeChild(script);
      if (css) document.head.removeChild(css);
    };
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    const handleRouteChange = () => setMobileMenuOpen(false);
    router.events?.on?.('routeChangeStart', handleRouteChange);
    return () => router.events?.off?.('routeChangeStart', handleRouteChange);
  }, [router]);

  return (
    <>
      <Head>
        <title>Land Valuation System · Rwanda</title>
        {/* Inline critical custom styles for SSR/hydration match */}
        <style>{`
          body { font-family: 'Inter', sans-serif; background-color: #fafaf9; }
          .map-preview { height: 280px; width: 100%; border-radius: 1.5rem; overflow: hidden; box-shadow: 0 12px 30px -10px rgba(0,40,20,0.2); }
          .hero-gradient { background: linear-gradient(112deg, #0b3b2c 0%, #1f6e4a 100%); }
          .feature-card { transition: all 0.15s ease; }
          .feature-card:hover { transform: translateY(-4px); box-shadow: 0 25px 35px -12px rgba(0,80,30,0.25); }
          .badge-diaspora { background-color: #ffedd5; color: #9a3412; }
          .stat-gradient { background: linear-gradient(145deg, #ffffff 0%, #f3f9f3 100%); }
          .footer-link { transition: color 0.2s; }
          .footer-link:hover { color: #10b981; }
        `}</style>
      </Head>
      <div className="antialiased text-gray-800">
        {/* Navigation */}
        <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              {/* logo + name */}
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
                  <i className="fas fa-map-marked-alt text-white text-lg"></i>
                </div>
                <span className="font-bold text-xl tracking-tight text-emerald-900">
                  Land<span className="text-emerald-600">Val</span>
                </span>
              </div>

              {/* main menu (desktop) */}
              <div className="hidden md:flex space-x-7 text-sm font-medium text-gray-700">
                <Link href="/" className="hover:text-emerald-700 transition">{t('nav.home')}</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition">{t('nav.howItWorks')}</Link>
                <Link href="/benefits" className="hover:text-emerald-700 transition">{t('nav.benefits')}</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition">{t('nav.marketplace')}</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition">{t('nav.contact')}</Link>
              </div>

              {/* Hamburger menu button (mobile/tablet) */}
              <div className="md:hidden flex items-center">
                <button
                  aria-label="Open menu"
                  className="inline-flex items-center justify-center p-2 rounded-md text-emerald-800 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onClick={() => setMobileMenuOpen(v => !v)}
                >
                  {mobileMenuOpen ? (
                    <i className="fas fa-times text-2xl"></i>
                  ) : (
                    <i className="fas fa-bars text-2xl"></i>
                  )}
                </button>
              </div>

              {/* language & auth */}
              <div className="hidden sm:flex items-center gap-3">
                <LanguageSwitcher />
                <Link href="/auth/login" className="text-sm font-medium text-emerald-800 hover:text-emerald-900 px-3 py-2">{t('auth.login')}</Link>
                <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition">{t('auth.signup')}</Link>
              </div>
            </div>
          </div>
          {/* Mobile menu dropdown */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white/95 border-b border-gray-200/70 shadow-lg absolute left-0 right-0 top-full z-40 animate-fade-in-down">
              <div className="flex flex-col px-6 py-4 space-y-2 text-base font-medium text-gray-800">
                <Link href="/" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.home')}</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.howItWorks')}</Link>
                <Link href="/benefits" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.benefits')}</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.marketplace')}</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.contact')}</Link>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="px-3 py-2 border-t border-gray-100">
                    <LanguageSwitcher />
                  </div>
                  <Link href="/auth/login" className="text-emerald-800 hover:text-emerald-900 px-3 py-2 rounded-md transition text-sm font-medium bg-emerald-50" onClick={() => setMobileMenuOpen(false)}>{t('auth.login')}</Link>
                  <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-3 py-2 rounded-md shadow-sm transition" onClick={() => setMobileMenuOpen(false)}>{t('auth.signup')}</Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* HERO section with search & map preview */}
        <section className="hero-gradient text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* left text */}
              <div>
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/10">
                  <i className="fas fa-gavel mr-2 text-xs"></i> {t('home.heroBadge')}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                  {t('home.heroTitle')}
                </h1>
                <p className="text-lg text-emerald-50 mt-5 max-w-lg">
                  {t('home.heroSubtitle')}
                </p>
                {/* UPI-only estimate search form */}
                <form
                  className="mt-8 max-w-xl"
                  onSubmit={e => { e.preventDefault(); handleEstimate(); }}
                >
                  <input
                    type="text"
                    name="upi"
                    placeholder={t('home.searchPlaceholder')}
                    value={upi}
                    onChange={handleInputChange}
                    className="w-full pl-4 pr-4 py-3.5 rounded-2xl text-gray-800 placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-400 outline-none disabled:opacity-50"
                    disabled={loading}
                    required
                  />
                  <div className="flex flex-row gap-4 mt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-amber-400 hover:bg-amber-500 text-emerald-950 font-semibold px-6 py-3.5 rounded-2xl shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> {t('home.loading')}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-calculator"></i> {t('home.estimateButton')}
                        </>
                      )}
                    </button>
                    <Link
                      href="/auth/register"
                      className="flex-1 bg-sky-400 hover:bg-emerald-600 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-play-circle"></i> {t('home.getStarted')}
                    </Link>
                  </div>
                </form>
                
                {/* Error message */}
                {error && (
                  <div className="mt-4 bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-xl max-w-xl">
                    <i className="fas fa-exclamation-circle mr-2"></i> {error}
                  </div>
                )}

                {/* Estimate result */}
                {estimateResult && (
                  <div className="mt-4 bg-white/95 backdrop-blur-sm border-2 border-amber-300 text-gray-800 px-6 py-4 rounded-2xl max-w-xl shadow-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg text-emerald-900">
                        <i className="fas fa-check-circle text-emerald-600 mr-2"></i>
                        {t('home.estimateComplete')}
                      </h3>
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-semibold">
                        UPI: {estimateResult.parcel?.upi}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">{t('home.location')}</p>
                        <p className="font-semibold">{estimateResult.parcel?.district}, {estimateResult.parcel?.sector}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{t('home.area')}</p>
                        <p className="font-semibold">{estimateResult.parcel?.land_size_sqm?.toLocaleString()} m²</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{t('home.zoneCoefficient')}</p>
                        <p className="font-semibold">{estimateResult.parcel?.zone_coefficient}x</p>
                      </div>
                      <div>
                        <p className="text-gray-600">{t('home.basePriceSqm')}</p>
                        <p className="font-semibold">RWF {estimateResult.parcel?.base_price_per_sqm?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-gray-600 text-sm">{t('home.officialGazettePrices')}</p>
                      <ul className="mt-2 space-y-1">
                        {estimateResult.prices?.map((price: number, idx: number) => (
                          <li key={idx} className="text-lg font-bold text-emerald-700">
                            {t('home.option')} {idx + 1}: RWF {price.toLocaleString()}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3">
                        <p className="text-gray-600 text-xs mb-1">{t('home.gazetteConsiderations')}:</p>
                        <ul className="flex flex-wrap gap-2 text-xs">
                          {Object.entries(estimateResult.considerations || {}).map(([key, val]: [string, unknown]) => (
                            <li key={key} className={Boolean(val) ? 'bg-emerald-100 text-emerald-800 px-2 py-1 rounded' : 'bg-gray-100 text-gray-500 px-2 py-1 rounded'}>
                              {key.replace('_', ' ')}: {Boolean(val) ? t('home.yes') : t('home.no')}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* quick stats */}
                <div className="flex gap-6 mt-6 text-sm text-emerald-100">
                  <div><i className="fas fa-check-circle text-amber-300 mr-1"></i> {t('home.quickStats.properties')}</div>
                  <div><i className="fas fa-map-pin text-amber-300 mr-1"></i> {t('home.quickStats.districts')}</div>
                  <div><i className="fas fa-globe text-amber-300 mr-1"></i> {t('home.quickStats.diasporaReady')}</div>
                </div>
              </div>
              {/* right side: interactive map preview */}
              <div className="map-preview border-4 border-white/30 shadow-2xl">
                <div id="miniMap" style={{ height: '280px', width: '100%', borderRadius: '1.5rem' }}></div>
              </div>
            </div>
          </div>
          {/* subtle wave divider */}
          <div className="h-2 bg-gradient-to-r from-emerald-800 via-emerald-600 to-lime-500"></div>
        </section>

        {/* FEATURES grid */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto">
              <span className="text-emerald-600 font-semibold text-sm tracking-wider uppercase">{t('home.features.title')}</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">{t('home.features.heading')}</h2>
              <p className="text-gray-600 mt-4">{t('home.features.subtitle')}</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
              {/* feature 1 */}
              <div className="feature-card bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 text-xl mb-4">
                  <i className="fas fa-book-open"></i>
                </div>
                <h3 className="font-bold text-lg">{t('home.features.gazette.title')}</h3>
                <p className="text-gray-500 text-sm mt-2">{t('home.features.gazette.desc')}</p>
              </div>
              {/* feature 2 */}
              <div className="feature-card bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 text-xl mb-4">
                  <i className="fas fa-draw-polygon"></i>
                </div>
                <h3 className="font-bold text-lg">{t('home.features.maps.title')}</h3>
                <p className="text-gray-500 text-sm mt-2">{t('home.features.maps.desc')}</p>
              </div>
              {/* feature 3 */}
              <div className="feature-card bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 text-xl mb-4">
                  <i className="fas fa-chart-line"></i>
                </div>
                <h3 className="font-bold text-lg">{t('home.features.evolution.title')}</h3>
                <p className="text-gray-500 text-sm mt-2">{t('home.features.evolution.desc')}</p>
              </div>
              {/* feature 4 */}
              <div className="feature-card bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 text-xl mb-4">
                  <i className="fas fa-handshake"></i>
                </div>
                <h3 className="font-bold text-lg">{t('home.features.matching.title')}</h3>
                <p className="text-gray-500 text-sm mt-2">{t('home.features.matching.desc')}</p>
              </div>
            </div>

            {/* map + extra */}
            <div className="mt-16 bg-emerald-50/80 rounded-3xl p-8 border border-emerald-100 flex flex-col lg:flex-row gap-8 items-center">
              <div className="lg:w-2/3">
                <div className="flex items-center gap-2 text-emerald-800 font-medium">
                  <i className="fas fa-map-location-dot"></i> {t('home.features.zoneLookup')}
                </div>
                <h3 className="text-2xl font-bold mt-2">{t('home.features.zoneHeading')}</h3>
                <p className="text-gray-700 mt-3">{t('home.features.zoneDesc')}</p>
                <div className="flex flex-wrap gap-4 mt-6">
                  <span className="px-4 py-2 rounded-full text-sm shadow-sm" style={{ backgroundColor: '#33A852', color: 'white' }}>
                    <i className="fas fa-check-circle text-white mr-1"></i> {t('home.features.kigaliUrban')}
                  </span>
                  <span className="px-4 py-2 rounded-full text-sm shadow-sm" style={{ backgroundColor: '#FFD100', color: '#333' }}>
                    <i className="fas fa-check-circle text-emerald-700 mr-1"></i> {t('home.features.easternProvince')}
                  </span>
                  <span className="px-4 py-2 rounded-full text-sm shadow-sm" style={{ backgroundColor: '#00AEEF', color: 'white' }}>
                    <i className="fas fa-check-circle text-white mr-1"></i> {t('home.features.agriculturalZones')}
                  </span>
                </div>
              </div>
              <div className="lg:w-1/3 flex justify-center">
                <i className="fas fa-map text-7xl text-emerald-700 opacity-30"></i>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS steps */}
        <section className="py-16 bg-gray-50/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center text-gray-800">{t('home.steps.title')}</h2>
            <div className="grid md:grid-cols-4 gap-5 mt-14">
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-md">1</div>
                <h3 className="font-semibold mt-4">{t('home.steps.step1')}</h3>
                <p className="text-gray-500 text-sm mt-1">{t('home.steps.step1Desc')}</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-md">2</div>
                <h3 className="font-semibold mt-4">{t('home.steps.step2')}</h3>
                <p className="text-gray-500 text-sm mt-1">{t('home.steps.step2Desc')}</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-md">3</div>
                <h3 className="font-semibold mt-4">{t('home.steps.step3')}</h3>
                <p className="text-gray-500 text-sm mt-1">{t('home.steps.step3Desc')}</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-md">4</div>
                <h3 className="font-semibold mt-4">{t('home.steps.step4')}</h3>
                <p className="text-gray-500 text-sm mt-1">{t('home.steps.step4Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* PROPERTY LISTINGS preview + diaspora badge */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-between items-end">
              <div>
                <span className="text-emerald-600 font-semibold text-sm">{t('homePage.featuredTitle')}</span>
                <h2 className="text-3xl font-bold text-gray-900 mt-1">{t('homePage.propertiesHeading')}</h2>
              </div>
              <Link href="/marketplace" className="text-emerald-700 font-medium hover:underline">{t('homePage.viewAll')} <i className="fas fa-arrow-right ml-1 text-sm"></i></Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {/* card 1 */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition">
                <div className="h-44 bg-gray-200 rounded-t-3xl relative overflow-hidden" style={{ background: "url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80') center/cover" }}>
                  <div className="absolute top-3 right-3 bg-amber-400 text-emerald-900 text-xs font-bold px-3 py-1 rounded-full">{t('homePage.diasporaVerified')}</div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <i className="fas fa-map-pin text-emerald-600"></i> Kigali, Gasabo
                  </div>
                  <div className="font-bold text-xl mt-1">RFr 185M</div>
                  <div className="flex gap-2 text-xs text-gray-600 mt-2">
                    <span><i className="far fa-clock mr-1"></i> 2,450 m²</span>
                    <span><i className="fas fa-tag mr-1"></i> residential</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-emerald-600 text-sm font-medium">+ gazette zone A</span>
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full">{t('homePage.active')}</span>
                  </div>
                </div>
              </div>
              {/* card 2 - agricultural */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition">
                <div className="h-44 bg-gray-200 rounded-t-3xl relative overflow-hidden" style={{ background: "url('https://images.unsplash.com/photo-1589923188900-85dae523342b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80') center/cover" }}>
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">{t('homePage.foreignerFriendly')}</div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <i className="fas fa-map-pin text-emerald-600"></i> Musanze, Northern
                  </div>
                  <div className="font-bold text-xl mt-1">RFr 97M</div>
                  <div className="flex gap-2 text-xs text-gray-600 mt-2">
                    <span><i className="far fa-clock mr-1"></i> 5,200 m²</span>
                    <span><i className="fas fa-tag mr-1"></i> agricultural</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-emerald-600 text-sm font-medium">+ coffee zone</span>
                    <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full">{t('homePage.priceTrend')} +12%</span>
                  </div>
                </div>
              </div>
              {/* card 3 - diaspora focus */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition">
                <div className="h-44 bg-gray-200 rounded-t-3xl relative overflow-hidden" style={{ background: "url('https://imgs.search.brave.com/nv0nT5CAQlecHbkSIapYwnTY8tRKrlERdHHBBLwFfP8/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvOTQ2/ODQ3MjM2L3Bob3Rv/L3RoZS1ydWJvbmEt/Y292ZS1vbi1sYWtl/LWtpdnUuanBnP3M9/NjEyeDYxMiZ3PTAm/az0yMCZjPWstblVN/cGI2ZVk4LTAwVi15/bVNBVTFHdEl0ZHNo/MFU5UHBGTUx0VS1l/aXM9') center/cover" }}>
                  <div className="absolute top-3 right-3 bg-purple-200 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">{t('homePage.diasporaPreferred')}</div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <i className="fas fa-map-pin text-emerald-600"></i> Rubavu, Lake view
                  </div>
                  <div className="font-bold text-xl mt-1">RFr 340M</div>
                  <div className="flex gap-2 text-xs text-gray-600 mt-2">
                    <span><i className="far fa-clock mr-1"></i> 1,800 m²</span>
                    <span><i className="fas fa-tag mr-1"></i> commercial</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-emerald-600 text-sm font-medium">+ tourism zone</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">foreign title</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIAL + STATS */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <i className="fas fa-quote-left text-4xl text-emerald-300"></i>
                <p className="text-xl italic text-gray-700 mt-2">{t('homePage.testimonialQuote')}</p>
                <div className="flex items-center gap-3 mt-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xl">JM</div>
                  <div><span className="font-bold">{t('homePage.testimonialName')}</span> <span className="text-gray-500 text-sm">{t('homePage.testimonialLocation')}</span></div>
                </div>
              </div>
              {/* stats */}
              <div className="grid grid-cols-2 gap-5 p-8 rounded-3xl border border-emerald-100" style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f3f9f3 100%)' }}>
                <div><span className="text-3xl font-black text-emerald-800">18.4B+</span><span className="block text-sm text-gray-600">{t('homePage.statTransactions')}</span></div>
                <div><span className="text-3xl font-black text-emerald-800">2.3k</span><span className="block text-sm text-gray-600">{t('homePage.statListed')}</span></div>
                <div><span className="text-3xl font-black text-emerald-800">34%</span><span className="block text-sm text-gray-600">{t('homePage.statDiasporaBuyers')}</span></div>
                <div><span className="text-3xl font-black text-emerald-800">4.8</span><span className="block text-sm text-gray-600">{t('homePage.statRating')}</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-16 text-white" style={{ background: 'linear-gradient(112deg, #0b3b2c 0%, #1f6e4a 100%)' }}>
          <div className="max-w-5xl mx-auto text-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold">{t('homePage.ctaTitle')}</h2>
            <p className="text-emerald-100 mt-3 text-lg">{t('homePage.ctaSubtitle')}</p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <a
                href="/auth/register"
                className="bg-amber-400 text-emerald-900 hover:bg-white font-semibold px-8 py-4 rounded-2xl shadow-xl text-lg flex items-center gap-2 transition-colors duration-200"
              >
                <i className="fas fa-crown"></i> {t('homePage.ctaStartTrial')}
              </a>
              <a
                href="/contact"
                className="bg-sky-500 text-white hover:bg-sky-600 px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-2 transition-colors duration-200"
              >
                <i className="fas fa-phone-alt"></i> {t('homePage.ctaTalkExpert')}
              </a>
            </div>
            <div className="mt-8 text-sm text-emerald-200 flex items-center justify-center gap-6">
              <span><i className="fas fa-lock"></i> {t('homePage.ctaSecure')}</span>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <Footer />
      </div>
    </>
  );
};

export default Home;