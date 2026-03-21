import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

/**
 * RESET PASSWORD PAGE · Land Valuation System
 * 
 * Design System Compliance:
 * - Colors: Emerald primary, gray text/borders, white cards
 * - Typography: Inter font, proper heading hierarchy
 * - Components: Buttons (py-2.5 px-4), inputs (border-gray-200)
 * - Layout: max-w-md container, py-12 spacing
 * - Navigation: Locked template (DO NOT MODIFY)
 * - Footer: Locked template (DO NOT MODIFY)
 */


const ResetPassword: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);

  // Calculate password strength
  useEffect(() => {
    if (formData.password.length === 0) {
      setPasswordStrength(null);
      return;
    }
    
    const hasLower = /[a-z]/.test(formData.password);
    const hasUpper = /[A-Z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
    const length = formData.password.length;
    
    if (length < 8 || (!hasLower && !hasUpper)) {
      setPasswordStrength('weak');
    } else if (length >= 8 && ((hasLower && hasUpper) || hasNumber || hasSpecial)) {
      setPasswordStrength('medium');
    } else if (length >= 12 && hasLower && hasUpper && hasNumber && hasSpecial) {
      setPasswordStrength('strong');
    } else {
      setPasswordStrength('medium');
    }
  }, [formData.password]);


  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Code validation
    if (!formData.code) {
      newErrors.code = 'Reset code is required';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: formData.code,
          new_password: formData.password,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Password reset failed');
      }
      
      toast.success('Password reset successful! Redirecting to login...');
      setTimeout(() => router.push('/auth/login'), 2000);
      
    } catch (error: any) {
      toast.error(error.message || 'Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };



  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>Reset Password · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Set a new password for your Land Valuation System account" />
        <meta property="og:title" content="Reset Password · LandVal" />
        <meta property="og:description" content="Create a new secure password" />
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

              <div className="hidden md:flex space-x-7 text-sm font-medium text-gray-700">
                <Link href="/" className="hover:text-emerald-700 transition">Home</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition">How it works</Link>
                <Link href="/benefits" className="hover:text-emerald-700 transition">Benefits</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition">Marketplace</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition">Contact</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            
            {/* Reset Password Card Container */}
            <div className="max-w-md mx-auto">
              
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                  <i className="fas fa-lock text-emerald-700 text-2xl"></i>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                  Set New Password
                </h1>
                <p className="text-base text-gray-600">
                  Create a strong password to secure your account
                </p>
              </div>

              {/* Reset Password Card */}
              <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Reset Code Field */}
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Reset Code
                    </label>
                    <input
                      type="text"
                      id="code"
                      name="code"
                      value={formData.code}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Enter the code from your email"
                      className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                        errors.code ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.code && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-xs"></i> {errors.code}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Enter new password"
                      className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                        errors.password ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.password && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-xs"></i> {errors.password}
                      </p>
                    )}
                    {/* Password Strength Indicator */}
                    {passwordStrength && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                                passwordStrength === 'medium' ? 'w-2/3 bg-amber-500' :
                                'w-full bg-green-500'
                              }`}
                            />
                          </div>
                          <span className={`text-xs font-medium ${
                            passwordStrength === 'weak' ? 'text-red-600' :
                            passwordStrength === 'medium' ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {passwordStrength === 'weak' ? 'Weak' :
                             passwordStrength === 'medium' ? 'Medium' :
                             'Strong'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Use 12+ characters with mix of letters, numbers & symbols
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Confirm new password"
                      className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                        errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-xs"></i> {errors.confirmPassword}
                      </p>
                    )}
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
                        Resetting Password...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Reset Password
                      </>
                    )}
                  </button>

                </form>

                {/* Back to Login Link */}
                <div className="mt-6 text-center">
                  <Link
                    href="/auth/login"
                    className="text-sm text-gray-700 hover:text-emerald-700 font-medium transition-colors inline-flex items-center gap-1.5"
                  >
                    <i className="fas fa-arrow-left text-xs"></i>
                    Back to Login
                  </Link>
                </div>
              </div>

              {/* Security Tips */}
              <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-lg">
                <div className="flex gap-3">
                  <i className="fas fa-lightbulb text-amber-700 text-lg mt-0.5"></i>
                  <div className="flex-1 text-sm text-gray-700">
                    <p className="font-medium text-gray-800 mb-2">Password Security Tips</p>
                    <ul className="space-y-1 text-gray-600">
                      <li className="flex items-start gap-2">
                        <i className="fas fa-check text-emerald-600 text-xs mt-1"></i>
                        <span>Use at least 12 characters</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <i className="fas fa-check text-emerald-600 text-xs mt-1"></i>
                        <span>Mix uppercase, lowercase, numbers & symbols</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <i className="fas fa-check text-emerald-600 text-xs mt-1"></i>
                        <span>Avoid common words or personal information</span>
                      </li>
                    </ul>
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

export default ResetPassword;
