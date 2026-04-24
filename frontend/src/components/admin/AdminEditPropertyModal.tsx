import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

type EditFormType = {
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
  address?: string;
  gazette_reference?: string;
};


interface AdminEditPropertyModalProps {
  editForm: EditFormType;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormType>>;
  onEdit: (data: EditFormType & { images: string[]; documents: string[]; newImages: File[]; newDocuments: File[]; removedImages: string[]; removedDocuments: string[] }) => void;
  onClose: () => void;
  provinceNames: string[];
  adminHierarchy: any;
  existingImages?: string[];
  existingDocuments?: string[];
}


export default function AdminEditPropertyModal({ editForm, setEditForm, onEdit, onClose, provinceNames, adminHierarchy, existingImages = [], existingDocuments = [] }: AdminEditPropertyModalProps) {
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

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, minWidth: 400, maxWidth: 600, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: 16 }}>Edit Property (Admin)</h3>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <button onClick={() => setStep(1)} style={{ fontWeight: step === 1 ? 700 : 400 }}>1. Basic</button>
          <button onClick={() => setStep(2)} style={{ fontWeight: step === 2 ? 700 : 400 }}>2. Location</button>
          <button onClick={() => setStep(3)} style={{ fontWeight: step === 3 ? 700 : 400 }}>3. Media</button>
        </div>
        {step === 1 && (
          <div>
            <input name="upi" value={editForm.upi} onChange={e => setEditForm(f => ({ ...f, upi: e.target.value }))} placeholder="UPI / Parcel ID" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <input name="title" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <textarea name="description" value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" style={{ width: '100%', marginBottom: 12, padding: 8 }} rows={3} />
            <input name="property_type" value={editForm.property_type} onChange={e => setEditForm(f => ({ ...f, property_type: e.target.value }))} placeholder="Type" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <select name="visibility" value={editForm.visibility} onChange={e => setEditForm(f => ({ ...f, visibility: e.target.value }))} style={{ width: '100%', marginBottom: 12, padding: 8 }}>
              <option value="public">public</option>
              <option value="registered">registered</option>
              <option value="only_me">only_me</option>
            </select>
            <input name="land_size" type="number" value={editForm.land_size} onChange={e => setEditForm(f => ({ ...f, land_size: e.target.value }))} placeholder="Area (sqm)" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <input name="price" type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} placeholder="Price (RWF)" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <input name="gazette_reference" value={editForm.gazette_reference || ''} onChange={e => setEditForm(f => ({ ...f, gazette_reference: e.target.value }))} placeholder="Gazette Reference" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <button onClick={() => setStep(2)} style={{ width: '100%', background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, marginTop: 8 }}>Next: Location</button>
          </div>
        )}
        {step === 2 && (
          <div>
            <select name="province" value={editForm.province} onChange={e => setEditForm(f => ({ ...f, province: e.target.value, district: '', sector: '', cell: '', village: '' }))} style={{ width: '100%', marginBottom: 12, padding: 8 }}>
              <option value="">Select Province</option>
              {provinceNames.map((province) => (<option key={province} value={province}>{province}</option>))}
            </select>
            <select name="district" value={editForm.district} onChange={e => setEditForm(f => ({ ...f, district: e.target.value, sector: '', cell: '', village: '' }))} disabled={!editForm.province} style={{ width: '100%', marginBottom: 12, padding: 8 }}>
              <option value="">Select District</option>
              {districtNames.map((district) => (<option key={district} value={district}>{district}</option>))}
            </select>
            <select name="sector" value={editForm.sector} onChange={e => setEditForm(f => ({ ...f, sector: e.target.value, cell: '', village: '' }))} disabled={!editForm.district} style={{ width: '100%', marginBottom: 12, padding: 8 }}>
              <option value="">Select Sector</option>
              {sectorNames.map((sector) => (<option key={sector} value={sector}>{sector}</option>))}
            </select>
            <select name="cell" value={editForm.cell} onChange={e => setEditForm(f => ({ ...f, cell: e.target.value, village: '' }))} disabled={!editForm.sector} style={{ width: '100%', marginBottom: 12, padding: 8 }}>
              <option value="">Select Cell</option>
              {cellNames.map((cell) => (<option key={cell} value={cell}>{cell}</option>))}
            </select>
            <select name="village" value={editForm.village} onChange={e => setEditForm(f => ({ ...f, village: e.target.value }))} disabled={!editForm.cell} style={{ width: '100%', marginBottom: 12, padding: 8 }}>
              <option value="">Select Village</option>
              {villageNames.map((village: string) => (<option key={village} value={village}>{village}</option>))}
            </select>
            <input name="address" value={editForm.address || ''} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Street Address" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <input name="latitude" value={editForm.latitude} onChange={e => setEditForm(f => ({ ...f, latitude: e.target.value }))} placeholder="Latitude" style={{ width: '100%', padding: 8 }} />
              <input name="longitude" value={editForm.longitude} onChange={e => setEditForm(f => ({ ...f, longitude: e.target.value }))} placeholder="Longitude" style={{ width: '100%', padding: 8 }} />
            </div>
            <button onClick={() => setStep(1)} style={{ marginRight: 8, background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600 }}>Back</button>
            <button onClick={() => setStep(3)} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, marginLeft: 8 }}>Next: Media</button>
          </div>
        )}
        {step === 3 && (
          <div>
            {/* Image Upload */}
            <div style={{ border: '2px dashed #ccc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Property Images</h4>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                  Upload photos (max 5, 2MB each, JPG/PNG/GIF)
                </p>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={e => {
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
                  }}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => imageInputRef.current && imageInputRef.current.click()} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, marginTop: 8 }}>
                  Choose Images
                </button>
              </div>
              {(currentImages.length > 0 || imagePreviews.length > 0) && (
                <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {currentImages.map((img, idx) => (
                    <div key={img} style={{ position: 'relative' }}>
                      <img src={img} alt={`Existing ${idx + 1}`} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }} />
                      <button type="button" onClick={() => {
                        setRemovedImages(prev => [...prev, img]);
                        setCurrentImages(prev => prev.filter((_, i) => i !== idx));
                      }} style={{ position: 'absolute', top: 4, right: 4, background: '#d9534f', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontWeight: 700, cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                  {imagePreviews.map((preview, idx) => (
                    <div key={preview} style={{ position: 'relative' }}>
                      <img src={preview} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 6 }} />
                      <button type="button" onClick={() => {
                        setImages(prev => prev.filter((_, i) => i !== idx));
                        setImagePreviews(prev => prev.filter((_, i) => i !== idx));
                      }} style={{ position: 'absolute', top: 4, right: 4, background: '#d9534f', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontWeight: 700, cursor: 'pointer' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Document Upload */}
            <div style={{ border: '2px dashed #ccc', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Title Documents & Certificates</h4>
                <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                  Upload legal documents (max 5, 2MB each, PDF only)
                </p>
                <input
                  ref={documentInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  onChange={e => {
                    if (e.target.files) {
                      const files = Array.from(e.target.files);
                      let validFiles = files.filter(f => f.type === 'application/pdf' && f.size <= 2 * 1024 * 1024);
                      if (documents.length + validFiles.length > 5) {
                        validFiles = validFiles.slice(0, 5 - documents.length);
                        toast.error('Maximum 5 documents allowed');
                      }
                      setDocuments(prev => [...prev, ...validFiles]);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <button type="button" onClick={() => documentInputRef.current && documentInputRef.current.click()} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, marginTop: 8 }}>
                  Choose Documents
                </button>
              </div>
              {(currentDocuments.length > 0 || documents.length > 0) && (
                <div style={{ marginTop: 16 }}>
                  {currentDocuments.map((doc, idx) => (
                    <div key={doc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', padding: 8, borderRadius: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 18, marginRight: 8 }}>📎</span>
                      <span style={{ fontSize: 13 }}>{doc.split('/').pop()}</span>
                      <button type="button" onClick={() => {
                        setRemovedDocuments(prev => [...prev, doc]);
                        setCurrentDocuments(prev => prev.filter((_, i) => i !== idx));
                      }} style={{ color: '#d9534f', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Remove</button>
                    </div>
                  ))}
                  {documents.map((doc: File, idx: number) => (
                    <div key={doc.name + idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', padding: 8, borderRadius: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 18, marginRight: 8 }}>📎</span>
                      <span style={{ fontSize: 13 }}>{doc.name}</span>
                      <button type="button" onClick={() => setDocuments(prev => prev.filter((_, i) => i !== idx))} style={{ color: '#d9534f', background: 'none', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: '#f0f8ff', border: '1px solid #b6e0fe', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#2563eb' }}>
                <strong>📌 Required Documents:</strong> Land title or ownership certificate.<br />
                <strong>📌 Optional:</strong> Survey maps, property tax receipts, gazette references.
              </p>
            </div>
            <button onClick={() => setStep(2)} style={{ marginRight: 8, background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600 }}>Back</button>
            <button
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await onEdit({
                    ...editForm,
                    images: currentImages,
                    documents: currentDocuments,
                    newImages: images,
                    newDocuments: documents,
                    removedImages,
                    removedDocuments,
                  });
                  onClose();
                } catch (err: any) {
                  setError(err?.message || 'Failed to save changes');
                } finally {
                  setLoading(false);
                }
              }}
              style={{ background: loading ? '#ccc' : '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, marginLeft: 8 }}
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
            {error && (
              <div style={{ color: '#d9534f', marginTop: 12, fontWeight: 500, fontSize: 14 }}>{error}</div>
            )}
          </div>
        )}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 24, color: '#888', cursor: 'pointer' }}>&times;</button>
      </div>
    </div>
  );
}
