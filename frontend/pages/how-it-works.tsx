import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../src/components/LanguageSwitcher';
import Footer from '@/components/Footer';

export default function HowItWorks() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Head>
        <title>How It Works · Land Valuation System</title>
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
                <Link href="/benefits" className="hover:text-emerald-700 transition">{t('nav.benefits')}</Link>
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
                <Link href="/how-it-works" className="text-emerald-700 font-semibold" onClick={() => setMobileMenuOpen(false)}>{t('nav.howItWorks')}</Link>
                <Link href="/benefits" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.benefits')}</Link>
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
        <section className="hero-gradient text-white py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/10">
              <i className="fas fa-gem mr-2 text-xs"></i> {t('howItWorks.heroBadge')}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              {t('howItWorks.title')}
            </h1>
            <p className="text-xl text-emerald-100 max-w-3xl mx-auto">
              {t('howItWorks.subtitle')}
            </p>
          </div>
        </section>

        {/* Interactive Demo Banner */}
        <section className="py-12 bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 rounded-3xl p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-emerald-900 mb-3">{t('howItWorks.demoTitle')}</h2>
                  <p className="text-gray-700 mb-6">{t('howItWorks.demoDesc')}</p>
                  <ul className="list-disc list-inside text-emerald-700 text-base space-y-2">
                    <li>{t('howItWorks.demoKigali')}</li>
                    <li>{t('howItWorks.demoMusanze')}</li>
                    <li>{t('howItWorks.demoRubavu')}</li>
                    <li>{t('howItWorks.demoEastern')}</li>
                  </ul>
                </div>
                <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 shadow-xl border border-gray-100">
                  <div className="text-center mb-6">
                    <i className="fas fa-map-marked-alt text-4xl text-emerald-600"></i>
                    <h3 className="text-2xl font-bold text-gray-900 mt-3">{t('howItWorks.tryYourself')}</h3>
                    <p className="text-gray-600 text-sm">{t('howItWorks.clickDistrict')}</p>
                  </div>
                  <div className="space-y-3">
                    <div className="demo-step bg-gray-100 rounded-xl p-4 hover:bg-emerald-50 transition cursor-pointer" data-district="Kigali">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-emerald-900">Kigali</span>
                        <span className="text-xs text-gray-500">Urban Zone A</span>
                      </div>
                    </div>
                    <div className="demo-step bg-gray-100 rounded-xl p-4 hover:bg-emerald-50 transition cursor-pointer" data-district="Musanze">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-emerald-900">Musanze</span>
                        <span className="text-xs text-gray-500">Tourism Growth Zone</span>
                      </div>
                    </div>
                    <div className="demo-step bg-gray-100 rounded-xl p-4 hover:bg-emerald-50 transition cursor-pointer" data-district="Rubavu">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-emerald-900">Rubavu</span>
                        <span className="text-xs text-gray-500">Lakefront Premium</span>
                      </div>
                    </div>
                    <div className="demo-step bg-gray-100 rounded-xl p-4 hover:bg-emerald-50 transition cursor-pointer" data-district="Eastern">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-emerald-900">Eastern</span>
                        <span className="text-xs text-gray-500">Agricultural Investment Zone</span>
                      </div>
                    </div>
                  </div>
                  <div id="demoResult" className="mt-6 p-4 bg-emerald-50 rounded-xl hidden">
                    <div className="text-sm text-emerald-800 font-semibold mb-2">Sample Valuation Result:</div>
                    <div id="demoValue" className="text-2xl font-bold text-emerald-900"></div>
                    <div className="text-xs text-gray-600 mt-2">* This is a demo. Actual valuations use real gazette data.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Workflow Steps */}
        <section className="py-20 bg-gray-50/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-emerald-600 font-semibold text-sm tracking-wider uppercase">{t('howItWorks.journey')}</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">{t('howItWorks.stepsTitle')}</h2>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">{t('howItWorks.stepsSubtitle')}</p>
            </div>
            <div className="grid md:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="step-card text-center hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 border border-gray-100 bg-white rounded-2xl shadow-md">
                <div className="step-number w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">1</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('howItWorks.step1Title')}</h3>
                <p className="text-gray-600 mb-4">{t('howItWorks.step1Desc')}</p>
                <div className="inline-flex items-center gap-2 text-emerald-600 text-sm">
                  <i className="fas fa-check-circle"></i> {t('howItWorks.step1Badge')}
                </div>
              </div>
              {/* Step 2 */}
              <div className="step-card text-center hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 border border-gray-100 bg-white rounded-2xl shadow-md">
                <div className="step-number w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">2</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('howItWorks.step2Title')}</h3>
                <p className="text-gray-600 mb-4">{t('howItWorks.step2Desc')}</p>
                <div className="inline-flex items-center gap-2 text-emerald-600 text-sm">
                  <i className="fas fa-bolt"></i> {t('howItWorks.step2Badge')}
                </div>
              </div>
              {/* Step 3 */}
              <div className="step-card text-center hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 border border-gray-100 bg-white rounded-2xl shadow-md">
                <div className="step-number w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">3</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('howItWorks.step3Title')}</h3>
                <p className="text-gray-600 mb-4">{t('howItWorks.step3Desc')}</p>
                <div className="inline-flex items-center gap-2 text-emerald-600 text-sm">
                  <i className="fas fa-file-pdf"></i> {t('howItWorks.step3Badge')}
                </div>
              </div>
              {/* Step 4 */}
              <div className="step-card text-center hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200 border border-gray-100 bg-white rounded-2xl shadow-md">
                <div className="step-number w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-600 text-white flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg">4</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t('howItWorks.step4Title')}</h3>
                <p className="text-gray-600 mb-4">{t('howItWorks.step4Desc')}</p>
                <div className="inline-flex items-center gap-2 text-emerald-600 text-sm">
                  <i className="fas fa-lock"></i> {t('howItWorks.step4Badge')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Explained */}
        <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <span className="text-emerald-600 font-semibold text-sm tracking-wider uppercase">{t('howItWorks.featuresLabel')}</span>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">{t('howItWorks.featuresTitle')}</h2>
              <p className="text-gray-600 mt-4 max-w-2xl mx-auto">{t('howItWorks.featuresSubtitle')}</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="feature-box bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <i className="fas fa-search text-emerald-600 text-xl"></i>
                </div>
                <h3 className="font-bold text-lg mb-2">{t('howItWorks.feature1Title')}</h3>
                <p className="text-gray-600 text-sm">{t('howItWorks.feature1Desc')}</p>
              </div>
              <div className="feature-box bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <i className="fas fa-chart-simple text-emerald-600 text-xl"></i>
                </div>
                <h3 className="font-bold text-lg mb-2">{t('howItWorks.feature2Title')}</h3>
                <p className="text-gray-600 text-sm">{t('howItWorks.feature2Desc')}</p>
              </div>
              <div className="feature-box bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <i className="fas fa-file-pdf text-emerald-600 text-xl"></i>
                </div>
                <h3 className="font-bold text-lg mb-2">{t('howItWorks.feature3Title')}</h3>
                <p className="text-gray-600 text-sm">{t('howItWorks.feature3Desc')}</p>
              </div>
              <div className="feature-box bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <i className="fas fa-bell text-emerald-600 text-xl"></i>
                </div>
                <h3 className="font-bold text-lg mb-2">{t('howItWorks.feature4Title')}</h3>
                <p className="text-gray-600 text-sm">{t('howItWorks.feature4Desc')}</p>
              </div>
              <div className="feature-box bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <i className="fas fa-chart-line text-emerald-600 text-xl"></i>
                </div>
                <h3 className="font-bold text-lg mb-2">{t('howItWorks.feature5Title')}</h3>
                <p className="text-gray-600 text-sm">{t('howItWorks.feature5Desc')}</p>
              </div>
              <div className="feature-box bg-white rounded-2xl p-6 shadow-md border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-colors duration-200">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <i className="fas fa-headset text-emerald-600 text-xl"></i>
                </div>
                <h3 className="font-bold text-lg mb-2">{t('howItWorks.feature6Title')}</h3>
                <p className="text-gray-600 text-sm">{t('howItWorks.feature6Desc')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="hero-gradient py-16 text-white">
          <div className="max-w-5xl mx-auto text-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('howItWorks.ctaTitle')}</h2>
            <p className="text-emerald-100 text-lg mb-8">{t('howItWorks.ctaSubtitle')}</p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/auth/register"
                className="bg-amber-400 text-emerald-900 hover:bg-white font-semibold px-8 py-4 rounded-2xl shadow-xl text-lg flex items-center gap-2 transition-colors duration-200"
                style={{ boxShadow: '0 4px 24px 0 rgba(251, 191, 36, 0.10)' }}
              >
                <i className="fas fa-user-plus"></i> {t('howItWorks.ctaCreateAccount')}
              </a>
              <a
                href="/contact"
                className="bg-[#0056FF] text-white border-2 border-white/50 px-8 py-4 rounded-2xl font-semibold text-lg flex items-center gap-2 transition-colors duration-200"
                style={{ boxShadow: '0 4px 24px 0 rgba(0, 86, 255, 0.10)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#065f46'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0056FF'}
              >
                <i className="fas fa-calendar-alt"></i> {t('howItWorks.ctaScheduleConsultation')}
              </a>
            </div>
            <p className="mt-6 text-sm text-emerald-200">{t('howItWorks.ctaDisclaimer')}</p>
          </div>
        </section>

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
}
