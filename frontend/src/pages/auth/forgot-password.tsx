
import Footer from '../../components/Footer';
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

/**
 * FORGOT PASSWORD PAGE · Land Valuation System
 * 
 * Design System Compliance:
 * - Colors: Emerald primary, gray text/borders, white cards
 * - Typography: Inter font, proper heading hierarchy
 * - Components: Buttons (py-2.5 px-4), inputs (border-gray-200)
 * - Layout: max-w-md container, py-12 spacing
 * - Navigation: Locked template (DO NOT MODIFY)
 * - Footer: Locked template (DO NOT MODIFY)
 */

const ForgotPassword: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Validate email
  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError(t('auth.emailRequired'));
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError(t('auth.validEmail'));
      return false;
    }
    setError('');
    return true;
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail()) return;
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }
      setSubmitted(true);
      toast.success(t('auth.resetEmailSuccess'));
      setTimeout(() => {
        router.push('/auth/reset-password');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || t('auth.resetEmailFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Handle email input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };



  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>{t('auth.forgotPassword')} · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content={t('auth.forgotPasswordMeta')} />
        <meta property="og:title" content={`${t('auth.forgotPassword')} · LandVal`} />
        <meta property="og:description" content={t('auth.forgotPasswordMeta')} />
      </Head>
      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">
        {/* NAVIGATION */}
        <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-emerald-700 rounded-lg flex items-center justify-center group-hover:bg-emerald-800 transition-colors">
                  <i className="fas fa-map-marked-alt text-white text-lg"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-lg font-bold text-gray-800 leading-tight">LandVal</span>
                  <span className="text-xs text-gray-500 leading-tight hidden sm:block">Rwanda Property Valuation</span>
                </div>
              </Link>
              {/* Navigation Menu - Right Side */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Main Navigation Menu */}
                <div className="hidden md:flex space-x-7 text-sm font-medium text-gray-700">
                  <Link href="/" className="hover:text-emerald-700 transition">{t('nav.home')}</Link>
                  <Link href="/how-it-works" className="hover:text-emerald-700 transition">{t('nav.howItWorks')}</Link>
                  <Link href="/benefits" className="hover:text-emerald-700 transition">{t('nav.benefits')}</Link>
                  <Link href="/marketplace" className="hover:text-emerald-700 transition">{t('nav.marketplace')}</Link>
                  <Link href="/contact" className="hover:text-emerald-700 transition">{t('nav.contact')}</Link>
                </div>
                {/* Language Selector */}
                <div className="hidden sm:flex items-center border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white/80">
                  <i className="fas fa-globe text-emerald-600 mr-1 text-xs"></i>
                  <span className="font-medium">{t('nav.switchLanguage')}</span>
                  <i className="fas fa-chevron-down ml-1 text-gray-400 text-xs"></i>
                </div>
                {/* Register Link */}
                <Link 
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                >
                  {t('auth.signup')}
                </Link>
                {/* Login Link */}
                <Link 
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-700 bg-white hover:bg-emerald-50 rounded-lg transition-colors"
                >
                  {t('auth.login')}
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="max-w-md mx-auto">
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                  {t('auth.forgotPasswordTitle')}
                </h1>
                <p className="text-base text-gray-600">
                  {t('auth.forgotPasswordSubtitle')}
                </p>
              </div>
              {/* Forgot Password Card */}
              <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8">
                {!submitted ? (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('auth.emailLabel')}
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder={t('auth.emailPlaceholder')}
                        className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                          error ? 'border-red-500' : 'border-gray-200'
                        }`}
                      />
                      {error && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                          <i className="fas fa-exclamation-circle text-xs"></i> {error}
                        </p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-5 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          {t('auth.sending')}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane"></i>
                          {t('auth.sendResetLink')}
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="text-center">
                    <i className="fas fa-envelope-open-text text-emerald-600 text-4xl mb-4"></i>
                    <h2 className="text-xl font-semibold mb-2">{t('auth.checkYourEmail')}</h2>
                    <p className="text-gray-700 mb-4">{t('auth.resetEmailSent')} <span className="font-medium">{email}</span>. {t('auth.resetEmailInstructions')}</p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="text-emerald-700 hover:underline font-medium"
                    >
                      Send again
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* FOOTER */}
        <Footer />
      </div>
    </>
  );
}

export default ForgotPassword;
