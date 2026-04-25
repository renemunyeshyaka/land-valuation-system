import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

export type UserEditFormType = {
  id: string;
  title: string;
  description: string;
  property_type: string;
  upi: string;
  land_size: string;
  price: string;
  visibility: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  latitude: string;
  longitude: string;
  address?: string;
  gazette_reference?: string;
};

interface UserEditPropertyModalProps {
  editForm: UserEditFormType;
  setEditForm: React.Dispatch<React.SetStateAction<UserEditFormType>>;
  onEdit: (data: UserEditFormType, images: File[], documents: File[]) => Promise<void>;
  onClose: () => void;
  provinceNames: string[];
  adminHierarchy: any;
  existingImages?: string[];
  existingDocuments?: string[];
}

export default function UserEditPropertyModal({
  editForm,
  setEditForm,
  onEdit,
  onClose,
  provinceNames,
  adminHierarchy,
  existingImages = [],
  existingDocuments = [],
}: UserEditPropertyModalProps) {
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [removedImages, setRemovedImages] = useState<string[]>([]);
  const [removedDocuments, setRemovedDocuments] = useState<string[]>([]);
  const [currentImages, setCurrentImages] = useState<string[]>(existingImages);
  const [currentDocuments, setCurrentDocuments] = useState<string[]>(existingDocuments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentImages(existingImages);
    setCurrentDocuments(existingDocuments);
  }, [existingImages, existingDocuments]);

  const districtNames = editForm.province ? Object.keys(adminHierarchy[editForm.province] || {}) : [];
  const sectorNames = editForm.province && editForm.district ? Object.keys((adminHierarchy[editForm.province] || {})[editForm.district] || {}) : [];
  const cellNames = editForm.province && editForm.district && editForm.sector ? Object.keys(((adminHierarchy[editForm.province] || {})[editForm.district] || {})[editForm.sector] || {}) : [];
  const villageNames = editForm.province && editForm.district && editForm.sector && editForm.cell ? (((adminHierarchy[editForm.province] || {})[editForm.district] || {})[editForm.sector] || {})[editForm.cell] || [] : [];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      let validFiles = files.filter(f => ['image/jpeg', 'image/png', 'image/gif'].includes(f.type) && f.size <= 2 * 1024 * 1024);
      if (images.length + validFiles.length > 5) {
        validFiles = validFiles.slice(0, 5 - images.length);
        toast.error('Maximum 5 images allowed');
      }
      setImages(prev => [...prev, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreviews(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      let validFiles = files.filter(f => f.type === 'application/pdf' && f.size <= 2 * 1024 * 1024);
      if (documents.length + validFiles.length > 5) {
        validFiles = validFiles.slice(0, 5 - documents.length);
        toast.error('Maximum 5 documents allowed');
      }
      setDocuments(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveImage = (img: string, idx: number) => {
    setCurrentImages(prev => prev.filter((_, i) => i !== idx));
    setRemovedImages(prev => [...prev, img]);
  };
  const handleRemoveImagePreview = (idx: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
    setImages(prev => prev.filter((_, i) => i !== idx));
  };
  const handleRemoveDocument = (doc: string, idx: number) => {
    setCurrentDocuments(prev => prev.filter((_, i) => i !== idx));
    setRemovedDocuments(prev => [...prev, doc]);
  };
  const handleRemoveDocumentPreview = (idx: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onEdit(editForm, images, documents);
      toast.success('Property updated successfully!');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update property');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative animate-fade-in">
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
          onClick={onClose}
          aria-label="Close"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <i className="fas fa-edit"></i>
          Edit Property
        </h2>
        <div className="flex gap-2 mb-4">
          <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${step === 1 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`} onClick={() => setStep(1)}>Basic Info</button>
          <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${step === 2 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`} onClick={() => setStep(2)}>Location</button>
          <button className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${step === 3 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`} onClick={() => setStep(3)}>Documents</button>
        </div>
        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <div>
              <input name="upi" value={editForm.upi} onChange={e => setEditForm(f => ({ ...f, upi: e.target.value }))} placeholder="UPI / Parcel ID" className="w-full mb-3 p-2 border rounded" />
              <input name="title" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="w-full mb-3 p-2 border rounded" />
              <textarea name="description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" className="w-full mb-3 p-2 border rounded" rows={3} />
              <input name="property_type" value={editForm.property_type} onChange={e => setEditForm(f => ({ ...f, property_type: e.target.value }))} placeholder="Type" className="w-full mb-3 p-2 border rounded" />
              <select name="visibility" value={editForm.visibility} onChange={e => setEditForm(f => ({ ...f, visibility: e.target.value }))} className="w-full mb-3 p-2 border rounded">
                <option value="public">public</option>
                <option value="registered">registered</option>
                <option value="only_me">only_me</option>
              </select>
              <input name="land_size" type="number" value={editForm.land_size} onChange={e => setEditForm(f => ({ ...f, land_size: e.target.value }))} placeholder="Area (sqm)" className="w-full mb-3 p-2 border rounded" />
              <input name="price" type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} placeholder="Price (RWF)" className="w-full mb-3 p-2 border rounded" />
              <input name="gazette_reference" value={editForm.gazette_reference || ''} onChange={e => setEditForm(f => ({ ...f, gazette_reference: e.target.value }))} placeholder="Gazette Reference" className="w-full mb-3 p-2 border rounded" />
            </div>
          )}
          {step === 2 && (
            <div>
              <select name="province" value={editForm.province} onChange={e => setEditForm(f => ({ ...f, province: e.target.value, district: '', sector: '', cell: '', village: '' }))} className="w-full mb-3 p-2 border rounded">
                <option value="">Select Province</option>
                {provinceNames.map((province) => (<option key={province} value={province}>{province}</option>))}
              </select>
              <select name="district" value={editForm.district} onChange={e => setEditForm(f => ({ ...f, district: e.target.value, sector: '', cell: '', village: '' }))} disabled={!editForm.province} className="w-full mb-3 p-2 border rounded">
                <option value="">Select District</option>
                {districtNames.map((district) => (<option key={district} value={district}>{district}</option>))}
              </select>
              <select name="sector" value={editForm.sector} onChange={e => setEditForm(f => ({ ...f, sector: e.target.value, cell: '', village: '' }))} disabled={!editForm.district} className="w-full mb-3 p-2 border rounded">
                <option value="">Select Sector</option>
                {sectorNames.map((sector) => (<option key={sector} value={sector}>{sector}</option>))}
              </select>
              <select name="cell" value={editForm.cell} onChange={e => setEditForm(f => ({ ...f, cell: e.target.value, village: '' }))} disabled={!editForm.sector} className="w-full mb-3 p-2 border rounded">
                <option value="">Select Cell</option>
                {cellNames.map((cell) => (<option key={cell} value={cell}>{cell}</option>))}
              </select>
              <select name="village" value={editForm.village} onChange={e => setEditForm(f => ({ ...f, village: e.target.value }))} disabled={!editForm.cell} className="w-full mb-3 p-2 border rounded">
                <option value="">Select Village</option>
                {villageNames.map((village: string) => (<option key={village} value={village}>{village}</option>))}
              </select>
              <input name="address" value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Street Address" className="w-full mb-3 p-2 border rounded" />
              <div className="grid grid-cols-2 gap-2 mb-3">
                <input name="latitude" value={editForm.latitude} onChange={e => setEditForm(f => ({ ...f, latitude: e.target.value }))} placeholder="Latitude" className="w-full p-2 border rounded" />
                <input name="longitude" value={editForm.longitude} onChange={e => setEditForm(f => ({ ...f, longitude: e.target.value }))} placeholder="Longitude" className="w-full p-2 border rounded" />
              </div>
            </div>
          )}
          {step === 3 && (
            <div>
              <div className="mb-4">
                <label className="block font-semibold mb-2">Property Images (max 5, JPG/PNG/GIF, 2MB each)</label>
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageChange} className="mb-2" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentImages.map((img, idx) => (
                    <div key={img} className="relative">
                      <img src={img} alt={`Existing ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                      <button type="button" className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" onClick={() => handleRemoveImage(img, idx)}>&times;</button>
                    </div>
                  ))}
                  {imagePreviews.map((img, idx) => (
                    <div key={img} className="relative">
                      <img src={img} alt={`Preview ${idx + 1}`} className="w-20 h-20 object-cover rounded" />
                      <button type="button" className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" onClick={() => handleRemoveImagePreview(idx)}>&times;</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block font-semibold mb-2">Documents (max 5, PDF, 2MB each)</label>
                <input ref={documentInputRef} type="file" accept="application/pdf" multiple onChange={handleDocumentChange} className="mb-2" />
                <div className="flex flex-wrap gap-2 mt-2">
                  {currentDocuments.map((doc, idx) => (
                    <div key={doc} className="relative flex items-center gap-2">
                      <span className="text-xs text-gray-700">{doc.split('/').pop()}</span>
                      <button type="button" className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" onClick={() => handleRemoveDocument(doc, idx)}>&times;</button>
                    </div>
                  ))}
                  {documents.map((doc, idx) => (
                    <div key={doc.name} className="relative flex items-center gap-2">
                      <span className="text-xs text-gray-700">{doc.name}</span>
                      <button type="button" className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center" onClick={() => handleRemoveDocumentPreview(idx)}>&times;</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <div className="flex justify-between mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">Cancel</button>
            <div>
              {step > 1 && <button type="button" onClick={() => setStep(step - 1)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 mr-2">Back</button>}
              {step < 3 && <button type="button" onClick={() => setStep(step + 1)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Next</button>}
              {step === 3 && <button type="submit" disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 ml-2">{loading ? 'Saving...' : 'Save Changes'}</button>}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
