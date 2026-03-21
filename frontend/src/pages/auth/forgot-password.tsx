import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

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
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  // Validate email
  const validateEmail = (): boolean => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
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
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset email');
      }
      setSubmitted(true);
      toast.success('Password reset email sent! Please check your inbox.');
      setTimeout(() => {
        router.push('/auth/reset-password');
      }, 1500);
    } catch (error: any) {
      toast.error(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle email input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };



  // Only keep the most recent, branded layout and footer (single return statement)
  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>Forgot Password · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Reset your Land Valuation System account password" />
        <meta property="og:title" content="Forgot Password · LandVal" />
        <meta property="og:description" content="Reset your password securely" />
      </Head>
      {/* MAIN LAYOUT - see below for single return statement */}
      <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
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
    </>
  );
}

export default ForgotPassword;
