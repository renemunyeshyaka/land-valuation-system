
import Footer from '../../components/Footer';
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import MainNavbar from '../../components/MainNavbar';

/**
 * REGISTER PAGE · Land Valuation System
 * User registration with email verification flow
 */

const Register: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    userType: 'buyer', // Default to buyer
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
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

    // Name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    // Phone validation (Rwanda format or sandbox test numbers)
    const sandboxTestNumbers = [
      '46733123450',
      '46733123451',
      '46733123452',
      '46733123453',
    ];
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (
      !/^(\+250|0)7[0-9]{8}$/.test(formData.phone.replace(/\s/g, '')) &&
      !sandboxTestNumbers.includes(formData.phone)
    ) {
      newErrors.phone = 'Enter valid Rwanda phone number (+250 or 07...) or use a sandbox test number.';
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
          user_type: formData.userType,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const backendMessage =
          data?.error?.details ||
          data?.error?.message ||
          data?.message ||
          'Registration failed';
        throw new Error(backendMessage);
      }
      toast.success('Account created! Redirecting to email verification...');
      setTimeout(() => {
        router.push(`/auth/verify-email?email=${encodeURIComponent(formData.email)}`);
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle input/select changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>Create Account · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Create your Land Valuation System account to access property valuations, marketplace, and more." />
        <meta property="og:title" content="Create Account · LandVal" />
        <meta property="og:description" content="Join thousands using Land Valuation System for accurate property valuations" />
      </Head>

      {/* MAIN LAYOUT */}
      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">

        {/* NAVIGATION */}
        <MainNavbar />

        {/* MAIN CONTENT */}
        <main className="flex-1 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            <div className="max-w-md mx-auto">
              
              {/* Header */}
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
                  Create your account
                </h1>
                <p className="text-gray-600">
                  Join thousands using Land Valuation System
                </p>
              </div>

              {/* Registration Form Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  
                  {/* Name Fields Row */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* First Name */}
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                        First Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border ${errors.firstName ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-gray-800 placeholder:text-gray-400`}
                        placeholder="Jean"
                        disabled={loading}
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                      )}
                    </div>

                    {/* Last Name */}
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border ${errors.lastName ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-gray-800 placeholder:text-gray-400`}
                        placeholder="Munyeshyaka"
                        disabled={loading}
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border ${errors.email ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-gray-800 placeholder:text-gray-400`}
                      placeholder="jean@example.com"
                      disabled={loading}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border ${errors.phone ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-gray-800 placeholder:text-gray-400`}
                      placeholder="+250 788 620 201"
                      disabled={loading}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Format: +250 7XX XXX XXX or 07XX XXX XXX<br />
                      <span className="text-emerald-700 font-semibold">For sandbox testing, use one of these numbers: 46733123450, 46733123451, 46733123452, 46733123453</span>
                    </p>
                  </div>

                  {/* User Type Selector */}
                  <div>
                    <label htmlFor="userType" className="block text-sm font-medium text-gray-700 mb-2">
                      Account Type <span className="text-red-600">*</span>
                    </label>
                    <select
                      id="userType"
                      name="userType"
                      value={formData.userType}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-gray-800 bg-white"
                      disabled={loading}
                    >
                      <option value="buyer">Buyer / Investor</option>
                      <option value="seller">Seller / Property Owner</option>
                      <option value="agent">Real Estate Agent</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Choose your account type to get relevant features</p>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Password <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border ${errors.password ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-gray-800 placeholder:text-gray-400`}
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    {errors.password && (
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border ${errors.confirmPassword ? 'border-red-300' : 'border-gray-200'} rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-gray-800 placeholder:text-gray-400`}
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Terms Agreement */}
                  <div className="flex items-start">
                    <input
                      type="checkbox"
                      id="terms"
                      className="mt-1 h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                      required
                    />
                    <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                      I agree to the{' '}
                      <a href="/terms" className="text-emerald-700 hover:text-emerald-800 font-medium">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" className="text-emerald-700 hover:text-emerald-800 font-medium">
                        Privacy Policy
                      </a>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-3 rounded-lg font-semibold text-base transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </form>

                {/* Login Link */}
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-600">
                    Already have an account?{' '}
                    <a href="/auth/login" className="text-emerald-700 hover:text-emerald-800 font-medium">
                      Log in
                    </a>
                  </p>
                </div>
              </div>

              {/* Additional Information */}
              <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-start">
                  <i className="fas fa-info-circle text-emerald-700 mt-0.5 mr-3"></i>
                  <div className="text-sm text-emerald-900">
                    <p className="font-medium mb-1">Email Verification Required</p>
                    <p className="text-emerald-800">
                      After registration, check your email to verify your account before logging in.
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
}

export default Register;
