import React, { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../../utils/image';

type Property = {
  id: number;
  owner_id: number;
  title: string;
  description?: string;
  property_type: string;
  district: string;
  sector: string;
  price: number;
  status: string;
  visibility: 'public' | 'registered' | 'only_me';
  created_at: string;
  images?: string[];
};

type EditableProperty = {
  id: number;
  title: string;
  description: string;
  property_type: string;
  price: string;
  status: string;
  visibility: 'public' | 'registered' | 'only_me';
  images: string[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const CARD_PLACEHOLDER = 'https://placehold.co/192x192/e5e7eb/6b7280?text=No+Image';

export default function DashboardPropertiesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditableProperty | null>(null);
  const [editingImages, setEditingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const accessToken = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('access_token');
  }, []);

  const fetchMyProperties = async () => {
    if (!accessToken) {
      router.replace('/auth/login');
      return;
    }

    setLoading(true);
    try {
      const profileRes = await fetch(`${API_BASE_URL}/api/v1/users/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!profileRes.ok) {
        throw new Error('Failed to load profile');
      }

      const profilePayload = await profileRes.json();
      const userId = Number(profilePayload?.data?.id);
      if (!Number.isFinite(userId) || userId <= 0) {
        throw new Error('Invalid user profile');
      }
      setCurrentUserId(userId);

      const propsRes = await fetch(`${API_BASE_URL}/api/v1/properties/my?page=1&limit=200`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!propsRes.ok) {
        throw new Error('Failed to load your properties');
      }

      const propsPayload = await propsRes.json();
      const list: Property[] = Array.isArray(propsPayload?.data?.data)
        ? propsPayload.data.data
        : Array.isArray(propsPayload?.data)
        ? propsPayload.data
        : [];

      setProperties(list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err: any) {
      toast.error(err?.message || 'Could not load your properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMyProperties();
  }, [accessToken]);

  const openEdit = (property: Property) => {
    setEditing({
      id: property.id,
      title: property.title,
      description: property.description || '',
      property_type: property.property_type,
      price: String(property.price),
      status: property.status,
      visibility: property.visibility || 'public',
      images: property.images || [],
    });
    setEditingImages(property.images || []);
    setNewImageFiles([]);
    setNewImagePreviews([]);
  };

  const handleEditImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return;
    }

    const files = Array.from(e.target.files);
    const validFiles: File[] = [];

    const previewPromises = files.map(
      (file) =>
        new Promise<string | null>((resolve) => {
          if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
            toast.error(`${file.name}: invalid image format`);
            resolve(null);
            return;
          }
          if (file.size > 2 * 1024 * 1024) {
            toast.error(`${file.name}: exceeds 2 MB limit`);
            resolve(null);
            return;
          }

          validFiles.push(file);
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || null);
          reader.readAsDataURL(file);
        })
    );

    void Promise.all(previewPromises).then((previewResults) => {
      const previews = previewResults.filter((preview): preview is string => Boolean(preview));
      setNewImageFiles((prev) => [...prev, ...validFiles]);
      setNewImagePreviews((prev) => [...prev, ...previews]);
    });
  };

  const removeExistingImage = (index: number) => {
    setEditingImages((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setNewImagePreviews((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const uploadImage = async (file: File, token: string) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/api/v1/files/upload-image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error || 'Failed to upload image');
    }

    const payload = await response.json();
    return String(payload?.data?.url || '');
  };

  const saveEdit = async () => {
    if (!editing || !accessToken) {
      return;
    }

    const numericPrice = Number(editing.price);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast.error('Price must be a valid number greater than 0.');
      return;
    }

    setSaving(true);
    try {
      let allImages = [...editingImages];

      if (newImageFiles.length > 0) {
        const loadingToast = toast.loading('Uploading images...');
        for (const imageFile of newImageFiles) {
          const imageUrl = await uploadImage(imageFile, accessToken);
          if (imageUrl) {
            allImages.push(imageUrl);
          }
        }
        toast.dismiss(loadingToast);
      }

      const res = await fetch(`${API_BASE_URL}/api/v1/properties/${editing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: editing.title,
          description: editing.description,
          property_type: editing.property_type,
          price: numericPrice,
          status: editing.status,
          visibility: editing.visibility,
          images: allImages,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const details = payload?.error?.details || payload?.error?.message || payload?.message || 'Failed to update property';
        throw new Error(details);
      }

      toast.success('Property updated successfully');
      setEditing(null);
      setEditingImages([]);
      setNewImageFiles([]);
      setNewImagePreviews([]);
      await fetchMyProperties();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update property');
    } finally {
      setSaving(false);
    }
  };

  const deleteProperty = async (propertyId: number) => {
    if (!accessToken) {
      return;
    }

    const confirmed = window.confirm('Delete this property? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    setDeletingId(propertyId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/properties/${propertyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const details = payload?.error?.details || payload?.error?.message || payload?.message || 'Failed to delete property';
        throw new Error(details);
      }

      setProperties((prev) => prev.filter((property) => property.id !== propertyId));
      toast.success('Property deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete property');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Head>
        <title>My Properties | Dashboard</title>
        <meta name="description" content="View, update, and delete your registered properties." />
      </Head>

      <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Registered Properties</h1>
              <p className="text-sm text-gray-600">View, update, or delete your own listings.</p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/properties/add"
                className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors"
              >
                Add New Property
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-600">Loading your properties...</div>
          ) : properties.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-700 mb-4">No registered properties found for your account.</p>
              <Link
                href="/properties/add"
                className="inline-block px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors"
              >
                Register Your First Property
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {properties.map((property) => {
                const thumbnail = resolveImageUrl(property.images?.[0]) || CARD_PLACEHOLDER;
                return (
                  <div key={property.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                        <img
                          src={thumbnail}
                          alt={property.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = CARD_PLACEHOLDER;
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900">{property.title}</h2>
                        <p className="text-sm text-gray-600 mt-1">{property.district}, {property.sector}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Type: {property.property_type} | Status: {property.status} | Visibility: {property.visibility}
                        </p>
                        <p className="text-sm text-gray-800 font-medium mt-1">Price: {Number(property.price).toLocaleString()} RWF</p>
                        <p className="text-xs text-gray-500 mt-2">ID: {property.id} | Owner: {currentUserId ?? property.owner_id}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(property)}
                          className="px-3 py-2 rounded-lg border border-blue-600 text-blue-700 hover:bg-blue-50 transition-colors"
                        >
                          Update
                        </button>
                        <button
                          onClick={() => deleteProperty(property.id)}
                          disabled={deletingId === property.id}
                          className="px-3 py-2 rounded-lg border border-red-600 text-red-700 hover:bg-red-50 disabled:opacity-60 transition-colors"
                        >
                          {deletingId === property.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {editing && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Property #{editing.id}</h3>

              <div className="space-y-3">
                <input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Title"
                />
                <textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Description"
                />
                <input
                  value={editing.property_type}
                  onChange={(e) => setEditing({ ...editing, property_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Property type"
                />
                <input
                  value={editing.price}
                  onChange={(e) => setEditing({ ...editing, price: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Price"
                />
                <select
                  value={editing.status}
                  onChange={(e) => setEditing({ ...editing, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="available">available</option>
                  <option value="pending">pending</option>
                  <option value="sold">sold</option>
                  <option value="rented">rented</option>
                </select>
                <select
                  value={editing.visibility}
                  onChange={(e) => setEditing({ ...editing, visibility: e.target.value as 'public' | 'registered' | 'only_me' })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="public">public</option>
                  <option value="registered">registered users only</option>
                  <option value="only_me">only me</option>
                </select>
              </div>

              <div className="mt-6 border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Property Images</h4>

                <div className="mb-4">
                  <p className="text-xs text-gray-600 mb-2">Current images</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {editingImages.length > 0 ? (
                      editingImages.map((imageUrl, index) => (
                        <div key={`${imageUrl}-${index}`} className="relative group rounded-lg overflow-hidden bg-gray-200 h-24">
                          <img
                            src={resolveImageUrl(imageUrl) || CARD_PLACEHOLDER}
                            alt={`Property image ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = CARD_PLACEHOLDER;
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(index)}
                            className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/70 text-white opacity-0 group-hover:opacity-100 transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 text-center">
                        No saved images yet. A placeholder thumbnail will be shown.
                      </div>
                    )}
                  </div>
                </div>

                {newImagePreviews.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-600 mb-2">New images to upload</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {newImagePreviews.map((previewUrl, index) => (
                        <div key={`${previewUrl}-${index}`} className="relative group rounded-lg overflow-hidden bg-gray-200 h-24 border-2 border-blue-200">
                          <img src={previewUrl} alt={`New image ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeNewImage(index)}
                            className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/70 text-white opacity-0 group-hover:opacity-100 transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="flex items-center justify-center w-full px-3 py-3 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-sm text-gray-600">
                  Add or replace property images
                  <input type="file" multiple accept="image/*" onChange={handleEditImageUpload} className="hidden" />
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}