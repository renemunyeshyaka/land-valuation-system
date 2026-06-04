import React, { useState, useEffect } from 'react';
import { Currency, getCurrencies, getPreferredCurrency, setPreferredCurrency, getCurrencySymbol, formatCurrency } from '../utils/currency';

interface CurrencySelectorProps {
  compact?: boolean;
  onCurrencyChange?: (code: string) => void;
  token?: string;
}

export default function CurrencySelector({ compact = false, onCurrencyChange, token }: CurrencySelectorProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selected, setSelected] = useState<string>('RWF');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getCurrencies(token);
      setCurrencies(data);
      const preferred = getPreferredCurrency();
      if (data.some(c => c.iso_code === preferred)) {
        setSelected(preferred);
      }
    }
    load();
  }, [token]);

  const handleSelect = (code: string) => {
    setSelected(code);
    setPreferredCurrency(code);
    setOpen(false);
    onCurrencyChange?.(code);
  };

  const selectedCurrency = currencies.find(c => c.iso_code === selected);

  if (compact) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          aria-label="Select currency"
        >
          <span>{selectedCurrency?.symbol || getCurrencySymbol(selected)}</span>
          <span className="hidden sm:inline">{selected}</span>
          <i className={`fas fa-chevron-down text-[8px] transition-transform ${open ? 'rotate-180' : ''}`}></i>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[120px] py-1">
              {currencies.filter(c => c.is_active).map(currency => (
                <button
                  key={currency.iso_code}
                  type="button"
                  onClick={() => handleSelect(currency.iso_code)}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center justify-between gap-2 ${
                    selected === currency.iso_code ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                  }`}
                >
                  <span>{currency.iso_code}</span>
                  <span className="text-gray-400">{currency.symbol}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 font-medium">Currency:</label>
      <div className="relative">
        <select
          value={selected}
          onChange={(e) => handleSelect(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          {currencies.filter(c => c.is_active).map(currency => (
            <option key={currency.iso_code} value={currency.iso_code}>
              {currency.iso_code} ({currency.symbol}) — {currency.name}
            </option>
          ))}
        </select>
      </div>
      {selectedCurrency && !selectedCurrency.is_base && (
        <span className="text-[10px] text-gray-400">
          1 {selected} = {formatCurrency(selectedCurrency.exchange_rate_to_rwf, 'RWF')}
        </span>
      )}
    </div>
  );
}
