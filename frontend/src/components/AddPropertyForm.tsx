import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import adminHierarchyRaw from '../data/land_admin_hierarchy_from_csv.json';

interface PropertyFormData {
  title: string;
  description: string;
  propertyType: string;
  visibility: 'public' | 'registered' | 'only_me';
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  address: string;
  latitude: string;
  longitude: string;
  landSize: string;
  sizeUnit: string;
  price: string;
  parcelId: string;
  gazetteReference: string;
  features: string[];
}

interface AddPropertyFormProps {
  onSubmit?: (data: PropertyFormData, images: File[], documents: File[]) => Promise<void>;
  isAdmin?: boolean;
}

export default function AddPropertyForm({ onSubmit, isAdmin = false }: AddPropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentStep, setCurrentStep] = useState(1);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Cascading location hierarchy
  type AdminHierarchy = {
    [province: string]: {
      [district: string]: {
        [sector: string]: {
          [cell: string]: string[];
        };
      };
    };
  };
  const adminHierarchy: AdminHierarchy = adminHierarchyRaw as AdminHierarchy;
  const provinceNames = Object.keys(adminHierarchy);

  const [formData, setFormData] = useState<PropertyFormData>({
    title: 'Residential Land',
    description: '',
    propertyType: 'residential',
    visibility: 'public',
    province: '',
    district: '',
    sector: '',
    cell: '',
    village: '',
    address: '',
    latitude: '',
    longitude: '',
    landSize: '',
    sizeUnit: 'sqm',
    price: '',
    parcelId: '',
    gazetteReference: '',
    features: []
  });

  const [images, setImages] = useState<File[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // File validation constants
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
  const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
  const MAX_IMAGES = 5;
  const MAX_DOCUMENTS = 5;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
  const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];

  // Helper function to validate file type
  const isValidImageType = (file: File): boolean => {
    return ALLOWED_IMAGE_TYPES.includes(file.type);
  };

  const isValidDocumentType = (file: File): boolean => {
    return ALLOWED_DOCUMENT_TYPES.includes(file.type);
  };

  const isBlockedMediaType = (file: File): boolean => {
    return file.type.startsWith('audio/') || file.type.startsWith('video/');
  };

  const formatFileSize = (bytes: number): string => {
    return (bytes / (1024 * 1024)).toFixed(2);
  };

  // Cascading options derived from selected values
  const districtNames = formData.province ? Object.keys(adminHierarchy[formData.province] || {}) : [];
  const sectorNames = formData.province && formData.district ? Object.keys((adminHierarchy[formData.province] || {})[formData.district] || {}) : [];
  const cellNames = formData.province && formData.district && formData.sector ? Object.keys(((adminHierarchy[formData.province] || {})[formData.district] || {})[formData.sector] || {}) : [];
  const villageNames = formData.province && formData.district && formData.sector && formData.cell ? (((adminHierarchy[formData.province] || {})[formData.district] || {})[formData.sector] || {})[formData.cell] || [] : [];

  const propertyTypes = [
    { value: 'residential', label: 'Residential Land' },
    { value: 'commercial', label: 'Commercial Land' },
    { value: 'agricultural', label: 'Agricultural Land' },
    { value: 'industrial', label: 'Industrial Land' },
    { value: 'mixed', label: 'Mixed Use' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'propertyType') {
      const selected = propertyTypes.find((type) => type.value === value);
      setFormData((prev) => ({
        ...prev,
        propertyType: value,
        title: selected ? selected.label : prev.title,
      }));
      return;
    }

    // Cascade reset downstream location fields
    if (name === 'province') {
      setFormData(prev => ({ ...prev, province: value, district: '', sector: '', cell: '', village: '' }));
      return;
    }
    if (name === 'district') {
      setFormData(prev => ({ ...prev, district: value, sector: '', cell: '', village: '' }));
      return;
    }
    if (name === 'sector') {
      setFormData(prev => ({ ...prev, sector: value, cell: '', village: '' }));
      return;
    }
    if (name === 'cell') {
      setFormData(prev => ({ ...prev, cell: value, village: '' }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      let validFiles: File[] = [];
      let totalSize = images.reduce((sum, f) => sum + f.size, 0);

      for (const file of files) {
        // Check for blocked media types first
        if (isBlockedMediaType(file)) {
          toast.error(`${file.name}: Audio and video files are not allowed`);
          continue;
        }

        // Check file type
        if (!isValidImageType(file)) {
          toast.error(`${file.name}: Invalid image format. Only JPG, PNG, GIF allowed`);
          continue;
        }

        // Check individual file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: Exceeds 2 MB limit (${formatFileSize(file.size)} MB)`);
          continue;
        }

        // Check total upload size
        if (totalSize + file.size > MAX_UPLOAD_SIZE) {
          toast.error(`Adding ${file.name} would exceed 10 MB total upload limit`);
          continue;
        }

        validFiles.push(file);
        totalSize += file.size;
      }

      // Check image count
      if (images.length + validFiles.length > MAX_IMAGES) {
        toast.error(`Maximum ${MAX_IMAGES} images allowed (you already have ${images.length})`);
        validFiles = validFiles.slice(0, MAX_IMAGES - images.length);
      }

      if (validFiles.length === 0) return;

      setImages(prev => [...prev, ...validFiles]);

      // Create previews
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });

      if (validFiles.length > 0) {
        toast.success(`${validFiles.length} image(s) added successfully`);
      }
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      let validFiles: File[] = [];
      let totalSize = documents.reduce((sum, f) => sum + f.size, 0);

      for (const file of files) {
        // Check for blocked media types first
        if (isBlockedMediaType(file)) {
          toast.error(`${file.name}: Audio and video files are not allowed`);
          continue;
        }

        // Check file type
        if (!isValidDocumentType(file)) {
          toast.error(`${file.name}: Only PDF documents are allowed`);
          continue;
        }

        // Check individual file size
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`${file.name}: Exceeds 2 MB limit (${formatFileSize(file.size)} MB)`);
          continue;
        }

        // Check total upload size
        if (totalSize + file.size > MAX_UPLOAD_SIZE) {
          toast.error(`Adding ${file.name} would exceed 10 MB total upload limit`);
          continue;
        }

        validFiles.push(file);
        totalSize += file.size;
      }

      // Check document count
      if (documents.length + validFiles.length > MAX_DOCUMENTS) {
        toast.error(`Maximum ${MAX_DOCUMENTS} documents allowed (you already have ${documents.length})`);
        validFiles = validFiles.slice(0, MAX_DOCUMENTS - documents.length);
      }

      if (validFiles.length === 0) return;

      setDocuments(prev => [...prev, ...validFiles]);

      if (validFiles.length > 0) {
        toast.success(`${validFiles.length} document(s) added successfully`);
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

     // Function to upload a single image
     const uploadImage = async (file: File, accessToken: string): Promise<string> => {
       const formData = new FormData();
       formData.append('image', file);
     
       const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/files/upload-image`, {
         method: 'POST',
         headers: {
           Authorization: `Bearer ${accessToken}`,
         },
         body: formData,
       });
     
       if (!response.ok) {
         const errorData = await response.json().catch(() => ({}));
         throw new Error(errorData?.error || 'Failed to upload image');
       }
     
       const data = await response.json();
       return data.data?.url || '';
     };

    try {
      if (onSubmit) {
        await onSubmit(formData, images, documents);
        setSuccess('Property added successfully!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        // Default API call
        const accessToken = localStorage.getItem('access_token');
        if (!accessToken) {
          throw new Error('Please log in first to add a property.');
        }

        const landSize = Number(formData.landSize);
        const price = Number(formData.price);
        const latitude = formData.latitude ? Number(formData.latitude) : 0;
        const longitude = formData.longitude ? Number(formData.longitude) : 0;

        if (!Number.isFinite(landSize) || landSize <= 0) {
          throw new Error('Land size must be a valid number greater than 0.');
        }
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error('Price must be a valid number greater than 0.');
        }

         // Upload images and collect URLs
         let imageUrls: string[] = [];
         if (images.length > 0) {
           toast.loading('Uploading images...');
           for (const image of images) {
             try {
               const url = await uploadImage(image, accessToken);
               if (url) {
                 imageUrls.push(url);
               }
             } catch (err: any) {
               toast.error(`Failed to upload ${image.name}: ${err.message}`);
             }
           }
           toast.dismiss();
         }

        const payload = {
          title: formData.title,
          description: formData.description,
          property_type: formData.propertyType,
          visibility: formData.visibility,
          upi: formData.parcelId,
          province: formData.province,
          district: formData.district,
          sector: formData.sector,
          cell: formData.cell,
          village: formData.village,
          address: formData.address,
          latitude,
          longitude,
          land_size: landSize,
          size_unit: formData.sizeUnit,
          gazette_reference: formData.gazetteReference,
          price,
          currency: 'RWF',
          features: formData.features,
           images: imageUrls,
           documents: [],
        };

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/properties`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let message = 'Failed to add property';
          try {
            const errorData = await response.json();
            message =
              errorData?.error?.details ||
              errorData?.error?.message ||
              errorData?.message ||
              message;
          } catch {
            // Keep fallback message when response body is not JSON.
          }
          throw new Error(message);
        }

        setSuccess('Property added successfully!');
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add property');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude.toString(),
            longitude: position.coords.longitude.toString()
          }));
        },
        (error) => {
          setError('Failed to get location. Please enter coordinates manually.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">
        {isAdmin ? 'Add Property (Admin)' : 'Add Your Property'}
      </h2>

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-500'}`}>
            Basic Info
          </span>
          <span className={`text-sm font-medium ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-500'}`}>
            Location
          </span>
          <span className={`text-sm font-medium ${currentStep >= 3 ? 'text-blue-600' : 'text-gray-500'}`}>
            Documents
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Step 1: Basic Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parcel ID / UPI Number *
              </label>
              <input
                type="text"
                name="parcelId"
                value={formData.parcelId}
                onChange={handleInputChange}
                placeholder="Enter your UPI or Parcel ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Find this on your land title document
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Title *
              </label>
              <select
                name="propertyType"
                value={formData.propertyType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {propertyTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Who Can View This Plot? *
              </label>
              <select
                name="visibility"
                value={formData.visibility}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="public">Public (everyone)</option>
                <option value="registered">Registered users only</option>
                <option value="only_me">Only me</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
                placeholder="Describe your property, its features, and any important details..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Land Size *
                </label>
                <input
                  type="number"
                  name="landSize"
                  value={formData.landSize}
                  onChange={handleInputChange}
                  placeholder="e.g., 500"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit *
                </label>
                <select
                  name="sizeUnit"
                  value={formData.sizeUnit}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="sqm">Square Meters (m²)</option>
                  <option value="hectares">Hectares</option>
                  <option value="acres">Acres</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asking Price (RWF) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                placeholder="e.g., 50000000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gazette Reference (Optional)
              </label>
              <input
                type="text"
                name="gazetteReference"
                value={formData.gazetteReference}
                onChange={handleInputChange}
                placeholder="e.g., RWA/Gaz/2024/001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Next: Location Details →
            </button>
          </div>
        )}

        {/* Step 2: Location & Coordinates */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Step 2: Location & Coordinates</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Province *
                </label>
                <select
                  name="province"
                  value={formData.province}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Province</option>
                  {provinceNames.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  District *
                </label>
                <select
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  disabled={!formData.province}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                  required
                >
                  <option value="">Select District</option>
                  {districtNames.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sector *
                </label>
                <select
                  name="sector"
                  value={formData.sector}
                  onChange={handleInputChange}
                  disabled={!formData.district}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                  required
                >
                  <option value="">Select Sector</option>
                  {sectorNames.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cell *
                </label>
                <select
                  name="cell"
                  value={formData.cell}
                  onChange={handleInputChange}
                  disabled={!formData.sector}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                  required
                >
                  <option value="">Select Cell</option>
                  {cellNames.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Village *
              </label>
              <select
                name="village"
                value={formData.village}
                onChange={handleInputChange}
                disabled={!formData.cell}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
                required
              >
                <option value="">Select Village</option>
                {villageNames.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="e.g., KN 5 Rd, Kigali"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  GPS Coordinates *
                </label>
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  className="text-sm bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
                >
                  📍 Get Current Location
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Latitude
                  </label>
                  <input
                    type="text"
                    name="latitude"
                    value={formData.latitude}
                    onChange={handleInputChange}
                    placeholder="e.g., -1.9441"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Longitude
                  </label>
                  <input
                    type="text"
                    name="longitude"
                    value={formData.longitude}
                    onChange={handleInputChange}
                    placeholder="e.g., 30.0619"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                💡 Tip: You can use Google Maps to find coordinates. Right-click on your property location and copy the coordinates.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Next: Upload Documents →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Documents & Images */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Step 3: Upload Documents & Images</h3>

            {/* Image Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">📷</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Property Images
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Upload photos of your property (Maximum {MAX_IMAGES} images, 2 MB each, 10 MB total. JPG, PNG, GIF only)
                </p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Choose Images
                </button>
              </div>

              {imagePreviews.length > 0 && (
                <div className="mt-6 grid grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <div className="text-4xl mb-4">📄</div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  Title Documents & Certificates
                </h4>
                <p className="text-sm text-gray-600 mb-4">
                  Upload legal documents ({MAX_DOCUMENTS} max, 2 MB each, 10 MB total, PDF only)
                </p>
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => documentInputRef.current?.click()}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Choose Documents
                </button>
              </div>

              {documents.length > 0 && (
                <div className="mt-6 space-y-2">
                  {documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">📎</span>
                        <span className="text-sm text-gray-700">{doc.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>📌 Required Documents:</strong> Land title or ownership certificate.
                <br />
                <strong>📌 Optional:</strong> Survey maps, property tax receipts, gazette references.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:bg-gray-400"
              >
                {loading ? 'Submitting...' : '✓ Submit Property'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
