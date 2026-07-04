import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import MainNavbar from '../../components/MainNavbar';
import {
  initiateMTNManualPayment,
  submitMTNPaymentProof,
  getMTNManualPaymentStatus,
  MTNManualPaymentInitResponse,
} from '../../utils/paymentApi';

type PaymentStep = 'select_plan' | 'payment_instructions' | 'submit_proof' | 'confirmation';

const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  basic: { monthly: 29000, yearly: 348000 },
  professional: { monthly: 79000, yearly: 948000 },
  ultimate: { monthly: 199000, yearly: 2388000 },
};

const getPlanName = (planId: string, t: (key: string) => string) => {
  const names: Record<string, string> = {
    basic: t('subscription.basic'),
    professional: t('subscription.professional'),
    ultimate: t('subscription.ultimate'),
  };
  return names[planId] || planId;
};

export default function MTNPaymentPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [step, setStep] = useState<PaymentStep>('select_plan');
  const [selectedPlan, setSelectedPlan] = useState<string>('basic');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<MTNManualPaymentInitResponse | null>(null);

  // Proof submission form
  const [mtnRef, setMtnRef] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderName, setSenderName] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [notes, setNotes] = useState('');

  // Status tracking
  const [statusTxId, setStatusTxId] = useState<string | null>(null);
  const [statusInfo, setStatusInfo] = useState<any>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Get query params
  useEffect(() => {
    if (router.query.plan && ['basic', 'professional', 'ultimate'].includes(router.query.plan as string)) {
      setSelectedPlan(router.query.plan as string);
    }
    if (router.query.billing && ['monthly', 'yearly'].includes(router.query.billing as string)) {
      setBillingPeriod(router.query.billing as 'monthly' | 'yearly');
    }
  }, [router.query]);

  const getAmount = () => {
    return PLAN_PRICES[selectedPlan]?.[billingPeriod] || 0;
  };

  const handleInitiatePayment = async () => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      toast.error(t('auth.loginFirst') || 'Please login first');
      router.push('/auth/login');
      return;
    }

    setLoading(true);
    try {
      const result = await initiateMTNManualPayment(accessToken, {
        amount: getAmount(),
        currency: 'RWF',
        plan_type: selectedPlan,
        billing_period: billingPeriod,
        description: `Manual MTN payment for ${getPlanName(selectedPlan, t)} plan (${billingPeriod})`,
      });
      setPaymentData(result);
      setStep('payment_instructions');
      toast.success(t('subscription.mtnManualPaymentInstr') || 'Follow the instructions below.');
    } catch (err: any) {
      toast.error(err.message || t('subscription.subscribeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData) return;

    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) {
      toast.error(t('auth.loginFirst') || 'Please login first');
      return;
    }

    if (!mtnRef.trim()) {
      toast.error(t('common.fillRequired'));
      return;
    }
    if (!senderPhone.trim()) {
      toast.error(t('common.fillRequired'));
      return;
    }
    if (!senderName.trim()) {
      toast.error(t('common.fillRequired'));
      return;
    }
    if (!paymentDate.trim()) {
      toast.error(t('common.fillRequired'));
      return;
    }

    setLoading(true);
    try {
      await submitMTNPaymentProof(accessToken, {
        transaction_id: paymentData.transaction_id,
        mtn_transaction_ref: mtnRef.trim(),
        sender_phone_number: senderPhone.trim(),
        payment_date: paymentDate,
        sender_name: senderName.trim(),
        notes: notes.trim(),
      });
      setStep('confirmation');
      setStatusTxId(paymentData.transaction_id);
      toast.success(t('subscription.mtnManualConfirmDesc'));
    } catch (err: any) {
      toast.error(err.message || t('subscription.subscribeFailed'));
    } finally {
      setLoading(false);
    }
  };

  const checkStatus = async () => {
    if (!statusTxId) return;

    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;

    setStatusLoading(true);
    try {
      const result = await getMTNManualPaymentStatus(accessToken, statusTxId);
      setStatusInfo(result);
    } catch (err: any) {
      toast.error(err.message || t('common.error'));
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (step === 'confirmation' && statusTxId) {
      checkStatus();
    }
  }, [step, statusTxId]);

  const renderSelectPlan = () => (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {t('subscription.mtnManualTitle')}
      </h2>
      <p className="text-gray-600 text-center mb-8">
        {t('subscription.mtnManualDesc')}
      </p>

      {/* Plan selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {Object.entries(PLAN_PRICES).map(([planId, prices]) => (
          <button
            key={planId}
            onClick={() => setSelectedPlan(planId)}
            className={`p-6 rounded-xl border-2 text-center transition-all ${
              selectedPlan === planId
                ? 'border-emerald-500 bg-emerald-50 shadow-md'
                : 'border-gray-200 hover:border-emerald-300 bg-white'
            }`}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {getPlanName(planId, t)}
            </h3>
            <p className="text-2xl font-bold text-emerald-700">
              RWF {new Intl.NumberFormat('en-US').format(
                billingPeriod === 'monthly' ? prices.monthly : prices.yearly
              )}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              /{billingPeriod === 'monthly' ? t('subscription.monthly').toLowerCase().slice(0,2) : t('subscription.yearly').toLowerCase().slice(0,2)}
            </p>
          </button>
        ))}
      </div>

      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-2.5 rounded-md font-semibold transition-all ${
              billingPeriod === 'monthly'
                ? 'bg-white text-emerald-700 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('subscription.monthly')}
          </button>
          <button
            onClick={() => setBillingPeriod('yearly')}
            className={`px-6 py-2.5 rounded-md font-semibold transition-all ${
              billingPeriod === 'yearly'
                ? 'bg-white text-emerald-700 shadow-md'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('subscription.yearly')}
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6 text-center">
        <p className="text-sm text-gray-600">{t('subscription.mtnManualTotal')}</p>
        <p className="text-3xl font-bold text-emerald-700">
          RWF {new Intl.NumberFormat('en-US').format(getAmount())}
        </p>
      </div>

      <button
        onClick={handleInitiatePayment}
        disabled={loading}
        className="w-full py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? (
          <><i className="fas fa-spinner fa-spin mr-2"></i>{t('common.loading')}</>
        ) : (
          t('subscription.mtnManualProceed')
        )}
      </button>
    </div>
  );

  const renderPaymentInstructions = () => {
    if (!paymentData) return null;

    const fmtAmount = `RWF ${new Intl.NumberFormat('en-US').format(paymentData.amount)}`;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="bg-emerald-700 p-6 text-white text-center">
            <i className="fas fa-mobile-alt text-5xl mb-3"></i>
            <h2 className="text-2xl font-bold">{t('subscription.mtnManualSendTitle')}</h2>
            <p className="text-emerald-100 mt-2">
              {t('subscription.mtnManualSendDesc')}
            </p>
          </div>

          {/* Payment Details */}
          <div className="p-6 space-y-4">
            {/* Amount */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">{t('subscription.mtnManualAmountLabel')}</p>
              <p className="text-4xl font-bold text-emerald-700">
                {fmtAmount}
              </p>
            </div>

            {/* MTN Number */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{t('subscription.mtnManualSendTo')}</p>
              <p className="text-2xl font-bold text-blue-700">
                {paymentData.mtn_phone_number}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {t('subscription.mtnManualAccount')}: {paymentData.mtn_account_name}
              </p>
            </div>

            {/* Reference */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">{t('subscription.mtnManualRefLabel')}</p>
              <p className="text-xl font-mono font-bold text-gray-800">
                {paymentData.reference_number}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t('subscription.mtnManualRefHint')}
              </p>
            </div>

            {/* Plan Info */}
            <div className="flex justify-between text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <span>{t('subscription.mtnManualPlanLabel')}: <strong className="text-gray-800">{getPlanName(paymentData.plan_type, t)}</strong></span>
              <span>{t('subscription.mtnManualPeriodLabel')}: <strong className="text-gray-800">{paymentData.billing_period === 'monthly' ? t('subscription.monthly') : t('subscription.yearly')}</strong></span>
            </div>

            {/* Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2 flex items-center gap-2">
                <i className="fas fa-info-circle"></i>
                {t('subscription.mtnManualHowToTitle')}
              </h4>
              <ol className="list-decimal list-inside text-sm text-yellow-800 space-y-2">
                <li>{t('subscription.mtnManualHowToStep1')}</li>
                <li>{t('subscription.mtnManualHowToStep2')}</li>
                <li>{t('subscription.mtnManualHowToStep3', { phone: paymentData.mtn_phone_number })}</li>
                <li>{t('subscription.mtnManualHowToStep4', { amount: fmtAmount })}</li>
                <li>{t('subscription.mtnManualHowToStep5', { ref: paymentData.reference_number })}</li>
                <li>{t('subscription.mtnManualHowToStep6')}</li>
                <li>{t('subscription.mtnManualHowToStep7')}</li>
              </ol>
            </div>

            {/* Proceed to submit proof */}
            <button
              onClick={() => setStep('submit_proof')}
              className="w-full py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors"
            >
              <i className="fas fa-check-circle mr-2"></i>
              {t('subscription.mtnManualSubmitProof')}
            </button>

            <p className="text-xs text-gray-500 text-center">
              {t('subscription.mtnManualVerifyNote')}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderSubmitProof = () => {
    if (!paymentData) return null;

    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            {t('subscription.mtnManualSubmitTitle')}
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {t('subscription.mtnManualSubmitDesc')}
          </p>

          <form onSubmit={handleSubmitProof} className="space-y-5">
            {/* MTN Transaction Ref */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('subscription.mtnManualRefCode')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={mtnRef}
                onChange={(e) => setMtnRef(e.target.value)}
                placeholder={t('subscription.mtnManualRefPlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('subscription.mtnManualRefHintSubmit')}
              </p>
            </div>

            {/* Sender Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('subscription.mtnManualSenderPhone')} <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
                placeholder={t('subscription.mtnManualSenderPhonePlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            {/* Sender Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('subscription.mtnManualSenderName')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder={t('subscription.mtnManualSenderNamePlaceholder')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            {/* Payment Date */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('subscription.mtnManualPaymentDate')} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                required
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {t('subscription.mtnManualNotes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('subscription.mtnManualNotesPlaceholder')}
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin mr-2"></i>{t('subscription.mtnManualSubmitting')}</>
              ) : (
                t('subscription.mtnManualSubmitBtn')
              )}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
        <div className="text-6xl mb-4 text-emerald-500">
          <i className="fas fa-check-circle"></i>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('subscription.mtnManualConfirmTitle')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('subscription.mtnManualConfirmDesc')}
        </p>

        {paymentData && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('subscription.mtnManualTxId')}:</span>
              <span className="text-sm font-mono font-bold">{paymentData.transaction_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('subscription.mtnManualRefNumber')}:</span>
              <span className="text-sm font-mono font-bold">{paymentData.reference_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('subscription.mtnManualPlanLabel')}:</span>
              <span className="text-sm font-bold">{getPlanName(paymentData.plan_type, t)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('subscription.mtnManualAmount')}:</span>
              <span className="text-sm font-bold">RWF {new Intl.NumberFormat('en-US').format(paymentData.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t('subscription.mtnManualStatus')}:</span>
              <span className="text-sm font-bold text-yellow-600">{t('subscription.mtnManualPendingVerify')}</span>
            </div>
          </div>
        )}

        {/* Status check */}
        {statusTxId && (
          <div className="mb-6">
            <button
              onClick={checkStatus}
              disabled={statusLoading}
              className="text-emerald-700 hover:text-emerald-800 text-sm font-semibold"
            >
              {statusLoading ? (
                <><i className="fas fa-spinner fa-spin mr-1"></i>{t('subscription.mtnManualChecking')}</>
              ) : (
                <><i className="fas fa-sync-alt mr-1"></i>{t('subscription.mtnManualCheckStatus')}</>
              )}
            </button>
            {statusInfo && (
              <p className="text-sm text-gray-600 mt-2">
                {t('subscription.mtnManualStatus')}: <span className="font-semibold">{statusInfo.message}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard/subscription"
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-lg transition-colors"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            {t('subscription.mtnManualBackToSubs')}
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-lg transition-colors"
          >
            {t('subscription.mtnManualGoToDashboard')}
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>{t('subscription.mtnManualTitle')} · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">
        <MainNavbar />
        <main className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          {/* Back link */}
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center text-sm text-emerald-700 hover:text-emerald-800 mb-6"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            {t('subscription.backToPlans')}
          </Link>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {(['select_plan', 'payment_instructions', 'submit_proof', 'confirmation'] as PaymentStep[]).map(
              (s, idx) => {
                const stepOrder = ['select_plan', 'payment_instructions', 'submit_proof', 'confirmation'];
                const currentIdx = stepOrder.indexOf(step);
                const thisIdx = stepOrder.indexOf(s);
                const isDone = thisIdx < currentIdx;
                const isActive = s === step;
                return (
                  <React.Fragment key={s}>
                    {idx > 0 && (
                      <div
                        className={`h-0.5 w-8 sm:w-16 ${
                          isDone || isActive ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                        isDone
                          ? 'bg-emerald-500 text-white'
                          : isActive
                          ? 'bg-emerald-700 text-white ring-2 ring-emerald-300'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isDone ? <i className="fas fa-check"></i> : idx + 1}
                    </div>
                  </React.Fragment>
                );
              }
            )}
          </div>

          {/* Step content */}
          {step === 'select_plan' && renderSelectPlan()}
          {step === 'payment_instructions' && renderPaymentInstructions()}
          {step === 'submit_proof' && renderSubmitProof()}
          {step === 'confirmation' && renderConfirmation()}
        </main>
      </div>
    </>
  );
}
