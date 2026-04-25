import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import SubscriptionSelector from '../../components/SubscriptionSelector';
import MainNavbar from '../../components/MainNavbar';

const Subscription: React.FC = () => {
  const router = useRouter();
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [currentPlan, setCurrentPlan] = useState('free');

  useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (accessToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setCurrentPlan(parsedUser?.subscriptionTier || parsedUser?.subscription_tier || 'free');
      } catch (e) {
        setCurrentPlan('free');
      }
      setLoading(false);
      return;
    }

    if (status === 'unauthenticated') {
      router.push('/auth/login');
      return;
    }

    if (status === 'authenticated') {
      setLoading(false);
    }
  }, [router, status]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-emerald-700"></i>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Subscription Plans · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Choose monthly or yearly subscription plans" />
      </Head>

      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">
        

        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">Choose Your Subscription</h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Pick monthly or yearly billing and upgrade instantly.
              </p>
            </div>

            <SubscriptionSelector currentPlan={currentPlan} />
          </div>
        </main>
      </div>
    </>
  );
};

export default Subscription;
