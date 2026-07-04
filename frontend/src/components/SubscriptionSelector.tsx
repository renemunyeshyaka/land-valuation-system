import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import CurrencySelector from './CurrencySelector';
import { Currency, getCurrencies, getPreferredCurrency, findCurrency, convertFromRwf, formatCurrency } from '../utils/currency';

interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;  // in RWF
  yearlyPrice: number;   // in RWF
  savings: number;
  icon: string;
  color: string;
  features: string[];
  limits: {
    valuations: number | string;
    properties: number | string;
    adverts: string;
    support: string;
  };
  cta: string;
  popular?: boolean;
}

const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Free valuation to get started',
    monthlyPrice: 0,
    yearlyPrice: 0,
    savings: 0,
    icon: '🚀',
    color: 'from-gray-500 to-gray-600',
    features: [
      '3 valuations/month',
      'Basic gazette lookup',
      'No buyer contact'
    ],
    limits: {
      valuations: '3/month',
      properties: '1',
      adverts: '1',
      support: 'Community'
    },
    cta: 'Get started',
    popular: false
  },
  {
    id: 'basic',
    name: 'Basic',
    description: 'Popular choice for growing users',
    monthlyPrice: 29000,
    yearlyPrice: 348000,
    savings: 0,
    icon: '📍',
    color: 'from-emerald-500 to-emerald-600',
    features: [
      '15 valuations',
      'Geolocation + map',
      'Standard support'
    ],
    limits: {
      valuations: '15/month',
      properties: '5',
      adverts: '5',
      support: 'Standard'
    },
    cta: 'Choose Basic',
    popular: true
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Advanced analytics and matching',
    monthlyPrice: 79000,
    yearlyPrice: 948000,
    savings: 0,
    icon: '⭐',
    color: 'from-blue-500 to-blue-600',
    features: [
      'Unlimited valuations',
      'API access, trends',
      'Priority listing'
    ],
    limits: {
      valuations: 'Unlimited',
      properties: '10',
      adverts: '15',
      support: 'Email (24h)'
    },
    cta: 'Upgrade',
    popular: false
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    description: 'Enterprise-grade capabilities',
    monthlyPrice: 199000,
    yearlyPrice: 2388000,
    savings: 0,
    icon: '👑',
    color: 'from-amber-500 to-amber-600',
    features: [
      'White-label',
      'Dedicated account manager',
      'Bulk export'
    ],
    limits: {
      valuations: 'Unlimited',
      properties: 'Unlimited',
      adverts: 'Unlimited',
      support: 'Phone + Email (2h)'
    },
    cta: 'Contact sales',
    popular: false
  }
];

interface SubscriptionSelectorProps {
  currentPlan?: string;
  onSubscribe?: (planId: string, billingPeriod: 'monthly' | 'yearly') => Promise<void>;
}

export default function SubscriptionSelector({
  currentPlan = 'free',
  onSubscribe
}: SubscriptionSelectorProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [preferredCurrency, setPreferredCurrencyState] = useState<string>('RWF');

  // Load currencies and user preference on mount
  useEffect(() => {
    async function load() {
      const data = await getCurrencies();
      setCurrencies(data);
      setPreferredCurrencyState(getPreferredCurrency());
    }
    load();
  }, []);

  const handleCurrencyChange = (code: string) => {
    setPreferredCurrencyState(code);
  };

  /**
   * Format a price in RWF to the user's preferred currency
   */
  const formatPrice = (priceRwf: number) => {
    if (priceRwf === 0) {
      const cur = findCurrency(currencies, preferredCurrency);
      return `${cur?.symbol || 'Frw'} 0`;
    }

    const currency = findCurrency(currencies, preferredCurrency);
    if (!currency || currency.is_base) {
      // Show in RWF with formatting
      return `RWF ${new Intl.NumberFormat('en-US').format(priceRwf)}`;
    }

    // Convert to preferred currency
    const converted = convertFromRwf(priceRwf, currency);
    return formatCurrency(converted, preferredCurrency);
  };

  /**
   * Get the period label in the preferred currency
   */
  const getPeriodLabel = (monthlyLabel: string, yearlyLabel: string) => {
    return billingPeriod === 'monthly' ? monthlyLabel : yearlyLabel;
  };

  const handleSubscribe = async (planId: string) => {
    if (planId === currentPlan) {
      toast.success(t('subscription.alreadyOnPlan'));
      return;
    }

    setLoadingPlan(planId);
    try {
      if (onSubscribe) {
        await onSubscribe(planId, billingPeriod);
      } else {
        // Default: redirect to payment page with preferred currency
        router.push(`/subscription/checkout?plan=${planId}&billing=${billingPeriod}&currency=${preferredCurrency}`);
      }
      toast.success(t('subscription.subscribedTo', { plan: planId }));
    } catch (error: any) {
      toast.error(error.message || t('subscription.subscribeFailed'));
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">
          Plans for every need
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Start with free valuation, upgrade for advanced analytics & buyer matching
        </p>

        {/* Billing Toggle + Currency Selector */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2.5 rounded-md font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2.5 rounded-md font-semibold transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Yearly
            </button>
          </div>
          <CurrencySelector compact onCurrencyChange={handleCurrencyChange} />
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
        {subscriptionPlans.map((plan) => {
          const isCurrentPlan = plan.id === currentPlan;
          const displayPrice = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
          const period = billingPeriod === 'monthly' ? '/mo' : '/yr';

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 transition-all ${
                plan.popular
                  ? 'border-blue-500 shadow-xl scale-105 md:scale-100'
                  : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
              } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                    Popular
                  </span>
                </div>
              )}

              {/* Current Plan Badge */}
              {isCurrentPlan && (
                <div className="absolute -top-4 right-4">
                  <span className="bg-green-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                    ✓ Current
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan Icon & Name */}
                <div className="mb-6">
                  <div className="text-5xl mb-3">{plan.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>

                {/* Pricing */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  {displayPrice > 0 ? (
                    <>
                      <div className="text-4xl font-bold text-gray-900 mb-1">
                        {formatPrice(displayPrice)}
                      </div>
                      <p className="text-gray-600 text-sm font-medium">{period}</p>
                    </>
                  ) : (
                    <div className="text-4xl font-bold text-gray-900">Free</div>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loadingPlan === plan.id || isCurrentPlan || plan.id === 'free'}
                  className={`w-full py-3 px-4 rounded-lg font-bold text-white mb-3 transition-all ${
                    isCurrentPlan || plan.id === 'free'
                      ? 'bg-gray-400 cursor-default'
                      : `bg-gradient-to-r ${plan.color} hover:shadow-lg hover:scale-105 disabled:opacity-50`
                  }`}
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    plan.cta
                  ) : (
                    plan.cta
                  )}
                </button>

                {/* MTN Manual Payment Option for Rwanda users */}
                {plan.id !== 'free' && !isCurrentPlan && (
                  <Link
                    href={`/dashboard/mtn-payment?plan=${plan.id}&billing=${billingPeriod}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all text-sm mb-6"
                  >
                    <i className="fas fa-mobile-alt"></i>
                    Pay via MTN Mobile Money (Manual)
                  </Link>
                )}

                {/* Features List */}
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-700 mb-3">FEATURES:</p>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-500 font-bold mt-0.5">✓</span>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Limits */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-bold text-gray-700 mb-3">LIMITS:</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Valuations:</span>
                      <span className="font-semibold text-gray-900">{plan.limits.valuations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Properties:</span>
                      <span className="font-semibold text-gray-900">{plan.limits.properties}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Adverts:</span>
                      <span className="font-semibold text-gray-900">{plan.limits.adverts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Support:</span>
                      <span className="font-semibold text-gray-900">{plan.limits.support}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Table */}
      <div className="mt-12 pt-12 border-t border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Detailed Comparison
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-4 px-4 font-bold text-gray-900">Feature</th>
                {subscriptionPlans.map((plan) => (
                  <th
                    key={plan.id}
                    className="text-center py-4 px-4 font-bold text-gray-900"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-700">Valuation limit</td>
                <td className="text-center py-4 px-4 text-gray-600">3/month</td>
                <td className="text-center py-4 px-4 text-gray-600">15/month</td>
                <td className="text-center py-4 px-4 text-gray-600">Unlimited</td>
                <td className="text-center py-4 px-4 text-gray-600">Unlimited</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-700">Basic gazette lookup</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-700">Buyer contact</td>
                <td className="text-center py-4 px-4 text-gray-600">✗</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-700">Geolocation + map</td>
                <td className="text-center py-4 px-4 text-gray-600">✗</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-700">API access, trends</td>
                <td className="text-center py-4 px-4 text-gray-600">✗</td>
                <td className="text-center py-4 px-4 text-gray-600">✗</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 font-medium text-gray-700">White-label</td>
                <td className="text-center py-4 px-4 text-gray-600">✗</td>
                <td className="text-center py-4 px-4 text-gray-600">✗</td>
                <td className="text-center py-4 px-4 text-gray-600">✗</td>
                <td className="text-center py-4 px-4 text-gray-600">✓</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-12 pt-12 border-t border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Frequently Asked Questions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-blue-600">Q:</span> Can I change plans anytime?
            </h4>
            <p className="text-gray-600 text-sm">
              Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-blue-600">Q:</span> What payment methods do you accept?
            </h4>
            <p className="text-gray-600 text-sm">
              We accept automatic MTN MoMo, bank transfers, and credit cards. MTN Rwanda users can also pay via <strong>Manual MTN Payment</strong> — send money to 0788620201 and submit your transaction reference for verification.
            </p>
            <div className="mt-3">
              <Link
                href="/dashboard/mtn-payment"
                className="text-emerald-700 hover:text-emerald-800 text-sm font-semibold"
              >
                <i className="fas fa-mobile-alt mr-1"></i>
                Pay with MTN Mobile Money (Manual) →
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-blue-600">Q:</span> Is there a free trial?
            </h4>
            <p className="text-gray-600 text-sm">
              Our Free plan gives you full access to core features. Upgrade anytime to unlock Professional features.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-blue-600">Q:</span> Do you offer refunds?
            </h4>
            <p className="text-gray-600 text-sm">
              30-day money-back guarantee if you're not satisfied with your upgrade.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-blue-600">Q:</span> Can I pay yearly instead of monthly?
            </h4>
            <p className="text-gray-600 text-sm">
              Yes. Use the billing toggle to switch between monthly and yearly plans anytime.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span className="text-blue-600">Q:</span> What if I need more storage?
            </h4>
            <p className="text-gray-600 text-sm">
              Contact support and we can add additional storage for your account.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Banner */}
      <div className="mt-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-8 text-center text-white">
        <h3 className="text-2xl font-bold mb-3">
          Not sure which plan is right for you?
        </h3>
        <p className="mb-6 text-blue-100">
          Our support team is happy to help you choose the perfect subscription for your needs.
        </p>
        <button className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:shadow-lg hover:scale-105 transition-all">
          <i className="fas fa-comments mr-2"></i>
          Contact Support
        </button>
      </div>
    </div>
  );
}
