 

import React, { useState, useEffect } from 'react';

// ErrorBoundary to catch runtime errors in children
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    // Log error to console for debugging
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', padding: 16, background: '#fee', borderRadius: 8 }}>A UI error occurred: {String(this.state.error)}</div>;
    }
    return this.props.children;
  }
}
import axios from 'axios';
import { resolveImageUrl } from '../../utils/image';
import adminHierarchyRaw from '../../data/land_admin_hierarchy_from_csv.json';
import { useSession } from 'next-auth/react';
import { refreshAccessToken } from '../../utils/tokenRefresh';
import AdminEditPropertyModal from './AdminEditPropertyModal';

type AdminHierarchy = {
  [province: string]: {
    [district: string]: {
      [sector: string]: {
        [cell: string]: string[];
      };
    };
  };
};

type MarketplaceEditForm = {
  title: string;
  description: string;
  property_type: string;
  upi: string;
  land_size: string;
  price: string;
  status: string;
  visibility: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  latitude: string;
  longitude: string;
};

const MarketplaceManagement = () => {
  const adminHierarchy: AdminHierarchy = adminHierarchyRaw as AdminHierarchy;
  const provinceNames = Object.keys(adminHierarchy);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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
  const [editForm, setEditForm] = useState<MarketplaceEditForm>({
    title: '',
    description: '',
    property_type: '',
    upi: '',
    land_size: '',
    price: '',
    status: 'available',
    visibility: 'public',
    province: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    latitude: '',
    longitude: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(9);
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
      upi: listing?.upi != null ? String(listing.upi) : '',
      land_size: listing?.land_size != null ? String(listing.land_size) : '',
      price: listing?.price != null ? String(listing.price) : '',
      status: listing?.status || 'available',
      visibility: listing?.visibility || 'public',
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

  const handleEditFormChange = (name: keyof MarketplaceEditForm, value: string) => {
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
  const fetchListings = async (page = currentPage, allowRetry = true) => {
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

      const res = await axios.get(`${API_BASE_URL}/api/v1/admin/properties`, {
        params: {
          page,
          limit,
          search: search || undefined,
          status: statusFilter || undefined,
          visibility: visibilityFilter || undefined,
          property_type: typeFilter || undefined,
        },
        ...getAuthConfig(),
      });
      let listingsData = res.data?.data?.data || res.data?.data || res.data?.listings || [];
      if (!Array.isArray(listingsData)) {
        listingsData = [];
      }
      setListings(listingsData);
      setCurrentPage(Number(res.data?.data?.page || page));
      setTotal(Number(res.data?.data?.total || listingsData.length || 0));
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await fetchListings(page, false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to fetch listings');
      setListings([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchListings(currentPage);
  }, [currentPage, session]);

  useEffect(() => {
    setCurrentPage(1);
    fetchListings(1);
  }, [search, statusFilter, visibilityFilter, typeFilter]);

  // Add listing (creates a property)
  const onAdd = async (data: any, allowRetry = true) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/properties`, data, getAuthConfig());
      setShowAdd(false);
      fetchListings(1);
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await onAdd(data, false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to add listing');
    }
  };

  // Edit listing (updates a property)
  const onEdit = async (data: any, allowRetry = true) => {
    if (!editListing) return;
    try {
      await axios.put(`${API_BASE_URL}/api/v1/properties/${editListing.id}`, data, getAuthConfig());
      setShowEdit(false);
      setEditListing(null);
      fetchListings(currentPage);
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await onEdit(data, false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to edit listing');
    }
  };

  // Remove listing (deletes a property)
  const onDelete = async (id: string, allowRetry = true) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/properties/${id}`, getAuthConfig());
      setDeleteId(null);
      fetchListings(currentPage);
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await onDelete(id, false);
          return;
        }
      }
      setError(err?.response?.data?.error?.message || err?.message || 'Failed to delete listing');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));
  // Extra runtime guards and logging for modal/gallery
  const safeShowEdit = Boolean(showEdit && editListing && editForm && provinceNames && adminHierarchy);
  if (showEdit && (!editListing || !editForm || !provinceNames || !adminHierarchy)) {
    // eslint-disable-next-line no-console
    console.warn('Edit modal render prevented due to missing data:', { showEdit, editListing, editForm, provinceNames, adminHierarchy });
  }
  const safeShowGallery = Boolean(showGallery && Array.isArray(galleryImages) && galleryImages.length > 0 && galleryIndex >= 0 && galleryIndex < galleryImages.length);
  if (showGallery && (!Array.isArray(galleryImages) || galleryImages.length === 0 || galleryIndex < 0 || galleryIndex >= galleryImages.length)) {
    // eslint-disable-next-line no-console
    console.warn('Gallery render prevented due to invalid state:', { showGallery, galleryImages, galleryIndex });
  }

  return (
    <ErrorBoundary>
      <div style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>Marketplace Management</h2>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button onClick={() => setShowAdd(true)} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Add Listing</button>
        <button disabled style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Edit Listing (select row)</button>
        <button disabled style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Remove Listing (select row)</button>
      </div>
      {/* Search + filter controls */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search listings by title or status..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', minWidth: 140 }}
        >
          <option value="">All Statuses</option>
          <option value="available">available</option>
          <option value="pending">pending</option>
          <option value="sold">sold</option>
          <option value="rented">rented</option>
        </select>
        <select
          value={visibilityFilter}
          onChange={e => setVisibilityFilter(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', minWidth: 160 }}
        >
          <option value="">All Visibility</option>
          <option value="public">public</option>
          <option value="registered">registered</option>
          <option value="only_me">only_me</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #ccc', minWidth: 160 }}
        >
          <option value="">All Types</option>
          <option value="residential">residential</option>
          <option value="commercial">commercial</option>
          <option value="agricultural">agricultural</option>
          <option value="industrial">industrial</option>
        </select>
        <button
          onClick={() => fetchListings(1)}
          style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Search
        </button>
        <button
          onClick={() => {
            setSearch('');
            setStatusFilter('');
            setVisibilityFilter('');
            setTypeFilter('');
            setCurrentPage(1);
            fetchListings(1);
          }}
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
          <>
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
                {Array.isArray(listings)
                  ? listings
                      .filter(listing => {
                        const q = search.toLowerCase();
                        const listingStatus = String(listing.status || '').toLowerCase();
                        const listingVisibility = String(listing.visibility || '').toLowerCase();
                        const listingType = String(listing.property_type || listing.type || '').toLowerCase();
                        const matchesStatus = !statusFilter || listingStatus === statusFilter.toLowerCase();
                        const matchesVisibility = !visibilityFilter || listingVisibility === visibilityFilter.toLowerCase();
                        const matchesType = !typeFilter || listingType === typeFilter.toLowerCase();
                        const matchesSearch =
                          (listing.title || '').toLowerCase().includes(q) ||
                          getLocationText(listing).toLowerCase().includes(q) ||
                          (listing.property_type || listing.type || '').toLowerCase().includes(q) ||
                          (listing.status || '').toLowerCase().includes(q);
                        return (
                          matchesStatus &&
                          matchesVisibility &&
                          matchesType &&
                          matchesSearch
                        );
                      })
                      .map(listing => (
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
                      ))
                  : null}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span style={{ fontSize: 14, color: '#666' }}>Page {currentPage} of {totalPages}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  style={{ background: currentPage <= 1 ? '#ddd' : '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
                  let pageNum = idx + 1;
                  if (totalPages > 7 && currentPage > 4) {
                    pageNum = currentPage - 3 + idx;
                    if (pageNum > totalPages) pageNum = totalPages - (6 - idx);
                  }
                  return (
                    <button
                      key={`market-page-${pageNum}`}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{ background: pageNum === currentPage ? '#2d6a4f' : '#f3f4f6', color: pageNum === currentPage ? '#fff' : '#222', border: 'none', borderRadius: 6, padding: '0.45rem 0.8rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  style={{ background: currentPage >= totalPages ? '#ddd' : '#2d6a4f', color: currentPage >= totalPages ? '#666' : '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next
                </button>
              </div>
            </div>
          </>
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
      {safeShowEdit && (
        <AdminEditPropertyModal
          editForm={editForm || { title: '', description: '', property_type: '', upi: '', land_size: '', price: '', status: 'available', visibility: 'public', province: '', district: '', sector: '', cell: '', village: '', latitude: '', longitude: '' }}
          setEditForm={setEditForm}
          onEdit={async (data: {
            images: string[];
            documents: string[];
            newImages: File[];
            newDocuments: File[];
            removedImages: string[];
            removedDocuments: string[];
            [key: string]: any;
          }) => {
            let uploadedImageUrls: string[] = [];
            let uploadedDocUrls: string[] = [];
            const accessToken = getAuthToken();
            const uploadFile = async (file: File, endpoint: string) => {
              if (!file) return '';
              const formData = new FormData();
              const fieldName = endpoint === 'upload-image' ? 'image' : 'document';
              formData.append(fieldName, file);
              const res = await fetch(`${API_BASE_URL}/api/v1/files/${endpoint}`, {
                method: 'POST',
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                body: formData,
              });
              if (res.ok) {
                const json = await res.json();
                return json.image_url || json.url || (json.data?.url ?? '');
              } else {
                const errorText = await res.text();
                // eslint-disable-next-line no-console
                console.error('Upload failed:', errorText);
                throw new Error('Upload failed. ' + errorText);
              }
            };
            try {
              for (const img of data.newImages || []) {
                if (!img) continue;
                const url = await uploadFile(img, 'upload-image');
                if (url) uploadedImageUrls.push(url);
              }
              for (const doc of data.newDocuments || []) {
                if (!doc) continue;
                const url = await uploadFile(doc, 'upload-document');
                if (url) uploadedDocUrls.push(url);
              }
            } catch (err) {
              setError('File upload failed.');
              // eslint-disable-next-line no-console
              console.error('File upload error in AdminEditPropertyModal:', err);
              return;
            }
            const finalImages = [...(data.images || []), ...uploadedImageUrls].filter(img => img && !(data.removedImages || []).includes(img));
            const finalDocs = [...(data.documents || []), ...uploadedDocUrls].filter(doc => doc && !(data.removedDocuments || []).includes(doc));
            const landSizeValue = editForm.land_size ? Number(editForm.land_size) : 0;
            const payload = {
              ...editForm,
              images: finalImages,
              documents: finalDocs,
              land_size: landSizeValue, // use only land_size for area
              price: editForm.price ? Number(editForm.price) : 0,
              latitude: editForm.latitude ? Number(editForm.latitude) : 0,
              longitude: editForm.longitude ? Number(editForm.longitude) : 0,
            };
            // eslint-disable-next-line no-console
            console.log('Submitting edit payload:', payload);
            await onEdit(payload);
          }}
          onClose={() => { setShowEdit(false); setEditListing(null); }}
          provinceNames={provinceNames || []}
          adminHierarchy={adminHierarchy || {}}
          existingImages={Array.isArray(editListing.images) ? editListing.images : (editListing.images ? [editListing.images] : [])}
          existingDocuments={Array.isArray(editListing.documents) ? editListing.documents : (editListing.documents ? [editListing.documents] : [])}
        />
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

      {/* Image Gallery Modal */}
      {safeShowGallery && (
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
    </ErrorBoundary>
  );
};

export default MarketplaceManagement;
