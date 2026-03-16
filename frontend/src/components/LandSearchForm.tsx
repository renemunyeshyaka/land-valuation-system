import React from 'react';


interface LandSearchFormProps {
  onSearch: (searchParams: any) => void;
  disabled?: boolean;
  showAdvanced?: boolean;
}


const LandSearchForm: React.FC<LandSearchFormProps> = ({ onSearch, disabled = false, showAdvanced = false }) => {
  const [form, setForm] = React.useState({
    district: '',
    sector: '',
    cell: '',
    plot: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(form);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <input name="district" placeholder="District" value={form.district} onChange={handleChange} disabled={disabled} />
      <input name="sector" placeholder="Sector" value={form.sector} onChange={handleChange} disabled={disabled} />
      <input name="cell" placeholder="Cell" value={form.cell} onChange={handleChange} disabled={disabled} />
      <input name="plot" placeholder="Plot" value={form.plot} onChange={handleChange} disabled={disabled} />
      {showAdvanced && (
        <div className="text-xs text-gray-500">Advanced search options could go here.</div>
      )}
      <button type="submit" disabled={disabled}>Search</button>
    </form>
  );
};

export default LandSearchForm;
