import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import MainNavbar from '../../components/MainNavbar';
import Footer from '../../components/Footer';

/**
 * LOGIN PAGE · Land Valuation System
 * 
 * Design System Compliance:
 * - Colors: Emerald primary, gray text/borders, white cards
 * - Typography: Inter font, proper heading hierarchy
 * - Components: Buttons (py-2.5 px-4), inputs (border-gray-200)
 * - Layout: max-w-md container, py-12 spacing
 * - Navigation: Locked template (DO NOT MODIFY)
 * - Footer: Locked template (DO NOT MODIFY)
 */

const Login: React.FC = () => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      rememberMe: false,
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const router = useRouter();


    // Validate form before submission
    const validateForm = (): boolean => {
      const newErrors: { [key: string]: string } = {};
      // Email validation
      if (!formData.email.trim()) {
        newErrors.email = t('auth.emailRequired');
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = t('auth.validEmail');
      }
      // Password validation
      if (!formData.password) {
        newErrors.password = t('auth.passwordRequired');
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    // Handle input changes for all fields
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value, type, checked } = e.target;
      const fieldName = name as string;
      setFormData(prev => ({
        ...prev,
        [fieldName]: type === 'checkbox' ? checked : value,
      }));
      if (errors[fieldName]) {
        setErrors(prev => ({ ...prev, [fieldName]: '' }));
      }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) {
        toast.error(t('auth.fixErrors'));
        return;
      }
      setLoading(true);
      try {
        // Call login API
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || t('auth.loginFailed'));
        }
        // Always redirect to OTP verification page after login
        toast.success(t('toast.otpSent'));
        router.push({
          pathname: '/auth/verify-otp',
          query: { email: formData.email },
        });
      } catch (error: any) {
        toast.error(error.message || t('auth.loginFailed'));
      } finally {
        setLoading(false);
      }
    };

    return (
      <>
        <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">
          {/* NAVIGATION */}
          <MainNavbar />
          {/* MAIN CONTENT */}
          <main className="flex-grow">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
              {/* Login Card Container */}
              <div className="max-w-md mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                    {t('auth.welcomeBack')}
                  </h1>
                  <p className="text-base text-gray-600">
                    {t('auth.loginSubtitle')}
                  </p>
                </div>
                {/* Login Card */}
                <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8">
                  <form method="POST" onSubmit={handleSubmit} className="space-y-5">
                    {/* Email Field */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('auth.emailLabel')}
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder={t('auth.emailPlaceholder')}
                        className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                          errors.email ? 'border-red-500' : 'border-gray-200'
                        }`}
                      />
                      {errors.email && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                          <i className="fas fa-exclamation-circle text-xs"></i> {errors.email}
                        </p>
                      )}
                    </div>
                    {/* Password Field */}
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                        {t('auth.passwordLabel')}
                      </label>
                      <input
                        type="password"
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading}
                        placeholder={t('auth.passwordPlaceholder')}
                        className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                          errors.password ? 'border-red-500' : 'border-gray-200'
                        }`}
                      />
                      {errors.password && (
                        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                          <i className="fas fa-exclamation-circle text-xs"></i> {errors.password}
                        </p>
                      )}
                    </div>
                    {/* Remember Me & Forgot Password Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="rememberMe"
                          name="rememberMe"
                          checked={formData.rememberMe}
                          onChange={handleChange}
                          disabled={loading}
                          className="w-4 h-4 text-emerald-700 border-gray-300 rounded focus:ring-emerald-500 disabled:cursor-not-allowed"
                        />
                        <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-700">
                          {t('auth.rememberMe')}
                        </label>
                      </div>
                      <Link 
                        href="/auth/forgot-password" 
                        className="text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                      >
                        {t('auth.forgotPassword')}
                      </Link>
                    </div>
                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-5 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <i className="fas fa-spinner fa-spin"></i>
                          {t('auth.loggingIn')}
                        </>
                      ) : (
                        <>
                          <i className="fas fa-sign-in-alt"></i>
                          {t('auth.logIn')}
                        </>
                      )}
                    </button>
                  </form>
                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-3 bg-white text-gray-500">{t('auth.newToPlatform')}</span>
                    </div>
                  </div>
                  {/* Register Link */}
                  <div className="text-center">
                    <Link
                      href="/auth/register"
                      className="text-sm text-gray-700 hover:text-emerald-700 font-medium transition-colors inline-flex items-center gap-1.5"
                    >
                      {t('auth.createAccount')}
                      <i className="fas fa-arrow-right text-xs"></i>
                    </Link>
                  </div>
                </div>
                {/* Info Box */}
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <div className="flex gap-3">
                    <i className="fas fa-info-circle text-emerald-700 text-lg mt-0.5"></i>
                    <div className="flex-1 text-sm text-gray-700">
                      <p className="font-medium text-gray-800 mb-1">{t('auth.secureAuth')}</p>
                      <p className="text-gray-600">
                        {t('auth.secureAuthDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
          {/* FOOTER */}
          <Footer />
        </div>
      </>
    );
  };

  export default Login;
