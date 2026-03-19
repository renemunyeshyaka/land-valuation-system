import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
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
  const [upi, setUpi] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [estimateResult, setEstimateResult] = useState<any | null>(null);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpi(e.target.value);
  };

  const handleEstimate = async () => {
    // Always redirect to register page before allowing estimate
    window.location.href = 'http://localhost:3000/auth/register';
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
    //   const response = await fetch('http://localhost:5000/api/v1/estimate-search', {
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
                <Link href="/" className="hover:text-emerald-700 transition">Home</Link>
                <Link href="/search" className="hover:text-emerald-700 transition">Valuation</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition">Marketplace</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition">How it works</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition">Contact</Link>
              </div>

              {/* language & auth */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white/80">
                  <i className="fas fa-globe text-emerald-600 mr-1 text-xs"></i>
                  <span className="font-medium">RW</span>
                  <i className="fas fa-chevron-down ml-1 text-gray-400 text-xs"></i>
                </div>
                <Link href="/auth/login" className="text-sm font-medium text-emerald-800 hover:text-emerald-900 px-3 py-2">Log in</Link>
                <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition">Sign up</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* HERO section with search & map preview */}
        <section className="hero-gradient text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* left text */}
              <div>
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/10">
                  <i className="fas fa-gavel mr-2 text-xs"></i> Official Rwanda Gazette 2025
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight">
                  Accurate land valuation <br />powered by <span className="text-amber-300">official data</span>
                </h1>
                <p className="text-lg text-emerald-50 mt-5 max-w-lg">
                  Connect with verified buyers — diaspora & foreign investors. Get instant pricing based on zone coefficients, title verification, and market trends.
                </p>
                {/* UPI-only estimate search form */}
                <form
                  className="mt-8 max-w-xl"
                  onSubmit={e => { e.preventDefault(); handleEstimate(); }}
                >
                  <input
                    type="text"
                    name="upi"
                    placeholder="Enter UPI code (e.g., 1/01/01/01/1234)"
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
                          <i className="fas fa-spinner fa-spin"></i> Loading...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-calculator"></i> Estimate
                        </>
                      )}
                    </button>
                    <Link
                      href="/auth/register"
                      className="flex-1 bg-sky-400 hover:bg-emerald-600 text-white font-semibold px-6 py-3.5 rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-play-circle"></i> Get Started
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
                        Estimate Complete
                      </h3>
                      <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-semibold">
                        UPI: {estimateResult.parcel?.upi}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Location</p>
                        <p className="font-semibold">{estimateResult.parcel?.district}, {estimateResult.parcel?.sector}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Area</p>
                        <p className="font-semibold">{estimateResult.parcel?.land_size_sqm?.toLocaleString()} m²</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Zone Coefficient</p>
                        <p className="font-semibold">{estimateResult.parcel?.zone_coefficient}x</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Base Price/sqm</p>
                        <p className="font-semibold">RWF {estimateResult.parcel?.base_price_per_sqm?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-gray-600 text-sm">Official Gazette Price Options</p>
                      <ul className="mt-2 space-y-1">
                        {estimateResult.prices?.map((price: number, idx: number) => (
                          <li key={idx} className="text-lg font-bold text-emerald-700">
                            Option {idx + 1}: RWF {price.toLocaleString()}
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3">
                        <p className="text-gray-600 text-xs mb-1">Gazette Considerations:</p>
                        <ul className="flex flex-wrap gap-2 text-xs">
                          {Object.entries(estimateResult.considerations || {}).map(([key, val]: [string, unknown]) => (
                            <li key={key} className={Boolean(val) ? 'bg-emerald-100 text-emerald-800 px-2 py-1 rounded' : 'bg-gray-100 text-gray-500 px-2 py-1 rounded'}>
                              {key.replace('_', ' ')}: {Boolean(val) ? 'Yes' : 'No'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* quick stats */}
                <div className="flex gap-6 mt-6 text-sm text-emerald-100">
                  <div><i className="fas fa-check-circle text-amber-300 mr-1"></i> 12k+ properties</div>
                  <div><i className="fas fa-map-pin text-amber-300 mr-1"></i> All 30 districts</div>
                  <div><i className="fas fa-globe text-amber-300 mr-1"></i> diaspora ready</div>
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
              <span className="text-emerald-600 font-semibold text-sm tracking-wider uppercase">Why choose LVS</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">Built for Rwanda's land market</h2>
              <p className="text-gray-600 mt-4">Gazette integration, geolocation precision, and direct buyer matching.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
              {/* feature 1 */}
              <div className="feature-card bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 text-xl mb-4">
                  <i className="fas fa-book-open"></i>
                </div>
                <h3 className="font-bold text-lg">Official Gazette data</h3>
                <p className="text-gray-500 text-sm mt-2">Location coefficients directly from Rwanda Land Authority, updated quarterly.</p>
              </div>
              {/* feature 2 */}
              <div className="feature-card bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 text-xl mb-4">
                  <i className="fas fa-draw-polygon"></i>
                </div>
                <h3 className="font-bold text-lg">Interactive parcel maps</h3>
                <p className="text-gray-500 text-sm mt-2">Draw boundaries, measure distances, view zoning overlays.</p>
              </div>
              {/* feature 3 */}
              <div className="feature-card bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
                <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 text-xl mb-4">
                  <i className="fas fa-chart-line"></i>
                </div>
                <h3 className="font-bold text-lg">Price evolution</h3>
                <p className="text-gray-500 text-sm mt-2">Historical trends & 5-year projection for smart investment.</p>
              </div>
              {/* feature 4 */}
              <div className="feature-card bg-white p-6 rounded-3xl border border-gray-100 shadow-md">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-700 text-xl mb-4">
                  <i className="fas fa-handshake"></i>
                </div>
                <h3 className="font-bold text-lg">Diaspora & foreign matching</h3>
                <p className="text-gray-500 text-sm mt-2">Connect with high‑net‑worth buyers; dedicated concierge.</p>
              </div>
            </div>

            {/* map + extra */}
            <div className="mt-16 bg-emerald-50/80 rounded-3xl p-8 border border-emerald-100 flex flex-col lg:flex-row gap-8 items-center">
              <div className="lg:w-2/3">
                <div className="flex items-center gap-2 text-emerald-800 font-medium">
                  <i className="fas fa-map-location-dot"></i> Real‑time zone lookup
                </div>
                <h3 className="text-2xl font-bold mt-2">Any location, instant classification</h3>
                <p className="text-gray-700 mt-3">Click on the map or type your address. Our engine cross-references the Rwanda gazette zones (urban, rural, agricultural, marshland) and computes the base coefficient.</p>
                <div className="flex flex-wrap gap-4 mt-6">
                  <span className="px-4 py-2 rounded-full text-sm shadow-sm" style={{ backgroundColor: '#33A852', color: 'white' }}>
                    <i className="fas fa-check-circle text-white mr-1"></i> Kigali urban
                  </span>
                  <span className="px-4 py-2 rounded-full text-sm shadow-sm" style={{ backgroundColor: '#FFD100', color: '#333' }}>
                    <i className="fas fa-check-circle text-emerald-700 mr-1"></i> Eastern Province
                  </span>
                  <span className="px-4 py-2 rounded-full text-sm shadow-sm" style={{ backgroundColor: '#00AEEF', color: 'white' }}>
                    <i className="fas fa-check-circle text-white mr-1"></i> Agricultural zones
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
            <h2 className="text-3xl font-bold text-center text-gray-800">Four steps to your land transaction</h2>
            <div className="grid md:grid-cols-4 gap-5 mt-14">
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-md">1</div>
                <h3 className="font-semibold mt-4">Search / upload</h3>
                <p className="text-gray-500 text-sm mt-1">Enter parcel ID or drop title documents</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-md">2</div>
                <h3 className="font-semibold mt-4">Instant valuation</h3>
                <p className="text-gray-500 text-sm mt-1">Gazette formula + market adj. + history</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-md">3</div>
                <h3 className="font-semibold mt-4">Connect & match</h3>
                <p className="text-gray-500 text-sm mt-1">Get introduced to serious buyers (diaspora, local)</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 bg-emerald-700 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto shadow-md">4</div>
                <h3 className="font-semibold mt-4">Secure exchange</h3>
                <p className="text-gray-500 text-sm mt-1">Title transfer support & payment escrow</p>
              </div>
            </div>
          </div>
        </section>

        {/* PROPERTY LISTINGS preview + diaspora badge */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap justify-between items-end">
              <div>
                <span className="text-emerald-600 font-semibold text-sm">Featured on marketplace</span>
                <h2 className="text-3xl font-bold text-gray-900 mt-1">Properties ready for investors</h2>
              </div>
              <Link href="/marketplace" className="text-emerald-700 font-medium hover:underline">View all <i className="fas fa-arrow-right ml-1 text-sm"></i></Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              {/* card 1 */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition">
                <div className="h-44 bg-gray-200 rounded-t-3xl relative overflow-hidden" style={{ background: "url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80') center/cover" }}>
                  <div className="absolute top-3 right-3 bg-amber-400 text-emerald-900 text-xs font-bold px-3 py-1 rounded-full">Diaspora verified</div>
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
                    <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full">active</span>
                  </div>
                </div>
              </div>
              {/* card 2 - agricultural */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition">
                <div className="h-44 bg-gray-200 rounded-t-3xl relative overflow-hidden" style={{ background: "url('https://images.unsplash.com/photo-1589923188900-85dae523342b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80') center/cover" }}>
                  <div className="absolute top-3 right-3 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">foreigner friendly</div>
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
                    <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full">price trend +12%</span>
                  </div>
                </div>
              </div>
              {/* card 3 - diaspora focus */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm hover:shadow-lg transition">
                <div className="h-44 bg-gray-200 rounded-t-3xl relative overflow-hidden" style={{ background: "url('https://images.unsplash.com/photo-1568605117036-5fe5e7fa0ab6?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80') center/cover" }}>
                  <div className="absolute top-3 right-3 bg-purple-200 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">Diaspora preferred</div>
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
                <p className="text-xl italic text-gray-700 mt-2">“As a diaspora investor, I needed reliable land values. LVS gave me gazette-backed confidence and connected me with a seller in Kigali within a week.”</p>
                <div className="flex items-center gap-3 mt-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xl">JM</div>
                  <div><span className="font-bold">Jean Marie V.</span> <span className="text-gray-500 text-sm"> · diaspora, Belgium</span></div>
                </div>
              </div>
              {/* stats */}
              <div className="grid grid-cols-2 gap-5 p-8 rounded-3xl border border-emerald-100" style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f3f9f3 100%)' }}>
                <div><span className="text-3xl font-black text-emerald-800">18.4B+</span><span className="block text-sm text-gray-600">Rwf transactions</span></div>
                <div><span className="text-3xl font-black text-emerald-800">2.3k</span><span className="block text-sm text-gray-600">properties listed</span></div>
                <div><span className="text-3xl font-black text-emerald-800">34%</span><span className="block text-sm text-gray-600">diaspora buyers</span></div>
                <div><span className="text-3xl font-black text-emerald-800">4.8</span><span className="block text-sm text-gray-600">⭐ user rating</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-16 text-white" style={{ background: 'linear-gradient(112deg, #0b3b2c 0%, #1f6e4a 100%)' }}>
          <div className="max-w-5xl mx-auto text-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to value or sell your land?</h2>
            <p className="text-emerald-100 mt-3 text-lg">Join thousands of Rwandans and global investors using the most trusted platform.</p>
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <a
                href="/auth/register"
                className="bg-amber-400 text-emerald-900 hover:bg-white font-semibold px-8 py-4 rounded-2xl shadow-xl text-lg flex items-center gap-2 transition-colors duration-200"
              >
                <i className="fas fa-crown"></i> Start free trial
              </a>
              <a
                href="/contact"
                className="bg-sky-500 text-white hover:bg-sky-600 px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-2 transition-colors duration-200"
              >
                <i className="fas fa-phone-alt"></i> Talk to expert
              </a>
            </div>
            <div className="mt-8 text-sm text-emerald-200 flex items-center justify-center gap-6">
              <span><i className="fas fa-lock"></i> secure & verified</span>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="bg-emerald-950 text-emerald-200 py-12">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 text-white">
                <i className="fas fa-map-marked-alt text-2xl"></i>
                <span className="font-bold text-xl">LandVal</span>
              </div>
              <p className="text-sm mt-3">The most trusted land valuation and land marketplace in Rwanda. All gazette data sourced from official publications.</p>
              <div className="flex gap-4 mt-5">
                <i className="fab fa-twitter hover:text-white text-xl"></i>
                <i className="fab fa-linkedin hover:text-white text-xl"></i>
                <i className="fab fa-whatsapp hover:text-white text-xl"></i>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white">Product</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Valuation</li>
                <li>Marketplace</li>
                <li>Pricing</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Gazette 2025</li>
                <li>Help center</li>
                <li>Blog</li>
                <li>Developers</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
                <li>Copyright RDB</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-emerald-800 mt-10 pt-6 text-center text-xs text-emerald-400">
            © 2026 Land Valuation System Ltd. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
};

export default Home;