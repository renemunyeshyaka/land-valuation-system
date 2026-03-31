import React, { useState } from 'react';

const Payments: React.FC = () => {
  const [search, setSearch] = useState('');
  // Placeholder transactions array for demonstration
  const transactions = [];
  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>Payments Monitoring</h2>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>View Transactions</button>
        <button style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Export Report</button>
      </div>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search transactions by user, amount, or status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={() => {}}
          style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Search
        </button>
        <button
          onClick={() => setSearch('')}
          style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>
      <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        {/* Payment summary/table would go here */}
        <p style={{ color: '#888' }}>Payment transactions and summaries will appear here.</p>
      </div>
    </div>
  );
};

export default Payments;
