import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { resolveImageUrl } from '../../utils/image';
import adminHierarchyRaw from '../../data/land_admin_hierarchy_from_csv.json';
import { useSession } from 'next-auth/react';
import { refreshAccessToken } from '../../utils/tokenRefresh';

type AdminHierarchy = {
  [province: string]: {
    [district: string]: {
      [sector: string]: {
        [cell: string]: string[];
      };
    };
  };
};

type AdminEditPropertyForm = {
  title: string;
  description: string;
  property_type: string;
  status: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  latitude: string;
  longitude: string;
};

const PropertyListings: React.FC = () => {
  const adminHierarchy: AdminHierarchy = adminHierarchyRaw as AdminHierarchy;
  const provinceNames = Object.keys(adminHierarchy);
  const [search, setSearch] = useState('');
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editListing, setEditListing] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryTitle, setGalleryTitle] = useState('Property Images');
  const [editForm, setEditForm] = useState<AdminEditPropertyForm>({
    title: '',
    description: '',
    property_type: '',
    status: 'available',
    province: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    latitude: '',
    longitude: '',
  });
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  const { data: session } = useSession();

  const getAuthToken = () => {
    if (session && (session as any).accessToken) return (session as any).accessToken as string;
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) return token;
    }
    return null;
  };

  const getAuthConfig = () => {
    const token = getAuthToken();
    return {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };
  };

  const getPrimaryImage = (listing: any): string | null => {
    if (Array.isArray(listing?.images) && listing.images.length > 0 && listing.images[0]) {
      return resolveImageUrl(listing.images[0]);
    }
    if (typeof listing?.images === 'string' && listing.images) {
      return resolveImageUrl(listing.images);
    }
    if (typeof listing?.image === 'string' && listing.image) {
      return resolveImageUrl(listing.image);
    }
    return null;
  };

  const getGalleryImages = (listing: any): string[] => {
    if (Array.isArray(listing?.images)) {
      return listing.images
        .filter(Boolean)
        .map((img: string) => resolveImageUrl(img))
        .filter(Boolean);
    }
    if (typeof listing?.images === 'string' && listing.images) {
      return [resolveImageUrl(listing.images)].filter(Boolean);
    }
    if (typeof listing?.image === 'string' && listing.image) {
      return [resolveImageUrl(listing.image)].filter(Boolean);
    }
    return [];
  };

  const openGallery = (listing: any) => {
    const images = getGalleryImages(listing);
    if (images.length === 0) {
      return;
    }
    setGalleryImages(images);
    setGalleryIndex(0);
    setGalleryTitle(listing?.title || 'Property Images');
    setShowGallery(true);
  };

  const getGoogleMapsLink = (listing: any): string | null => {
    const lat = Number(listing?.latitude);
    const lng = Number(listing?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }

    const addressParts = [listing?.address, listing?.sector, listing?.district].filter(Boolean);
    if (addressParts.length > 0) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressParts.join(', '))}`;
    }

    return null;
  };

  const getLocationText = (listing: any): string => {
    const addressParts = [listing?.address, listing?.sector, listing?.district].filter(Boolean);
    if (addressParts.length > 0) {
      return addressParts.join(', ');
    }
    return listing?.location || '-';
  };

  const districtNames = editForm.province ? Object.keys(adminHierarchy[editForm.province] || {}) : [];
  const sectorNames = editForm.province && editForm.district ? Object.keys((adminHierarchy[editForm.province] || {})[editForm.district] || {}) : [];
  const cellNames = editForm.province && editForm.district && editForm.sector ? Object.keys(((adminHierarchy[editForm.province] || {})[editForm.district] || {})[editForm.sector] || {}) : [];
  const villageNames = editForm.province && editForm.district && editForm.sector && editForm.cell ? (((adminHierarchy[editForm.province] || {})[editForm.district] || {})[editForm.sector] || {})[editForm.cell] || [] : [];

  const openEditModal = (listing: any) => {
    setEditListing(listing);
    setEditForm({
      title: listing?.title || '',
      description: listing?.description || '',
      property_type: listing?.property_type || listing?.type || '',
      status: listing?.status || 'available',
      province: listing?.province || '',
      district: listing?.district || '',
      sector: listing?.sector || '',
      cell: listing?.cell || '',
      village: listing?.village || '',
      latitude: listing?.latitude != null ? String(listing.latitude) : '',
      longitude: listing?.longitude != null ? String(listing.longitude) : '',
    });
    setShowEdit(true);
  };

  const handleEditFormChange = (name: keyof AdminEditPropertyForm, value: string) => {
    if (name === 'province') {
      setEditForm((prev) => ({ ...prev, province: value, district: '', sector: '', cell: '', village: '' }));
      return;
    }
    if (name === 'district') {
      setEditForm((prev) => ({ ...prev, district: value, sector: '', cell: '', village: '' }));
      return;
    }
    if (name === 'sector') {
      setEditForm((prev) => ({ ...prev, sector: value, cell: '', village: '' }));
      return;
    }
    if (name === 'cell') {
      setEditForm((prev) => ({ ...prev, cell: value, village: '' }));
      return;
    }
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch listings
  const fetchListings = async (allowRetry = true) => {
    setLoading(true);
    setError(null);
    try {
      let token = getAuthToken();
      if (!token) {
        const refreshed = await refreshAccessToken();
        if (refreshed) token = getAuthToken();
      }
      if (!token) {
        setListings([]);
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_BASE_URL}/api/v1/properties`, getAuthConfig());
      let listingsArr = res.data?.data?.data || res.data?.properties || res.data?.data || [];
      if (!Array.isArray(listingsArr)) listingsArr = [];
      setListings(listingsArr);
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await fetchListings(false);
          return;
        }
      }
      setListings([]);
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to fetch properties');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchListings();
  }, [session]);

  // Add property
  const onAdd = async (data: any, allowRetry = true) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/properties`, data, getAuthConfig());
      setShowAdd(false);
      fetchListings();
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await onAdd(data, false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to add property');
    }
  };

  // Edit property
  const onEdit = async (data: any, allowRetry = true) => {
    if (!editListing) return;
    try {
      await axios.put(`${API_BASE_URL}/api/v1/properties/${editListing.id}`, data, getAuthConfig());
      setShowEdit(false);
      setEditListing(null);
      fetchListings();
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await onEdit(data, false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to edit property');
    }
  };

  // Remove property
  const onDelete = async (id: string, allowRetry = true) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/properties/${id}`, getAuthConfig());
      setDeleteId(null);
      fetchListings();
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await onDelete(id, false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to delete property');
    }
  };
  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>Property Listings</h2>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Add Property</button>
        <button disabled style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Edit Property (select row)</button>
        <button disabled style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Remove Property (select row)</button>
      </div>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by location, type, or status..."
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
          <p>Loading properties...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Image</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Title</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Location</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Type</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Status</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Map</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.filter(listing => {
                const q = search.toLowerCase();
                return (
                  (listing.title || '').toLowerCase().includes(q) ||
                  getLocationText(listing).toLowerCase().includes(q) ||
                  (listing.property_type || listing.type || '').toLowerCase().includes(q) ||
                  (listing.status || '').toLowerCase().includes(q)
                );
              }).map(listing => (
                <tr key={listing.id}>
                  <td style={{ padding: 8, border: '1px solid #eee', textAlign: 'center' }}>
                    {getPrimaryImage(listing) ? (
                      <button
                        type="button"
                        onClick={() => openGallery(listing)}
                        style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' }}
                        title="View all images"
                      >
                        <img
                          src={getPrimaryImage(listing) as string}
                          alt={listing.title || 'Property image'}
                          style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </button>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>No image</span>
                    )}
                  </td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{listing.title || '-'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{getLocationText(listing)}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{listing.property_type || listing.type || '-'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{listing.status || '-'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee', textAlign: 'center' }}>
                    {getGoogleMapsLink(listing) ? (
                      <a
                        href={getGoogleMapsLink(listing) as string}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                      >
                        Open Map
                      </a>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>N/A</span>
                    )}
                  </td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>
                    <button onClick={() => openEditModal(listing)} style={{ marginRight: 8, background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => setDeleteId(listing.id)} style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Property Modal */}
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
            <h3 style={{ marginBottom: 16 }}>Add Property</h3>
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

      {/* Edit Property Modal */}
      {showEdit && editListing && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={e => {
            e.preventDefault();
            onEdit({
              title: editForm.title,
              description: editForm.description,
              property_type: editForm.property_type,
              status: editForm.status,
              province: editForm.province,
              district: editForm.district,
              sector: editForm.sector,
              cell: editForm.cell,
              village: editForm.village,
              latitude: editForm.latitude !== '' ? Number(editForm.latitude) : undefined,
              longitude: editForm.longitude !== '' ? Number(editForm.longitude) : undefined,
            });
          }} style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Edit Property</h3>
            <input
              name="title"
              value={editForm.title}
              onChange={(e) => handleEditFormChange('title', e.target.value)}
              placeholder="Title"
              style={{ width: '100%', marginBottom: 12, padding: 8 }}
              required
            />
            <textarea
              name="description"
              value={editForm.description}
              onChange={(e) => handleEditFormChange('description', e.target.value)}
              placeholder="Description"
              style={{ width: '100%', marginBottom: 12, padding: 8 }}
              rows={3}
            />
            <input
              name="property_type"
              value={editForm.property_type}
              onChange={(e) => handleEditFormChange('property_type', e.target.value)}
              placeholder="Type"
              style={{ width: '100%', marginBottom: 12, padding: 8 }}
              required
            />
            <select
              name="province"
              value={editForm.province}
              onChange={(e) => handleEditFormChange('province', e.target.value)}
              style={{ width: '100%', marginBottom: 12, padding: 8 }}
            >
              <option value="">Select Province</option>
              {provinceNames.map((province) => (
                <option key={province} value={province}>{province}</option>
              ))}
            </select>
            <select
              name="district"
              value={editForm.district}
              onChange={(e) => handleEditFormChange('district', e.target.value)}
              disabled={!editForm.province}
              style={{ width: '100%', marginBottom: 12, padding: 8 }}
            >
              <option value="">Select District</option>
              {districtNames.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
            <select
              name="sector"
              value={editForm.sector}
              onChange={(e) => handleEditFormChange('sector', e.target.value)}
              disabled={!editForm.district}
              style={{ width: '100%', marginBottom: 12, padding: 8 }}
            >
              <option value="">Select Sector</option>
              {sectorNames.map((sector) => (
                <option key={sector} value={sector}>{sector}</option>
              ))}
            </select>
            <select
              name="cell"
              value={editForm.cell}
              onChange={(e) => handleEditFormChange('cell', e.target.value)}
              disabled={!editForm.sector}
              style={{ width: '100%', marginBottom: 12, padding: 8 }}
            >
              <option value="">Select Cell</option>
              {cellNames.map((cell) => (
                <option key={cell} value={cell}>{cell}</option>
              ))}
            </select>
            <select
              name="village"
              value={editForm.village}
              onChange={(e) => handleEditFormChange('village', e.target.value)}
              disabled={!editForm.cell}
              style={{ width: '100%', marginBottom: 12, padding: 8 }}
            >
              <option value="">Select Village</option>
              {villageNames.map((village) => (
                <option key={village} value={village}>{village}</option>
              ))}
            </select>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <input
                name="latitude"
                value={editForm.latitude}
                onChange={(e) => handleEditFormChange('latitude', e.target.value)}
                placeholder="Latitude"
                style={{ width: '100%', padding: 8 }}
              />
              <input
                name="longitude"
                value={editForm.longitude}
                onChange={(e) => handleEditFormChange('longitude', e.target.value)}
                placeholder="Longitude"
                style={{ width: '100%', padding: 8 }}
              />
            </div>
            <input
              name="status"
              value={editForm.status}
              onChange={(e) => handleEditFormChange('status', e.target.value)}
              placeholder="Status"
              style={{ width: '100%', marginBottom: 12, padding: 8 }}
              required
            />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Save</button>
              <button type="button" onClick={() => { setShowEdit(false); setEditListing(null); }} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Property Confirmation */}
      {deleteId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Delete Property</h3>
            <p>Are you sure you want to delete this property?</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={() => onDelete(deleteId)} style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setDeleteId(null)} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {showGallery && galleryImages.length > 0 && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000b', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 'min(900px, 95vw)', maxHeight: '92vh', overflow: 'auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>{galleryTitle}</h3>
              <button onClick={() => setShowGallery(false)} style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '0.4rem 0.8rem', cursor: 'pointer' }}>Close</button>
            </div>

            <div style={{ background: '#f3f4f6', borderRadius: 10, padding: 8 }}>
              <img src={galleryImages[galleryIndex]} alt={`Image ${galleryIndex + 1}`} style={{ width: '100%', maxHeight: '62vh', objectFit: 'contain', borderRadius: 8 }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <button
                onClick={() => setGalleryIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
                disabled={galleryImages.length <= 1}
                style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: galleryImages.length > 1 ? 'pointer' : 'not-allowed', opacity: galleryImages.length > 1 ? 1 : 0.6 }}
              >
                Previous
              </button>
              <span style={{ fontSize: 14, color: '#374151' }}>{galleryIndex + 1} / {galleryImages.length}</span>
              <button
                onClick={() => setGalleryIndex((prev) => (prev + 1) % galleryImages.length)}
                disabled={galleryImages.length <= 1}
                style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', cursor: galleryImages.length > 1 ? 'pointer' : 'not-allowed', opacity: galleryImages.length > 1 ? 1 : 0.6 }}
              >
                Next
              </button>
            </div>

            {galleryImages.length > 1 && (
              <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
                {galleryImages.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    type="button"
                    onClick={() => setGalleryIndex(idx)}
                    style={{ border: idx === galleryIndex ? '2px solid #2d6a4f' : '1px solid #d1d5db', borderRadius: 8, padding: 0, background: 'transparent', cursor: 'pointer' }}
                  >
                    <img src={img} alt={`Thumb ${idx + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyListings;
