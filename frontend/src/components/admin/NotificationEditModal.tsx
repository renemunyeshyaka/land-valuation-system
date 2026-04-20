import React from 'react';

interface NotificationEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
}

const NotificationEditModal: React.FC<NotificationEditModalProps> = ({ open, onClose, onSave, initialData }) => {
  const [form, setForm] = React.useState({
    title: initialData?.title || '',
    message: initialData?.message || '',
    type: initialData?.type || 'info',
  });

  React.useEffect(() => {
    setForm({
      title: initialData?.title || '',
      message: initialData?.message || '',
      type: initialData?.type || 'info',
    });
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Edit Notification</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Title</label>
            <input name="title" value={form.title} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block font-medium mb-1">Type</label>
            <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded px-3 py-2">
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="billing">Billing</option>
              <option value="valuation">Valuation</option>
            </select>
          </div>
          <div>
            <label className="block font-medium mb-1">Message</label>
            <textarea name="message" value={form.message} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 text-gray-700 font-medium">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-emerald-700 text-white font-semibold hover:bg-emerald-800">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationEditModal;
