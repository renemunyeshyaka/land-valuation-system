import React, { useState } from 'react';
import adminHierarchyRaw from '../data/land_admin_hierarchy_from_csv.json';
import sectorCellVillageRaw from '../data/sector_cell_village.json';

interface LandEstimateFormProps {
  onEstimate: (params: LandEstimateRequest) => void;
  disabled?: boolean;
}



// For dynamic dropdowns, we use names, not IDs
export interface LandEstimateRequest {
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  plot_size_sqm: number;
}



const LandEstimateForm: React.FC<LandEstimateFormProps> = ({ onEstimate, disabled = false }) => {

  // Correct 5-level hierarchy: province > district > sector > cell > village[]
  type AdminHierarchy = {
    [province: string]: {
      [district: string]: {
        [sector: string]: {
          [cell: string]: string[];
        };
      };
    };
  };
  const adminHierarchy: AdminHierarchy = adminHierarchyRaw;

  // Show all provinces from adminHierarchy
  const provinceNames = Object.keys(adminHierarchy);
  const [province, setProvince] = useState<string>(provinceNames[0] || '');
  const [district, setDistrict] = useState<string>('');
  const [sector, setSector] = useState<string>('');
  const [cell, setCell] = useState<string>('');
  const [village, setVillage] = useState<string>('');
  const [plotSize, setPlotSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const districtNames = province ? Object.keys(adminHierarchy[province] || {}) : [];
  const sectorNames = province && district ? Object.keys(adminHierarchy[province][district] || {}) : [];
  const cellNames = province && district && sector ? Object.keys(adminHierarchy[province][district][sector] || {}) : [];
  const villageNames = province && district && sector && cell ? adminHierarchy[province][district][sector][cell] || [] : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!province || !district || !sector || !cell || !village) {
      setError('Please select province, district, sector, cell, and village.');
      return;
    }
    if (!plotSize || plotSize <= 0) {
      setError('Please enter a valid plot size (sqm)');
      return;
    }
    const payload: LandEstimateRequest = {
      province,
      district,
      sector,
      cell,
      village,
      plot_size_sqm: plotSize,
    };
    onEstimate(payload);
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div>
          <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">Province</label>
          <select
            id="province"
            value={province}
            onChange={e => {
              setProvince(e.target.value);
              setDistrict('');
              setSector('');
              setCell('');
              setVillage('');
            }}
            disabled={disabled}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-emerald-400"
          >
            {provinceNames.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">District</label>
          <select
            id="district"
            value={district}
            onChange={e => {
              setDistrict(e.target.value);
              setSector('');
            }}
            disabled={disabled || !province}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-emerald-400"
          >
            <option value="">Select district</option>
            {districtNames.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sector" className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
          <select
            id="sector"
            value={sector}
            onChange={e => { setSector(e.target.value); setCell(''); setVillage(''); }}
            disabled={disabled || !district}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-emerald-400"
          >
            <option value="">Select sector</option>
            {sectorNames.map((s: string) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="cell" className="block text-sm font-medium text-gray-700 mb-1">Cell</label>
          <select
            id="cell"
            value={cell}
            onChange={e => { setCell(e.target.value); setVillage(''); }}
            disabled={disabled || !sector}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-emerald-400"
          >
            <option value="">Select cell</option>
            {cellNames.map((c: string) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1">Village</label>
          <select
            id="village"
            value={village}
            onChange={e => setVillage(e.target.value)}
            disabled={disabled || !cell}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-emerald-400"
          >
            <option value="">Select village</option>
            {villageNames.map((v: string) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="plot_size_sqm" className="block text-sm font-medium text-gray-700 mb-1">Plot Size (sqm)</label>
          <input
            name="plot_size_sqm"
            id="plot_size_sqm"
            type="number"
            placeholder="Enter plot size in sqm"
            value={plotSize}
            onChange={e => setPlotSize(Number(e.target.value))}
            disabled={disabled}
            required
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-emerald-400"
          />
        </div>
      </form>
      {/* Plot Number input (required, outside form, not used in search) */}
      <div className="mt-4">
        <label htmlFor="plot_number" className="block text-sm font-medium text-gray-700 mb-1">Plot Number</label>
        <input
          name="plot_number"
          id="plot_number"
          type="text"
          placeholder="Enter plot number"
          required
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-emerald-400"
        />
      </div>
      {/* Estimate button (outside form, triggers form submit) */}
      <button
        type="submit"
        form={undefined}
        onClick={() => document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
        disabled={disabled}
        className="w-full bg-emerald-600 text-white font-semibold py-2 rounded-lg mt-2 hover:bg-emerald-700 transition-colors"
      >
        Estimate
      </button>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
    </>
  );
};

export default LandEstimateForm;
