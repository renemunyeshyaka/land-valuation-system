 

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MarketplaceManagement = () => {
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editListing, setEditListing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

  // Fetch listings
  const fetchListings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/marketplace/properties-for-sale`, { withCredentials: true });
      let listingsData = res.data.data || res.data.listings || [];
      if (!Array.isArray(listingsData)) {
        listingsData = [];
      }
      setListings(listingsData);
    } catch (err) {
      setError('Failed to fetch listings');
      setListings([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, []);

  // Add listing (creates a property)
  const onAdd = async (data: any) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/properties`, data, { withCredentials: true });
      setShowAdd(false);
      fetchListings();
    } catch (err) {
      setError('Failed to add listing');
    }
  };

  // Edit listing (updates a property)
  const onEdit = async (data: any) => {
    if (!editListing) return;
    try {
      await axios.put(`${API_BASE_URL}/api/v1/properties/${editListing.id}`, data, { withCredentials: true });
      setShowEdit(false);
      setEditListing(null);
      fetchListings();
    } catch (err) {
      setError('Failed to edit listing');
    }
  };

  // Remove listing (deletes a property)
  const onDelete = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/properties/${id}`, { withCredentials: true });
      setDeleteId(null);
      fetchListings();
    } catch (err) {
      setError('Failed to delete listing');
    }
  };
  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>Marketplace Management</h2>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Add Listing</button>
        <button disabled style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Edit Listing (select row)</button>
        <button disabled style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Remove Listing (select row)</button>
      </div>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search listings by title or status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={() => fetchListings()}
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
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        {loading ? (
          <p>Loading listings...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Title</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Location</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Type</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Status</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.filter(listing => {
                const q = search.toLowerCase();
                return (
                  (listing.title || '').toLowerCase().includes(q) ||
                  (listing.location || '').toLowerCase().includes(q) ||
                  (listing.type || '').toLowerCase().includes(q) ||
                  (listing.status || '').toLowerCase().includes(q)
                );
              }).map(listing => (
                <tr key={listing.id}>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{listing.title || '-'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{listing.location || '-'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{listing.type || '-'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{listing.status || '-'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>
                    <button onClick={() => { setEditListing(listing); setShowEdit(true); }} style={{ marginRight: 8, background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => setDeleteId(listing.id)} style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Listing Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={e => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            onAdd({
              title: (form.elements.namedItem('title') as HTMLInputElement).value,
              location: (form.elements.namedItem('location') as HTMLInputElement).value,
              type: (form.elements.namedItem('type') as HTMLInputElement).value,
              status: (form.elements.namedItem('status') as HTMLInputElement).value
            });
          }} style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Add Listing</h3>
            <input name="title" placeholder="Title" style={{ width: '100%', marginBottom: 12, padding: 8 }} required />
            <input name="location" placeholder="Location" style={{ width: '100%', marginBottom: 12, padding: 8 }} required />
            <input name="type" placeholder="Type" style={{ width: '100%', marginBottom: 12, padding: 8 }} required />
            <input name="status" placeholder="Status" style={{ width: '100%', marginBottom: 12, padding: 8 }} required />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Add</button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Listing Modal */}
      {showEdit && editListing && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={e => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            onEdit({
              title: (form.elements.namedItem('title') as HTMLInputElement).value,
              location: (form.elements.namedItem('location') as HTMLInputElement).value,
              type: (form.elements.namedItem('type') as HTMLInputElement).value,
              status: (form.elements.namedItem('status') as HTMLInputElement).value
            });
          }} style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Edit Listing</h3>
            <input name="title" defaultValue={editListing.title} placeholder="Title" style={{ width: '100%', marginBottom: 12, padding: 8 }} required />
            <input name="location" defaultValue={editListing.location} placeholder="Location" style={{ width: '100%', marginBottom: 12, padding: 8 }} required />
            <input name="type" defaultValue={editListing.type} placeholder="Type" style={{ width: '100%', marginBottom: 12, padding: 8 }} required />
            <input name="status" defaultValue={editListing.status} placeholder="Status" style={{ width: '100%', marginBottom: 12, padding: 8 }} required />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Save</button>
              <button type="button" onClick={() => { setShowEdit(false); setEditListing(null); }} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Listing Confirmation */}
      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Delete Listing</h3>
            <p>Are you sure you want to delete this listing?</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={() => onDelete(deleteId)} style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setDeleteId(null)} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceManagement;
