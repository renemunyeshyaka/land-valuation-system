import React, { useEffect, useState } from 'react';

interface ExchangeRateData {
  usd_to_rwf: number;
  rwf_to_usd: number;
  timestamp: string;
  formatted: {
    usd_to_rwf: string;
    rwf_to_usd: string;
  };
}

interface ExchangeRateDisplayProps {
  showConverter?: boolean;
  className?: string;
}

const ExchangeRateDisplay: React.FC<ExchangeRateDisplayProps> = ({
  showConverter = false,
  className = '',
}) => {
  const [rateData, setRateData] = useState<ExchangeRateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Converter state
  const [amount, setAmount] = useState<string>('100');
  const [fromCurrency, setFromCurrency] = useState<'USD' | 'RWF'>('USD');
  const [toCurrency, setToCurrency] = useState<'USD' | 'RWF'>('RWF');
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);

  // Fetch current exchange rate
  const fetchExchangeRate = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/v1/exchange-rate');
      const result = await response.json();

      if (result.success) {
        setRateData(result.data);
        setLastUpdated(new Date().toLocaleString());
        setError(null);
      } else {
        setError('Failed to fetch exchange rate');
      }
    } catch (err) {
      setError('Unable to connect to server');
      console.error('Exchange rate fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Convert currency
  const convertCurrency = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:5000/api/v1/exchange-rate/convert?amount=${amount}&from=${fromCurrency}&to=${toCurrency}`
      );
      const result = await response.json();

      if (result.success) {
        setConvertedAmount(result.data.to_amount);
      }
    } catch (err) {
      console.error('Conversion error:', err);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
    // Refresh rate every 30 minutes
    const interval = setInterval(fetchExchangeRate, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showConverter && amount) {
      convertCurrency();
    }
  }, [amount, fromCurrency, toCurrency]);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-600 text-sm">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </p>
        <button
          onClick={fetchExchangeRate}
          className="text-red-600 text-sm underline mt-2"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!rateData) {
    return null;
  }

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  return (
    <div className={`bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg shadow-sm p-4 border border-emerald-100 ${className}`}>
      {/* Exchange Rate Display */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <i className="fas fa-exchange-alt text-emerald-600"></i>
          <h3 className="font-semibold text-gray-800">Live Exchange Rate</h3>
        </div>
        <button
          onClick={fetchExchangeRate}
          className="text-emerald-600 hover:text-emerald-700 transition-colors"
          title="Refresh rate"
        >
          <i className="fas fa-sync-alt text-sm"></i>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="bg-white rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-gray-500 mb-1">USD → RWF</p>
          <p className="text-lg font-bold text-emerald-700">
            {rateData.usd_to_rwf.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-emerald-100">
          <p className="text-xs text-gray-500 mb-1">RWF → USD</p>
          <p className="text-lg font-bold text-emerald-700">
            {rateData.rwf_to_usd.toFixed(6)}
          </p>
        </div>
      </div>

      <p className="text-xs text-gray-500 flex items-center gap-1">
        <i className="fas fa-clock"></i>
        Updated: {lastUpdated}
      </p>

      {/* Currency Converter */}
      {showConverter && (
        <div className="mt-4 pt-4 border-t border-emerald-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Converter</h4>

          <div className="space-y-3">
            {/* From Currency */}
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={fromCurrency}
                  onChange={(e) => setFromCurrency(e.target.value as 'USD' | 'RWF')}
                  className="text-sm font-semibold text-gray-700 bg-transparent border-none focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="RWF">RWF</option>
                </select>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-xl font-bold text-gray-800 bg-transparent border-none focus:outline-none"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            {/* Swap Button */}
            <div className="flex justify-center">
              <button
                onClick={swapCurrencies}
                className="w-10 h-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors shadow-md"
              >
                <i className="fas fa-exchange-alt"></i>
              </button>
            </div>

            {/* To Currency */}
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={toCurrency}
                  onChange={(e) => setToCurrency(e.target.value as 'USD' | 'RWF')}
                  className="text-sm font-semibold text-gray-700 bg-transparent border-none focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="RWF">RWF</option>
                </select>
              </div>
              <p className="text-xl font-bold text-emerald-700">
                {convertedAmount !== null
                  ? convertedAmount.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '0.00'}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3 text-center">
            <i className="fas fa-info-circle"></i> Rates update every 6 hours
          </p>
        </div>
      )}
    </div>
  );
};

export default ExchangeRateDisplay;
