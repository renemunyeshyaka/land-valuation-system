import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

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
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Store authentication tokens
      const storageType = formData.rememberMe ? localStorage : sessionStorage;
      storageType.setItem('access_token', data.data.access_token);
      storageType.setItem('refresh_token', data.data.refresh_token);
      storageType.setItem('user', JSON.stringify(data.data.user));
      
      toast.success('Login successful! Redirecting...');
      setTimeout(() => router.push('/dashboard'), 1500);
      
    } catch (error: any) {
      toast.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>Log In · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Log in to your Land Valuation System account to access property valuations, marketplace, and more." />
        <meta property="og:title" content="Log In · LandVal" />
        <meta property="og:description" content="Access your Land Valuation System account" />
      </Head>

      {/* MAIN LAYOUT */}
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
                {/* Language Selector */}
                <button className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-emerald-700 transition-colors">
                  <i className="fas fa-globe text-base"></i>
                  <span className="hidden sm:inline">EN</span>
                  <i className="fas fa-chevron-down text-xs"></i>
                </button>

                {/* Register Link */}
                <Link 
                  href="/auth/register"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors"
                >
                  Create Account
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            
            {/* Login Card Container */}
            <div className="max-w-md mx-auto">
              
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                  Welcome Back
                </h1>
                <p className="text-base text-gray-600">
                  Log in to access your land valuation dashboard
                </p>
              </div>

              {/* Login Card */}
              <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="jean@example.com"
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
                      Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Enter your password"
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
                        Remember me
                      </label>
                    </div>
                    <Link 
                      href="/auth/forgot-password" 
                      className="text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                    >
                      Forgot password?
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
                        Logging in...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt"></i>
                        Log In
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
                    <span className="px-3 bg-white text-gray-500">New to LandVal?</span>
                  </div>
                </div>

                {/* Register Link */}
                <div className="text-center">
                  <Link
                    href="/auth/register"
                    className="text-sm text-gray-700 hover:text-emerald-700 font-medium transition-colors inline-flex items-center gap-1.5"
                  >
                    Create an account
                    <i className="fas fa-arrow-right text-xs"></i>
                  </Link>
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                <div className="flex gap-3">
                  <i className="fas fa-info-circle text-emerald-700 text-lg mt-0.5"></i>
                  <div className="flex-1 text-sm text-gray-700">
                    <p className="font-medium text-gray-800 mb-1">Secure Authentication</p>
                    <p className="text-gray-600">
                      Your data is protected with industry-standard encryption. Check "Remember me" to stay logged in on this device.
                    </p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              
              {/* Brand Column */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-map-marked-alt text-white text-lg"></i>
                  </div>
                  <span className="text-lg font-bold text-white">LandVal</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Rwanda's trusted platform for accurate land and property valuation based on official gazette data.
                </p>
              </div>

              {/* Resources Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Resources</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/docs" className="hover:text-emerald-400 transition-colors">Documentation</Link></li>
                  <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                  <li><Link href="/support" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                  <li><Link href="/api" className="hover:text-emerald-400 transition-colors">API Reference</Link></li>
                </ul>
              </div>

              {/* Company Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About Us</Link></li>
                  <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
                  <li><Link href="/careers" className="hover:text-emerald-400 transition-colors">Careers</Link></li>
                  <li><Link href="/partners" className="hover:text-emerald-400 transition-colors">Partners</Link></li>
                </ul>
              </div>

              {/* Legal Column */}
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                  <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                  <li><Link href="/data-protection" className="hover:text-emerald-400 transition-colors">Data Protection</Link></li>
                  <li><Link href="/compliance" className="hover:text-emerald-400 transition-colors">Compliance</Link></li>
                </ul>
              </div>

            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-400">
                © {new Date().getFullYear()} LandVal. All rights reserved.
              </p>
              <div className="flex items-center gap-4">
                <a href="https://twitter.com/landval" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  <i className="fab fa-twitter text-lg"></i>
                </a>
                <a href="https://linkedin.com/company/landval" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  <i className="fab fa-linkedin text-lg"></i>
                </a>
                <a href="https://facebook.com/landval" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-emerald-400 transition-colors">
                  <i className="fab fa-facebook text-lg"></i>
                </a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default Login;
