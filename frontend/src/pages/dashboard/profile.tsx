import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

/**
 * PROFILE PAGE · Land Valuation System
 * 
 * Purpose: Edit user profile information
 * Features:
 * - Edit name, email, phone, address
 * - Form validation
 * - Success/error messages
 */

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

const Profile: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: 'Jean',
    lastName: 'Munyeshyaka',
    email: 'jean@example.com',
    phone: '+250 788 123 456',
    address: 'Kigali, Rwanda',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status, router]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.phone && !/^(\+250|0)7[0-9]{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid Rwanda phone format';
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
    
    setSaving(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone.replace(/\s/g, ''),
          address: formData.address,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }
      
      toast.success('Profile updated successfully!');
      setTimeout(() => router.push('/dashboard'), 1500);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-emerald-700"></i>
      </div>
    );
  }

  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>Edit Profile · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Edit your Land Valuation System profile information" />
        <meta property="og:title" content="Edit Profile · LandVal" />
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
                <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors">
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Edit Profile
              </h1>
              <p className="text-base text-gray-600">
                Update your personal information
              </p>
            </div>

            {/* Profile Form */}
            <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* First Name & Last Name Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* First Name */}
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={saving}
                      className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                        errors.firstName ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.firstName && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-xs"></i> {errors.firstName}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={saving}
                      className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                        errors.lastName ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.lastName && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-xs"></i> {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={saving}
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

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="+250 7XX XXX XXX"
                    className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                      errors.phone ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <i className="fas fa-exclamation-circle text-xs"></i> {errors.phone}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">Rwanda format: +250 7XX XXX XXX or 07XX XXX XXX</p>
                </div>

                {/* Address Field */}
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="City, District, or full address"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Form Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-5 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                  <Link
                    href="/dashboard"
                    className="px-5 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors text-center"
                  >
                    Cancel
                  </Link>
                </div>

              </form>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex gap-3">
                <i className="fas fa-info-circle text-blue-700 text-lg mt-0.5"></i>
                <div className="flex-1 text-sm text-gray-700">
                  <p className="font-medium text-gray-800 mb-1">Profile Information</p>
                  <p className="text-gray-600">
                    Your profile information is used to verify your identity and for communication. Changes are saved immediately.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-map-marked-alt text-white text-lg"></i>
                  </div>
                  <span className="text-lg font-bold text-white">LandVal</span>
                </div>
                <p className="text-sm text-gray-400">Rwanda's trusted land valuation platform.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Resources</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/docs" className="hover:text-emerald-400 transition-colors">Docs</Link></li>
                  <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                  <li><Link href="/support" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About</Link></li>
                  <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
              © {new Date().getFullYear()} LandVal. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default Profile;
