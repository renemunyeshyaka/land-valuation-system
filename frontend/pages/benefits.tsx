
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../src/components/LanguageSwitcher';
import Footer from '@/components/Footer';

export default function Benefits() {
  const { t } = useTranslation();
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
                <Link href="/" className="hover:text-emerald-700 transition">{t('nav.home')}</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition">{t('nav.howItWorks')}</Link>
                <Link href="/benefits" className="text-emerald-700 font-semibold border-b-2 border-emerald-600 pb-1">{t('nav.benefits')}</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition">{t('nav.marketplace')}</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition">{t('nav.contact')}</Link>
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
              <div className="hidden sm:flex items-center gap-3">
                <LanguageSwitcher />
                <Link href="/auth/login" className="text-sm font-medium text-emerald-800 hover:text-emerald-900 px-3 py-2">{t('auth.login')}</Link>
                <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition">{t('auth.signup')}</Link>
              </div>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden bg-white/95 border-b border-gray-200/70 shadow-lg absolute left-0 right-0 top-full z-40">
              <div className="flex flex-col px-6 py-4 space-y-2 text-base font-medium text-gray-800">
                <Link href="/" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.home')}</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.howItWorks')}</Link>
                <Link href="/benefits" className="text-emerald-700 font-semibold" onClick={() => setMobileMenuOpen(false)}>{t('nav.benefits')}</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.marketplace')}</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.contact')}</Link>
                <div className="flex flex-col gap-2 mt-2">
                  <div className="py-2 border-t border-gray-100">
                    <LanguageSwitcher />
                  </div>
                  <Link href="/auth/login" className="text-emerald-800 hover:text-emerald-900 px-3 py-2 rounded-md transition text-sm font-medium bg-emerald-50" onClick={() => setMobileMenuOpen(false)}>{t('auth.login')}</Link>
                  <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-3 py-2 rounded-md shadow-sm transition" onClick={() => setMobileMenuOpen(false)}>{t('auth.signup')}</Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="hero-gradient text-white py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/10">
              <i className="fas fa-gem mr-2 text-xs"></i> {t('benefits.heroBadge')}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              {t('benefits.title')} <br />
              <span className="text-amber-300">{t('benefits.titleHighlight')}</span>
            </h1>
            <p className="text-xl text-emerald-100 max-w-3xl mx-auto">
              {t('benefits.subtitle')}
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <a
                href="#benefits"
                className="bg-amber-400 text-emerald-900 hover:bg-white font-semibold px-8 py-4 rounded-2xl shadow-lg transition-colors duration-200 flex items-center gap-2"
              >
                <i className="fas fa-arrow-down"></i> {t('benefits.exploreBtn')}
              </a>
              <a
                href="#"
                className="bg-sky-400 text-white hover:bg-[#0056FF] font-semibold px-8 py-4 rounded-2xl shadow-lg transition-colors duration-200 flex items-center gap-2"
              >
                <i className="fas fa-play"></i> {t('benefits.watchDemo')}
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
                <p className="text-white text-sm mt-1">{t('benefits.statProperties')}</p>
              </div>
              <div>
                <div className="stat-number text-4xl font-extrabold text-white transition-colors duration-200 hover:text-yellow-400 cursor-pointer">30</div>
                <p className="text-white text-sm mt-1">{t('benefits.statDistricts')}</p>
              </div>
              <div>
                <div className="stat-number text-4xl font-extrabold text-white transition-colors duration-200 hover:text-yellow-400 cursor-pointer">34%</div>
                <p className="text-white text-sm mt-1">{t('benefits.statDiaspora')}</p>
              </div>
              <div>
                <div className="stat-number text-4xl font-extrabold text-white transition-colors duration-200 hover:text-yellow-400 cursor-pointer">4.8</div>
                <p className="text-white text-sm mt-1">{t('benefits.statRating')} ★</p>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Grid */}
        <section id="benefits" className="py-20 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-emerald-600 font-semibold text-sm tracking-wider uppercase">{t('benefits.sectionLabel')}</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">{t('benefits.sectionTitle')}</h2>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">{t('benefits.sectionSubtitle')}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Benefit 1 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-book-open text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit1Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit1Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit1Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit1Metric')}
                </div>
              </div>
              {/* Benefit 2 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-bolt text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit2Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit2Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit2Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit2Metric')}
                </div>
              </div>
              {/* Benefit 3 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-globe-africa text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit3Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit3Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit3Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit3Metric')}
                </div>
              </div>
              {/* Benefit 4 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-draw-polygon text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit4Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit4Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit4Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit4Metric')}
                </div>
              </div>
              {/* Benefit 5 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-chart-line text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit5Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit5Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit5Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit5Metric')}
                </div>
              </div>
              {/* Benefit 6 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-file-contract text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit6Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit6Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit6Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit6Metric')}
                </div>
              </div>
              {/* Benefit 7 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-lock text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit7Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit7Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit7Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit7Metric')}
                </div>
              </div>
              {/* Benefit 8 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-robot text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit8Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit8Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit8Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit8Metric')}
                </div>
              </div>
              {/* Benefit 9 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-mobile-alt text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit9Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit9Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit9Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit9Metric')}
                </div>
              </div>
              {/* Benefit 10 */}
              <div className="benefit-card bg-white rounded-2xl p-8 shadow-lg border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="feature-icon w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-emerald-800 to-emerald-500">
                  <i className="fas fa-gift text-white text-2xl"></i>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('benefits.benefit10Title')}</h3>
                <p className="text-gray-600 mb-4">{t('benefits.benefit10Desc')}</p>
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold">
                  <i className="fas fa-check-circle"></i>
                  <span>{t('benefits.benefit10Feature')}</span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  <i className="fas fa-chart-line"></i> {t('benefits.benefit10Metric')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('benefits.comparisonTitle')}</h2>
              <p className="text-gray-600 mt-4">{t('benefits.comparisonSubtitle')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full comparison-table rounded-2xl overflow-hidden shadow-lg">
                <thead className="bg-emerald-700 text-white">
                  <tr>
                    <th className="px-6 py-4 text-left">{t('benefits.comparisonFeature')}</th>
                    <th className="px-6 py-4 text-center">{t('benefits.comparisonTraditional')}</th>
                    <th className="px-6 py-4 text-center">{t('benefits.comparisonLandVal')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{t('benefits.comparisonValuationTime')}</td>
                    <td className="px-6 py-4 text-center text-gray-600">3-7 days</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">30 seconds</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{t('benefits.comparisonDataSource')}</td>
                    <td className="px-6 py-4 text-center text-gray-600">Informal, word-of-mouth</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">Official Gazette + Market Data</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{t('benefits.comparisonBuyerReach')}</td>
                    <td className="px-6 py-4 text-center text-gray-600">Local only</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">Global (Diaspora + Foreign)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{t('benefits.comparisonFraudRisk')}</td>
                    <td className="px-6 py-4 text-center text-gray-600">High (30% of transactions)</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">Low (&lt;5%)</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{t('benefits.comparisonPriceAccuracy')}</td>
                    <td className="px-6 py-4 text-center text-gray-600">±30% variance</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">±5% variance</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{t('benefits.comparisonTransactionSpeed')}</td>
                    <td className="px-6 py-4 text-center text-gray-600">3-6 months</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-bold">4-6 weeks</td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{t('benefits.comparisonCost')}</td>
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
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('benefits.testimonialsTitle')}</h2>
              <p className="text-gray-600 mt-4">{t('benefits.testimonialsSubtitle')}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="testimonial-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <i className="fas fa-quote-left text-3xl text-emerald-300 mb-4"></i>
                <p className="text-gray-700 mb-4">{t('benefits.testimonial1Quote')}</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center font-bold text-emerald-800">JM</div>
                  <div>
                    <div className="font-bold">{t('benefits.testimonial1Name')}</div>
                    <div className="text-sm text-gray-500">{t('benefits.testimonial1Title')}</div>
                  </div>
                </div>
              </div>
              {/* Testimonial 2 */}
              <div className="testimonial-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <i className="fas fa-quote-left text-3xl text-emerald-300 mb-4"></i>
                <p className="text-gray-700 mb-4">{t('benefits.testimonial2Quote')}</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-200 flex items-center justify-center font-bold text-amber-800">CM</div>
                  <div>
                    <div className="font-bold">{t('benefits.testimonial2Name')}</div>
                    <div className="text-sm text-gray-500">{t('benefits.testimonial2Title')}</div>
                  </div>
                </div>
              </div>
              {/* Testimonial 3 */}
              <div className="testimonial-card bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <i className="fas fa-quote-left text-3xl text-emerald-300 mb-4"></i>
                <p className="text-gray-700 mb-4">{t('benefits.testimonial3Quote')}</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center font-bold text-emerald-800">EK</div>
                  <div>
                    <div className="font-bold">{t('benefits.testimonial3Name')}</div>
                    <div className="text-sm text-gray-500">{t('benefits.testimonial3Title')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="hero-gradient py-16 text-white">
          <div className="max-w-5xl mx-auto text-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('benefits.ctaTitle')}</h2>
            <p className="text-emerald-100 text-lg mb-8">{t('benefits.ctaSubtitle')}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/auth/register" className="bg-amber-400 text-emerald-900 hover:bg-white font-semibold px-8 py-4 rounded-2xl shadow-xl text-lg flex items-center gap-2 transition-colors duration-200">
                <i className="fas fa-rocket"></i> {t('benefits.ctaStarted')}
              </a>
              <a href="/contact" className="bg-sky-400 text-white hover:bg-[#2481E3] font-semibold px-8 py-4 rounded-2xl shadow-xl text-lg flex items-center gap-2 transition-colors duration-200">
                <i className="fas fa-calendar-alt"></i> {t('benefits.ctaSchedule')}
              </a>
            </div>
            <p className="mt-6 text-sm text-emerald-200">{t('benefits.ctaDisclaimer')}</p>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
