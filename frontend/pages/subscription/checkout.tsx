import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { fetchWithTokenRefresh } from '@/utils/tokenRefresh';
import { Currency, getCurrencies, getPreferredCurrency, findCurrency, convertFromRwf, formatCurrency, getCurrencySymbol } from '../../src/utils/currency';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  savings: number;
  icon: string;
  features: string[];
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Popular choice for growing users',
    monthlyPrice: 29000,
    yearlyPrice: 348000,
    savings: 0,
    icon: '📍',
    features: [
      '15 valuations',
      'Geolocation + map',
      'Standard support'
    ]
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced analytics and matching',
    monthlyPrice: 79000,
    yearlyPrice: 948000,
    savings: 0,
    icon: '⭐',
    features: [
      '100 valuations',
      'Advanced analytics',
      'Priority support'
    ]
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    description: 'Complete solution for professionals',
    monthlyPrice: 199000,
    yearlyPrice: 2388000,
    savings: 0,
    icon: '👑',
    features: [
      'Unlimited valuations',
      'API access',
      'White-label options',
      'Dedicated support'
    ]
  }
];

const SubscriptionCheckout: React.FC = () => {
  const router = useRouter();
  const { plan, billing } = router.query;

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'pesapal' | 'paypal'>('pesapal');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [preferredCurrency, setPreferredCurrencyState] = useState<string>('RWF');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);

  // Load plan from query parameters
  useEffect(() => {
    if (!router.isReady) return;

    if (plan) {
      const foundPlan = subscriptionPlans.find(p => p.id === plan);
      if (foundPlan) {
        setSelectedPlan(foundPlan);
      } else {
        toast.error('Invalid subscription plan');
        router.push('/dashboard/subscription');
      }
    }

    if (billing === 'yearly' || billing === 'monthly') {
      setBillingPeriod(billing);
    }

    // Load currencies and preferred currency
    async function loadCurrencies() {
      const data = await getCurrencies();
      setCurrencies(data);
      const preferred = getPreferredCurrency();
      setPreferredCurrencyState(preferred);
      const found = findCurrency(data, preferred);
      setSelectedCurrency(found || null);
    }
    loadCurrencies();
  }, [router.isReady, plan, billing, router]);

  // Redirect if not authenticated
  useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!accessToken) {
      toast.error('Please login to continue');
      router.push('/auth/login');
    }
  }, [router]);

  const calculateAmount = () => {
    if (!selectedPlan) return 0;
    return billingPeriod === 'yearly' ? selectedPlan.yearlyPrice : selectedPlan.monthlyPrice;
  };

  const formatCheckoutPrice = (priceRwf: number) => {
    if (!selectedCurrency || selectedCurrency.is_base) {
      return `RWF ${new Intl.NumberFormat('en-US').format(priceRwf)}`;
    }
    const converted = convertFromRwf(priceRwf, selectedCurrency);
    return formatCurrency(converted, preferredCurrency);
  };

  const handleCheckout = async () => {
    if (!selectedPlan) {
      toast.error('Please select a subscription plan');
      return;
    }

    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!accessToken) {
      toast.error('Please login to continue');
      router.push('/auth/login');
      return;
    }

    if (!agreedToTerms) {
      toast.error('Please agree to the terms and conditions');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Upgrade subscription
      const subscriptionResponse = await fetchWithTokenRefresh(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/subscriptions/upgrade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          plan_type: selectedPlan.id
        })
      });

      if (!subscriptionResponse.ok) {
        let errorMsg = 'Failed to upgrade subscription';
        try {
          const errorData = await subscriptionResponse.json();
          if (errorData) {
            errorMsg = errorData.message || (errorData.error && errorData.error.message) || errorMsg;
          }
        } catch (e) {
          // ignore JSON parse errors
        }
        throw new Error(errorMsg);
      }

      const subscriptionData = await subscriptionResponse.json();
      console.log('Subscription upgraded:', subscriptionData);

      // Step 2: Initiate payment with selected provider
      const amount = calculateAmount();
      const frontendUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';
      const initiateEndpoint = paymentMethod === 'pesapal'
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/payments/pesapal/initiate`
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/payments/paypal/initiate`;

      const paymentResponse = await fetchWithTokenRefresh(initiateEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          amount,
          currency: preferredCurrency === 'RWF' ? 'USD' : preferredCurrency,
          description: `${selectedPlan.name} Plan - ${billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`,
          return_url: `${frontendUrl}/dashboard/subscription?payment=success`,
          cancel_url: `${frontendUrl}/subscribe?payment=cancelled`,
          customer_email: '',
          customer_name: '',
        })
      });

      if (!paymentResponse.ok) {
        let errorMsg = `Payment initiation failed`;
        try {
          const errorData = await paymentResponse.json();
          errorMsg = errorData.message || (errorData.error && errorData.error.message) || errorMsg;
        } catch (e) {
          // ignore
        }
        throw new Error(errorMsg);
      }

      const paymentData = await paymentResponse.json();
      const checkoutURL = paymentData?.data?.redirect_url || paymentData?.data?.checkout_url;

      toast.success('Redirecting to payment...');

      if (checkoutURL) {
        // Redirect to provider's checkout page
        window.location.href = checkoutURL;
      } else {
        console.log('Payment initiated:', paymentData);
        setTimeout(() => {
          router.push('/dashboard/subscription');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPlan) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const amount = calculateAmount();
  const formattedAmount = formatCheckoutPrice(amount);
  const currencyLabel = selectedCurrency?.iso_code || 'RWF';

  return (
    <>
      <Head>
        <title>Checkout - {selectedPlan.name} Plan | Land Valuation System</title>
        <meta name="description" content={`Subscribe to ${selectedPlan.name} plan`} />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/dashboard/subscription" className="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-4">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Plans
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Complete Your Subscription</h1>
            <p className="mt-2 text-gray-600">Review your order and complete payment</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>
              
              <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-xl p-6 text-white mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <span className="text-4xl">{selectedPlan.icon}</span>
                  </div>
                  <div className="text-right">
                    <h3 className="text-2xl font-bold">{selectedPlan.name}</h3>
                    <p className="text-emerald-100">{selectedPlan.description}</p>
                  </div>
                </div>
                
                <div className="border-t border-white/20 pt-4 mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Billing Period:</span>
                    <span className="font-semibold capitalize">{billingPeriod}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Amount:</span>
                    <span>{formattedAmount}</span>
                  </div>
                  {billingPeriod === 'yearly' && (
                    <p className="text-emerald-100 text-sm mt-2">
                      💰 Save {selectedPlan.savings}% with yearly billing
                    </p>
                  )}
                </div>
              </div>

              {/* Features included */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Features Included:</h3>
                <ul className="space-y-2">
                  {selectedPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-emerald-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Billing cycle toggle */}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Change Billing Cycle:
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      billingPeriod === 'monthly'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setBillingPeriod('yearly')}
                    className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                      billingPeriod === 'yearly'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Yearly
                  </button>
                </div>
              </div>
            </div>

            {/* Payment Form */}
<div className="bg-white rounded-2xl shadow-lg p-4 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Details</h2>

              <form onSubmit={(e) => { e.preventDefault(); handleCheckout(); }} className="space-y-6">
                {/* Payment Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pesapal')}
                      className={`py-4 px-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'pesapal'
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-1">🌍</div>
                        <div className="font-semibold text-gray-900">PesaPal</div>
                        <div className="text-xs text-gray-500">Mobile Money, Cards, Bank (East Africa)</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('paypal')}
                      className={`py-4 px-4 rounded-xl border-2 transition-all ${
                        paymentMethod === 'paypal'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-1">💳</div>
                        <div className="font-semibold text-gray-900">PayPal</div>
                        <div className="text-xs text-gray-500">Credit/Debit Card (International)</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                  {paymentMethod === 'pesapal' ? (
                    <p>You will be redirected to PesaPal to complete payment using Mobile Money, Card, or Bank Transfer.</p>
                  ) : (
                    <p>You will be redirected to PayPal to pay securely with your PayPal account or Credit/Debit Card.</p>
                  )}
                </div>

                {/* Payment Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Payment Instructions</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• You will be redirected to the payment provider to complete your purchase</li>
                        <li>• Your subscription will be activated upon successful payment confirmation</li>
                        <li>• Return to your dashboard to view your updated subscription status</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="terms" className="ml-3 text-sm text-gray-700">
                    I agree to the{' '}
                    <Link href="/terms" className="text-emerald-600 hover:text-emerald-700 font-medium">
                      Terms and Conditions
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 font-medium">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !agreedToTerms}
                  className={`w-full py-4 px-6 rounded-xl font-semibold transition-all ${
                    loading || !agreedToTerms
                      ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center text-white">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing Payment...
                    </span>
                  ) : (
                    `Pay ${formattedAmount}`
                  )}
                </button>

                {/* Security Notice */}
                <div className="text-center">
                  <p className="text-xs text-gray-500 flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    {paymentMethod === 'pesapal' && 'Secure payment powered by PesaPal'}
                    {paymentMethod === 'paypal' && 'Secure payment powered by PayPal'}
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SubscriptionCheckout;
