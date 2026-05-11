import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import AddPropertyForm from '../../src/components/AddPropertyForm';
import FourStepProcess from '../../src/components/FourStepProcess';
import { fetchWithTokenRefresh } from '../../src/utils/tokenRefresh';

export default function AddPropertyPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAccess = async () => {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        router.push('/auth/login');
        return;
      }

      try {
        const response = await fetchWithTokenRefresh(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/users/profile`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token') || accessToken}`,
          },
        });

        if (!response.ok) {
          router.push('/auth/login');
          return;
        }

        const payload = await response.json();
        const userType = String(payload?.data?.user_type || '').toLowerCase();
        if (userType === 'government' || userType === 'partner' || userType === 'gov_partner') {
          router.replace('/partner/dashboard');
          return;
        }

        setIsAuthenticated(true);
      } catch {
        router.push('/auth/login');
        return;
      } finally {
        setLoading(false);
      }
    };

    verifyAccess();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Four Step Process Overview */}
        <FourStepProcess currentStep={1} />

        {/* Add Property Form */}
        <AddPropertyForm />

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
