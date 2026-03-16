

import React, { useState } from 'react';

interface EstimateResult {
  parcel?: Record<string, any>;
  considerations?: Record<string, boolean>;
  price?: number;
  price_type?: string;
}


const SearchResults = () => {
  const [upi, setUpi] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/v1/search-upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ upi }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Error searching for UPI.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Search Land Parcel by UPI</h1>
        <form onSubmit={handleSearch} className="flex flex-col gap-4 mb-8">
          <input
            type="text"
            name="upi"
            placeholder="Enter full UPI code (e.g. 1/01/01/01/1234)"
            value={upi}
            onChange={e => setUpi(e.target.value)}
            required
            className="px-4 py-3 border border-gray-300 rounded-lg text-lg"
          />
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg text-lg transition-colors disabled:opacity-50"
            disabled={loading || !upi}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded mb-4 text-center">{error}</div>
        )}
        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-2">UPI Details</h2>
            <pre className="bg-gray-100 rounded p-2 text-sm overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
