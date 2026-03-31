import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';

import { fetchWithTokenRefresh } from '@/utils/tokenRefresh';

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
    monthlyPrice: 29,
    yearlyPrice: 348,
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
    monthlyPrice: 79,
    yearlyPrice: 948,
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
    monthlyPrice: 199,
    yearlyPrice: 2388,
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
  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState<'mtn' | 'airtel' | 'bank'>('mtn');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Load plan from query parameters
  useEffect(() => {
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
  }, [plan, billing, router]);

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

  const handleCheckout = async () => {
    if (!selectedPlan) {
      toast.error('Please select a subscription plan');
      return;
    }

    if (!phoneNumber) {
      toast.error('Please enter your phone number');
      return;
    }


    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!accessToken) {
      toast.error('Please login to continue');
      router.push('/auth/login');
      return;
    }

    // Phone validation
    const mtnSandboxNumbers = ['46733123450', '46733123451', '46733123452', '46733123453'];
    const phoneNoPlus = phoneNumber.startsWith('+') ? phoneNumber.slice(1) : phoneNumber;
    if (provider === 'mtn') {
      if (!phoneNumber.match(/^[+][1-9]\d{7,14}$/) && !phoneNumber.match(/^([+]?250|0)?[7][2389]\d{7}$/)) {
        // Allow sandbox test numbers (with or without '+')
        if (!mtnSandboxNumbers.includes(phoneNoPlus)) {
          toast.error('Please enter a valid international (E.164) or Rwandan phone number for MTN MoMo');
          return;
        }
      }
    } else if (provider === 'airtel') {
      if (!phoneNumber.match(/^([+]?250|0)?7[34][0-9]{7}$/)) {
        toast.error('Please enter a valid Rwandan phone number for Airtel Money (07XXXXXXXX, starts with 073 or 074)');
        return;
      }
    } else if (provider === 'bank') {
      // For bank, phone number is optional or can be skipped
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


      // Step 2: Initiate payment
      const amount = calculateAmount();
      let paymentBody: any = {
        amount: amount,
        provider: provider,
        description: `${selectedPlan.name} Plan - ${billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`,
      };
      let paymentEndpoint = '';
      if (provider === 'mtn' || provider === 'airtel') {
        paymentBody.phone_number = phoneNumber;
        if (provider === 'mtn') {
          paymentBody.currency = 'EUR'; // Always EUR for MTN sandbox
        }
        paymentEndpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/payments/mobile-money`;
      } else if (provider === 'bank') {
        paymentBody.bank_name = 'Bank of Kigali / Equity';
        paymentEndpoint = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/payments/bank/initiate`;
      }

      const paymentResponse = await fetchWithTokenRefresh(paymentEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(paymentBody)
      });

      if (!paymentResponse.ok) {
        let errorMsg = `Payment initiation failed (HTTP ${paymentResponse.status})`;
        let backendDetails = '';
        try {
          const errorData = await paymentResponse.json();
          backendDetails = JSON.stringify(errorData, null, 2);
          errorMsg = errorData.message || (errorData.error && errorData.error.message) || errorMsg;
        } catch (jsonErr) {
          try {
            const text = await paymentResponse.text();
            backendDetails = text || '[No response body]';
          } catch (textErr) {
            backendDetails = '[No response body]';
          }
        }
        toast.error(`${errorMsg}\n${backendDetails}`);
        console.error('Payment API error:', errorMsg, backendDetails);
        throw new Error(`${errorMsg}\n${backendDetails}`);
      }

      const paymentData = await paymentResponse.json();
      console.log('Payment initiated:', paymentData);

      toast.success('Payment initiated! Please check your phone to complete the transaction.');

      // Redirect to payment status or dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard/subscription');
      }, 2000);
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
  const formattedAmount = `EUR ${amount}`;

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
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Payment Details</h2>

              <form onSubmit={(e) => { e.preventDefault(); handleCheckout(); }} className="space-y-6">
                {/* Payment Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Payment Provider
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setProvider('mtn')}
                      className={`py-4 px-4 rounded-xl border-2 transition-all ${
                        provider === 'mtn'
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-1">📱</div>
                        <div className="font-semibold text-gray-900">MTN MoMo</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvider('airtel')}
                      className={`py-4 px-4 rounded-xl border-2 transition-all ${
                        provider === 'airtel'
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-1">📲</div>
                        <div className="font-semibold text-gray-900">Airtel Money</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProvider('bank')}
                      className={`py-4 px-4 rounded-xl border-2 transition-all ${
                        provider === 'bank'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-1">🏦</div>
                        <div className="font-semibold text-gray-900">Bank Transfer</div>
                        <div className="text-xs text-gray-500">(Equity, Bank of Kigali)</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Phone Number */}
                {provider !== 'bank' && (
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={provider === 'airtel' ? '073XXXXXXX or 074XXXXXXX' : '07XXXXXXXX'}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      {provider === 'mtn' ? (
                        <>
                          Enter your MTN mobile money number.<br />
                          Example (Rwanda): <span className="font-mono">+250788123456</span> or <span className="font-mono">0788123456</span><br />
                          Example (International): <span className="font-mono">+46701234567</span><br />
                          <span className="text-emerald-700 font-semibold">For sandbox testing, use one of these numbers: 46733123450, 46733123451, 46733123452, 46733123453</span>
                        </>
                      ) : (
                        <>
                          Enter your Airtel Money number.<br />
                          Example: <span className="font-mono">073XXXXXXX</span> or <span className="font-mono">074XXXXXXX</span>
                        </>
                      )}
                    </p>
                  </div>
                )}
                {provider === 'bank' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 mb-1">Bank Transfer Instructions</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• You will receive bank account details for Equity or Bank of Kigali</li>
                      <li>• Please transfer the exact amount and upload proof of payment</li>
                      <li>• Your subscription will be activated after payment verification</li>
                    </ul>
                  </div>
                )}

                {/* Payment Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="font-medium text-blue-900 mb-1">Payment Instructions</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• You will receive a payment prompt on your phone</li>
                        <li>• Enter your Mobile Money PIN to complete the payment</li>
                        <li>• Your subscription will be activated upon successful payment</li>
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
                    {provider === 'mtn' && 'Secure payment powered by MTN MoMo'}
                    {provider === 'airtel' && 'Secure payment powered by Airtel Money'}
                    {provider === 'bank' && 'Secure payment via Bank Transfer (Equity, Bank of Kigali)'}
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
