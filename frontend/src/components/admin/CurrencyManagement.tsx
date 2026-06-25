import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { Currency, getCurrencies, formatCurrency, clearCurrencyCache } from '../../utils/currency';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export default function CurrencyManagement() {
  const { t } = useTranslation();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRate, setEditRate] = useState<string>('');

  const fetchCurrencies = useCallback(async (token?: string) => {
    setLoading(true);
    try {
      const data = await getCurrencies(token);
      setCurrencies(data);
    } catch (err) {
      toast.error(t('toast.currencyLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    fetchCurrencies(token || undefined);
  }, [fetchCurrencies]);

  const handleSyncRates = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      toast.error(t('toast.notAuthenticated'));
      return;
    }

    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/currencies/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Sync failed');
      }

      toast.success(t('toast.currencySyncSuccess'));
      clearCurrencyCache();
      await fetchCurrencies(token);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sync exchange rates');
    } finally {
      setSyncing(false);
    }
  };

  const startEditing = (currency: Currency) => {
    setEditingId(currency.id);
    setEditRate(String(currency.exchange_rate_to_rwf));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditRate('');
  };

  const saveRate = async (currency: Currency) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      toast.error(t('toast.notAuthenticated'));
      return;
    }

    const newRate = parseFloat(editRate);
    if (isNaN(newRate) || newRate <= 0) {
      toast.error(t('toast.invalidPositiveNumber'));
      return;
    }

    try {
      // Use the currency API's update mechanism (via sync with manual override)
      const res = await fetch(`${API_BASE_URL}/api/v1/admin/currencies/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ override: { [currency.iso_code]: newRate } }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to update rate');
      }

      toast.success(`${currency.iso_code} rate updated to ${newRate}`);
      clearCurrencyCache();
      cancelEditing();
      await fetchCurrencies(token);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update rate');
    }
  };

  const baseCurrency = currencies.find(c => c.is_base);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Currency Management</h2>
          <p className="text-sm text-gray-500 mt-1">
            Base currency: <strong>{baseCurrency?.iso_code} ({baseCurrency?.symbol})</strong>
          </p>
        </div>
        <button
          onClick={handleSyncRates}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          <i className={`fas ${syncing ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i>
          {syncing ? 'Syncing...' : 'Sync Exchange Rates'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <i className="fas fa-spinner fa-spin text-2xl text-emerald-700"></i>
          <span className="ml-3 text-gray-600">Loading currencies...</span>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3 text-left font-medium">Currency</th>
                  <th className="p-3 text-left font-medium">Code</th>
                  <th className="p-3 text-left font-medium">Symbol</th>
                  <th className="p-3 text-right font-medium">Rate (to RWF)</th>
                  <th className="p-3 text-center font-medium">Base</th>
                  <th className="p-3 text-left font-medium">Region</th>
                  <th className="p-3 text-center font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currencies.length > 0 ? currencies.map(currency => (
                  <tr key={currency.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-800">{currency.name}</td>
                    <td className="p-3 font-mono text-gray-700">{currency.iso_code}</td>
                    <td className="p-3 text-gray-700">{currency.symbol}</td>
                    <td className="p-3 text-right font-mono">
                      {editingId === currency.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.000001"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="w-28 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => saveRate(currency)}
                            className="text-emerald-600 hover:text-emerald-700 p-1"
                            title="Save"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="text-red-500 hover:text-red-600 p-1"
                            title="Cancel"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ) : (
                        <span>{currency.exchange_rate_to_rwf.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {currency.is_base ? (
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">Base</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-600">{currency.region || '—'}</td>
                    <td className="p-3 text-center">
                      {!currency.is_base && (
                        <button
                          onClick={() => startEditing(currency)}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          <i className="fas fa-edit mr-1"></i>Override
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="p-6 text-center text-gray-500">No currencies configured.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
            Rates are automatically updated via ExchangeRate-API. Manual overrides persist until the next sync.
          </div>
        </div>
      )}

      {/* Revenue summary by currency */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue Summary</h3>
        <p className="text-sm text-gray-500">
          Revenue reports will display in both <strong>RWF (base)</strong> and the transaction's original currency.
          This feature is available once payments are processed in multiple currencies.
        </p>
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <i className="fas fa-info-circle mr-2"></i>
            All base pricing is configured in RWF. Prices are converted to the user's preferred currency at checkout using the current exchange rate.
          </p>
        </div>
      </div>
    </div>
  );
}
