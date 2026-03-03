import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';

/**
 * SUBSCRIPTION PAGE · Land Valuation System
 * 
 * Purpose: Manage subscription and view plans
 * Features:
 * - Current tier display
 * - Usage metrics
 * - Upgrade button
 * - Plan comparison
 * - Cancel option (stub)
 */

const Subscription: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [currentTier] = useState<'free' | 'basic' | 'professional' | 'ultimate'>('free');
  const [usedValuations] = useState(2);
  const [maxValuations] = useState(5);

  // Redirect to login if not authenticated
  useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (accessToken && storedUser) {
      setLoading(false);
    } else if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      setLoading(false);
    }
  }, [status, router]);

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 'Free',
      description: 'Perfect for getting started',
      features: [
        { text: '5 property valuations / month', included: true },
        { text: 'Basic property search', included: true },
        { text: 'Mobile app access', included: true },
        { text: 'Email support', included: true },
        { text: 'API access', included: false },
        { text: 'Custom reports', included: false },
      ],
      current: currentTier === 'free',
      button: 'Your Current Plan',
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 'FRW 9,999',
      period: '/month',
      description: 'For regular valuations',
      features: [
        { text: '10 property valuations / month', included: true },
        { text: 'Advanced property search', included: true },
        { text: 'Mobile app access', included: true },
        { text: 'Email support', included: true },
        { text: 'API access', included: false },
        { text: 'Custom reports', included: false },
      ],
      current: currentTier === 'basic',
      button: currentTier === 'free' ? 'Upgrade to Basic' : 'Your Current Plan',
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 'FRW 29,999',
      period: '/month',
      description: 'For professionals & agencies',
      popular: true,
      features: [
        { text: 'Unlimited valuations', included: true },
        { text: 'Advanced property search', included: true },
        { text: 'Mobile app access', included: true },
        { text: 'Priority email support', included: true },
        { text: 'Full API access', included: true },
        { text: 'Analytics dashboard', included: true },
      ],
      current: currentTier === 'professional',
      button: currentTier === 'free' || currentTier === 'basic' ? 'Upgrade to Professional' : 'Your Current Plan',
    },
    {
      id: 'ultimate',
      name: 'Ultimate',
      price: 'FRW 99,999',
      period: '/month',
      description: 'White-label & enterprise',
      features: [
        { text: 'Unlimited valuations', included: true },
        { text: 'White-label platform', included: true },
        { text: 'Dedicated account manager', included: true },
        { text: '24/7 priority support', included: true },
        { text: 'Full API access + webhooks', included: true },
        { text: 'Advanced analytics & reports', included: true },
      ],
      current: currentTier === 'ultimate',
      button: 'Contact Sales',
    },
  ];

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
        <title>Subscription Plans · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Choose the perfect subscription plan for your needs" />
        <meta property="og:title" content="Subscription Plans · LandVal" />
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            
            {/* Page Header */}
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
                Simple, Transparent Pricing
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Choose the perfect plan for your property valuation needs. No hidden fees, cancel anytime.
              </p>
            </div>

            {/* Current Tier Badge */}
            <div className="mb-12 text-center">
              <div className="inline-block px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                <p className="text-sm text-gray-600">Current Plan</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  {plans.find(p => p.current)?.name}
                  {currentTier === 'free' && ` (${maxValuations - usedValuations} valuations left)`}
                </p>
              </div>
            </div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {plans.map(plan => (
                <div
                  key={plan.id}
                  className={`relative border rounded-lg transition-all ${
                    plan.current
                      ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                      : 'border-gray-100 bg-white hover:border-gray-200'
                  } ${plan.popular ? 'md:ring-2 md:ring-emerald-500 md:scale-105' : ''}`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="inline-block px-4 py-1 bg-emerald-700 text-white text-xs font-bold rounded-full">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  {/* Plan Content */}
                  <div className="p-6 sm:p-8">
                    {/* Plan Name */}
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{plan.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

                    {/* Pricing */}
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-gray-800">{plan.price}</span>
                      {plan.period && <span className="text-gray-600">{plan.period}</span>}
                    </div>

                    {/* Action Button */}
                    <button
                      disabled={plan.current || plan.button === 'Contact Sales'}
                      onClick={() => {
                        if (!plan.current && plan.button !== 'Contact Sales') {
                          router.push('/checkout');
                        }
                      }}
                      className={`w-full py-3 px-4 rounded-lg font-medium mb-6 transition-colors ${
                        plan.current
                          ? 'bg-emerald-700 text-white cursor-default'
                          : plan.button === 'Contact Sales'
                          ? 'bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800'
                      }`}
                    >
                      {plan.button}
                    </button>

                    {/* Divider */}
                    <div className="border-t border-gray-200 mb-6"></div>

                    {/* Features List */}
                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <i className={`fas ${feature.included ? 'fa-check text-emerald-600' : 'fa-times text-gray-400'} text-sm mt-0.5`}></i>
                          <span className={`text-sm ${feature.included ? 'text-gray-800' : 'text-gray-400'}`}>
                            {feature.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>

            {/* Usage Breakdown (for Free tier) */}
            {currentTier === 'free' && (
              <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 mb-12">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Usage This Month</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Property Valuations</span>
                      <span className="text-sm font-semibold text-emerald-700">{usedValuations} / {maxValuations}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-700 transition-all duration-300"
                        style={{ width: `${(usedValuations / maxValuations) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {maxValuations - usedValuations} valuations remaining. Reset on April 2, 2026.
                    </p>
                  </div>
                </div>

                {/* Upgrade CTA */}
                <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <p className="text-sm text-gray-700 mb-3">
                    Need more valuations? Upgrade to unlock unlimited valuations and premium features.
                  </p>
                  <Link
                    href="/checkout"
                    className="inline-block px-4 py-2 bg-emerald-700 text-white text-sm font-medium rounded-lg hover:bg-emerald-800 transition-colors"
                  >
                    <i className="fas fa-star mr-2"></i>
                    Upgrade Now
                  </Link>
                </div>
              </div>
            )}

            {/* FAQ Section */}
            <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 sm:p-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Frequently Asked Questions</h3>
              
              <div className="space-y-4">
                <details className="border-b border-gray-200 pb-4">
                  <summary className="flex items-center justify-between cursor-pointer py-2 font-medium text-gray-800 hover:text-emerald-700 transition-colors">
                    Can I change my plan anytime?
                    <i className="fas fa-chevron-down text-sm text-gray-400"></i>
                  </summary>
                  <p className="text-gray-600 mt-3">
                    Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
                  </p>
                </details>

                <details className="border-b border-gray-200 pb-4">
                  <summary className="flex items-center justify-between cursor-pointer py-2 font-medium text-gray-800 hover:text-emerald-700 transition-colors">
                    Do you offer annual billing discounts?
                    <i className="fas fa-chevron-down text-sm text-gray-400"></i>
                  </summary>
                  <p className="text-gray-600 mt-3">
                    Yes, save 20% when you pay annually. Contact our sales team for details.
                  </p>
                </details>

                <details className="border-b border-gray-200 pb-4">
                  <summary className="flex items-center justify-between cursor-pointer py-2 font-medium text-gray-800 hover:text-emerald-700 transition-colors">
                    What happens if I exceed my monthly limit?
                    <i className="fas fa-chevron-down text-sm text-gray-400"></i>
                  </summary>
                  <p className="text-gray-600 mt-3">
                    Free tier users can't make more valuations after reaching the limit. We'll remind you before you hit the limit.
                  </p>
                </details>

                <details className="pb-4">
                  <summary className="flex items-center justify-between cursor-pointer py-2 font-medium text-gray-800 hover:text-emerald-700 transition-colors">
                    Can I cancel my subscription?
                    <i className="fas fa-chevron-down text-sm text-gray-400"></i>
                  </summary>
                  <p className="text-gray-600 mt-3">
                    Yes, you can cancel anytime. No long-term contracts or cancellation fees.
                  </p>
                </details>
              </div>
            </div>

            {/* Support CTA */}
            <div className="mt-12 text-center">
              <p className="text-gray-600 mb-4">Have questions about our plans?</p>
              <Link
                href="/support"
                className="inline-block px-6 py-3 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors"
              >
                <i className="fas fa-headset mr-2"></i>
                Contact Support
              </Link>
            </div>

          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16 mt-12">
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

export default Subscription;
