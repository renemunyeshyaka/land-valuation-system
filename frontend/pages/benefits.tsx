
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function Benefits() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>Benefits · Land Valuation System</title>
        <meta name="description" content="Discover the benefits of using the Land Valuation System for property valuation and marketplace services in Rwanda." />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </Head>
      <div className="antialiased text-gray-800 min-h-screen flex flex-col">
        {/* Navigation Bar */}
        <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
                  <i className="fas fa-map-marked-alt text-white text-lg"></i>
                </div>
                <span className="font-bold text-xl tracking-tight text-emerald-900">
                  Land<span className="text-emerald-600">Val</span>
                </span>
              </div>
              <div className="hidden md:flex space-x-7 text-sm font-medium text-gray-700">
                <Link href="/" className="hover:text-emerald-700 transition">Home</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition">How it works</Link>
                <Link href="/benefits" className="text-emerald-700 font-semibold border-b-2 border-emerald-600 pb-1">Benefits</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition">Marketplace</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition">Contact</Link>
              </div>
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
              <div className="flex items-center gap-3">
                <Link href="/auth/login" className="text-sm font-medium text-emerald-800 hover:text-emerald-900 px-3 py-2">Log in</Link>
                <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition">Sign up</Link>
              </div>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden bg-white/95 border-b border-gray-200/70 shadow-lg absolute left-0 right-0 top-full z-40">
              <div className="flex flex-col px-6 py-4 space-y-2 text-base font-medium text-gray-800">
                <Link href="/" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>How it works</Link>
                <Link href="/benefits" className="text-emerald-700 font-semibold" onClick={() => setMobileMenuOpen(false)}>Benefits</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>Marketplace</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
                <div className="flex flex-col gap-2 mt-2">
                  <Link href="/auth/login" className="text-emerald-800 hover:text-emerald-900 px-3 py-2 rounded-md transition text-sm font-medium bg-emerald-50" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
                  <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-3 py-2 rounded-md shadow-sm transition" onClick={() => setMobileMenuOpen(false)}>Sign up</Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="hero-gradient text-white py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/10">
              <i className="fas fa-gem mr-2 text-xs"></i> Why Choose LandVal
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              10 Powerful Benefits <br />
              <span className="text-amber-300">That Transform Land Transactions</span>
            </h1>
            <p className="text-xl text-emerald-100 max-w-3xl mx-auto">
              Discover how LandVal is revolutionizing Rwanda's land market with official data, advanced technology, and unmatched support
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="#benefits"
                className="bg-amber-400 text-emerald-900 hover:bg-white font-semibold px-8 py-4 rounded-2xl shadow-lg transition-colors duration-200 flex items-center gap-2"
              >
                <i className="fas fa-arrow-down"></i> Explore Benefits
              </a>
              <a
                href="#"
                className="bg-sky-400 text-white hover:bg-[#0056FF] font-semibold px-8 py-4 rounded-2xl shadow-lg transition-colors duration-200 flex items-center gap-2"
              >
                <i className="fas fa-play"></i> Watch Demo
              </a>
            </div>
          </div>
        </section>

        {/* Key Stats Banner */}
        <section className="py-12 bg-sky-400/90 border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="stat-number text-4xl font-extrabold text-white transition-colors duration-200 hover:text-yellow-400 cursor-pointer">12k+</div>
                <p className="text-white text-sm mt-1">Properties Valued</p>
              </div>
              <div>
                <div className="stat-number text-4xl font-extrabold text-white transition-colors duration-200 hover:text-yellow-400 cursor-pointer">30</div>
                <p className="text-white text-sm mt-1">Districts Covered</p>
              </div>
              <div>
                <div className="stat-number text-4xl font-extrabold text-white transition-colors duration-200 hover:text-yellow-400 cursor-pointer">34%</div>
                <p className="text-white text-sm mt-1">Diaspora Buyers</p>
              </div>
              <div>
                <div className="stat-number text-4xl font-extrabold text-white transition-colors duration-200 hover:text-yellow-400 cursor-pointer">4.8</div>
                <p className="text-white text-sm mt-1">User Rating ★</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section id="benefits" className="py-20 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-emerald-600 font-semibold text-sm tracking-wider uppercase">Why Users Love LandVal</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">10 Game-Changing Benefits</h2>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">Every feature designed to make land transactions faster, safer, and more profitable</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Benefit 1 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-book-open text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Official Gazette Data</h3>
                <p className="text-gray-600 mb-4">Direct integration with Rwanda Land Authority's official gazette data, updated quarterly for maximum accuracy.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>Legally compliant valuations</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> 15-25% more accurate than informal estimates
                </div>
              </div>
              {/* Benefit 2 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-bolt text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Instant Valuations</h3>
                <p className="text-gray-600 mb-4">Get accurate property prices in under 30 seconds using advanced algorithms and real-time market data.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>3-7 days → 30 seconds</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> Save up to 95% valuation time
                </div>
              </div>
              {/* Benefit 3 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-globe-africa text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Diaspora & Global Reach</h3>
                <p className="text-gray-600 mb-4">Connect with 500,000+ Rwandans abroad and international investors seeking Rwandan real estate.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>10-20% premium pricing</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> 34% of transactions involve diaspora
                </div>
              </div>
              {/* Benefit 4 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-draw-polygon text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Interactive GIS Mapping</h3>
                <p className="text-gray-600 mb-4">Professional mapping tools showing boundaries, zoning, flood risks, and nearby infrastructure.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>70% fewer boundary disputes</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> Visual confirmation + satellite imagery
                </div>
              </div>
              {/* Benefit 5 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-chart-line text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Price Trends & Analytics</h3>
                <p className="text-gray-600 mb-4">Access 10+ years of historical data, predictive analytics, and investment risk scoring.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>Data-driven decisions</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> Identify undervalued properties
                </div>
              </div>
              {/* Benefit 6 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-file-contract text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Title Verification</h3>
                <p className="text-gray-600 mb-4">Cross-reference with RDB records to verify ownership, check liens, and ensure clean title transfer.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>95% fraud reduction</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> Legal compliance guaranteed
                </div>
              </div>
              {/* Benefit 7 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-lock text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Secure Escrow Service</h3>
                <p className="text-gray-600 mb-4">Integrated payment protection with regulated escrow accounts and legal transaction support.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>3 months → 4-6 weeks</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> 100% secure transactions
                </div>
              </div>
              {/* Benefit 8 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-robot text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Smart Matching Algorithm</h3>
                <p className="text-gray-600 mb-4">AI-powered matching connecting properties with ideal buyers based on investment profile and preferences.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>68% match-to-transaction rate</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> Personalized recommendations
                </div>
              </div>
              {/* Benefit 9 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-mobile-alt text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Multi-Platform Access</h3>
                <p className="text-gray-600 mb-4">Access LandVal on desktop, tablet, or mobile with synchronized data across all devices.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>24/7 mobile access</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> Offline mode + push notifications
                </div>
              </div>
              {/* Benefit 10 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-gift text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">Free Tier Available</h3>
                <p className="text-gray-600 mb-4">Start with 3 free valuations monthly. Upgrade only when you need advanced features.</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>Risk-free trial</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> No long-term contracts
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">LandVal vs. Traditional Methods</h2>
              <p className="text-gray-600 mt-4">See why thousands are switching to the smarter way</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full comparison-table rounded-2xl overflow-hidden shadow-lg">
                <thead className="bg-emerald-700 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">Feature</th>
                    <th className="px-6 py-4 text-center">Traditional Method</th>
                    <th className="px-6 py-4 text-center">LandVal System</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">Valuation Time</td>
                    <td className="px-6 py-4 text-center text-gray-600">3-7 days</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">30 seconds</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">Data Source</td>
                    <td className="px-6 py-4 text-center text-gray-600">Informal, word-of-mouth</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">Official Gazette + Market Data</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">Buyer Reach</td>
                    <td className="px-6 py-4 text-center text-gray-600">Local only</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">Global (Diaspora + Foreign)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">Risk of Fraud</td>
                    <td className="px-6 py-4 text-center text-gray-600">High (30% of transactions)</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">Low (&lt;5%)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">Price Accuracy</td>
                    <td className="px-6 py-4 text-center text-gray-600">±30% variance</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">±5% variance</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">Transaction Speed</td>
                    <td className="px-6 py-4 text-center text-gray-600">3-6 months</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">4-6 weeks</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">Cost</td>
                    <td className="px-6 py-4 text-center text-gray-600">3-5% of property value</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">Subscription starting at $0</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Real Stories from Our Users</h2>
              <p className="text-gray-600 mt-4">Join thousands of satisfied landowners and investors</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="testimonial-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <i className="fas fa-quote-left text-3xl text-emerald-300 mb-4"></i>
                <p className="text-gray-700 mb-4">"As a diaspora investor, LandVal gave me confidence to purchase land in Rwanda without being physically present. The title verification was a game-changer."</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center font-bold text-emerald-800">JM</div>
                  <div>
                    <div className="font-bold">Jean Marie V.</div>
                    <div className="text-sm text-gray-500">Diaspora Investor, Belgium</div>
                  </div>
                </div>
              </div>
              {/* Testimonial 2 */}
              <div className="testimonial-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <i className="fas fa-quote-left text-3xl text-emerald-300 mb-4"></i>
                <p className="text-gray-700 mb-4">"Sold my property for 18% above asking price within 2 weeks. The matching algorithm connected me with serious international investors instantly."</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center font-bold text-amber-800">CM</div>
                  <div>
                    <div className="font-bold">Claudine M.</div>
                    <div className="text-sm text-gray-500">Landowner, Northern Province</div>
                  </div>
                </div>
              </div>
              {/* Testimonial 3 */}
              <div className="testimonial-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <i className="fas fa-quote-left text-3xl text-emerald-300 mb-4"></i>
                <p className="text-gray-700 mb-4">"The historical price data helped me identify undervalued agricultural land. My investment has already appreciated 12% in just 8 months!"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center font-bold text-emerald-800">EK</div>
                  <div>
                    <div className="font-bold">Emmanuel K.</div>
                    <div className="text-sm text-gray-500">Real Estate Investor, Kigali</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="hero-gradient py-16 text-white">
          <div className="max-w-5xl mx-auto text-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Experience These Benefits?</h2>
            <p className="text-emerald-100 text-lg mb-8">Start with 3 free valuations today and discover why thousands trust LandVal</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/auth/register" className="bg-amber-400 text-emerald-900 hover:bg-white font-semibold px-8 py-4 rounded-2xl shadow-xl text-lg flex items-center gap-2 transition-colors duration-200">
                <i className="fas fa-rocket"></i> Get Started Free
              </a>
              <a href="/contact" className="bg-sky-400 text-white hover:bg-[#2481E3] font-semibold px-8 py-4 rounded-2xl shadow-xl text-lg flex items-center gap-2 transition-colors duration-200">
                <i className="fas fa-calendar-alt"></i> Schedule Demo
              </a>
            </div>
            <p className="mt-6 text-sm text-emerald-200">No credit card required · Cancel anytime</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-emerald-950 text-emerald-200 py-12 mt-auto">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 text-white">
                <i className="fas fa-map-marked-alt text-2xl"></i>
                <span className="font-bold text-xl">LandVal</span>
              </div>
              <p className="text-sm mt-3">The most trusted land valuation and land marketplace in Rwanda. All gazette data sourced from official publications.</p>
              <div className="flex gap-4 mt-5">
                <i className="fab fa-twitter hover:text-white text-xl cursor-pointer"></i>
                <i className="fab fa-linkedin hover:text-white text-xl cursor-pointer"></i>
                <i className="fab fa-whatsapp hover:text-white text-xl cursor-pointer"></i>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white">Product</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="hover:text-white cursor-pointer">Benefits</li>
                <li className="hover:text-white cursor-pointer">Marketplace</li>
                <li className="hover:text-white cursor-pointer">Pricing</li>
                <li className="hover:text-white cursor-pointer">API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="hover:text-white cursor-pointer">Gazette 2025</li>
                <li className="hover:text-white cursor-pointer">Help center</li>
                <li className="hover:text-white cursor-pointer">Blog</li>
                <li className="hover:text-white cursor-pointer">Benefits</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="hover:text-white cursor-pointer">Privacy</li>
                <li className="hover:text-white cursor-pointer">Terms</li>
                <li className="hover:text-white cursor-pointer">Copyright©</li>
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
}
