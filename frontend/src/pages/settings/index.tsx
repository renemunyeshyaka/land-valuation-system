import React, { useState } from 'react';
import LandEstimateForm, { LandEstimateRequest } from '../../components/LandEstimateForm';
import Head from 'next/head';
import Link from 'next/link';
import toast from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const [language, setLanguage] = useState('en');
  const [currency, setCurrency] = useState('RWF');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [estimateResult, setEstimateResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEstimate = async (params: LandEstimateRequest) => {
    setLoading(true);
    setError(null);
    setEstimateResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/v1/land-value-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Failed to fetch estimate');
      const payload = await res.json();
      setEstimateResult(payload.data || null);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    toast.success('Settings updated successfully');
  };

  return (
    <>
      <Head>
        <title>Settings · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
      </Head>

      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">
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

              <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors">
                Dashboard
              </Link>
            </div>
          </div>
        </nav>

        <main className="flex-grow">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">Settings</h1>
              <p className="text-lg text-gray-600">Manage account preferences, notifications, and security</p>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-5">Quick Land Value Estimate</h2>
                <LandEstimateForm onEstimate={handleEstimate} disabled={loading} />
                {error && <div className="text-red-600 mt-4">{error}</div>}
                {estimateResult && (
                  <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-emerald-700 mb-2">Land Value Estimate</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <span className="font-medium text-gray-700">Min Value per sqm:</span>
                        <span className="ml-2 text-gray-900">{estimateResult.min_value_per_sqm}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Weighted Avg per sqm:</span>
                        <span className="ml-2 text-gray-900">{estimateResult.weighted_avg_value_per_sqm}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Max Value per sqm:</span>
                        <span className="ml-2 text-gray-900">{estimateResult.max_value_per_sqm}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <span className="font-medium text-gray-700">Total Min Value:</span>
                        <span className="ml-2 text-gray-900">{estimateResult.total_min_value}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Weighted Avg:</span>
                        <span className="ml-2 text-gray-900">{estimateResult.total_weighted_avg_value}</span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Max Value:</span>
                        <span className="ml-2 text-gray-900">{estimateResult.total_max_value}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-5">Preferences</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="en">English</option>
                      <option value="fr">French</option>
                      <option value="rw">Kinyarwanda</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="RWF">RWF</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-5">Notification Settings</h2>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Email Alerts</p>
                      <p className="text-xs text-gray-600">Receive reports and billing updates by email</p>
                    </div>
                    <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">SMS Alerts</p>
                      <p className="text-xs text-gray-600">Receive critical updates by SMS</p>
                    </div>
                    <input type="checkbox" checked={smsAlerts} onChange={(e) => setSmsAlerts(e.target.checked)} />
                  </label>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-5">Security</h2>
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Two-Factor Authentication</p>
                      <p className="text-xs text-gray-600">Add extra protection to your account</p>
                    </div>
                    <input type="checkbox" checked={twoFactor} onChange={(e) => setTwoFactor(e.target.checked)} />
                  </label>
                  <label className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Dark Mode</p>
                      <p className="text-xs text-gray-600">Enable dark appearance (preview)</p>
                    </div>
                    <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">© {new Date().getFullYear()} LandVal. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SettingsPage;
