
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import NotificationEditModal from './NotificationEditModal';
import { refreshAccessToken } from '../../utils/tokenRefresh';

interface Notification {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: string;
  is_read?: boolean;
  sent_by?: string;
  created_at?: string;
}


function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('access_token');
  }
  return null;
}

function getAuthConfig() {
  const token = getAuthToken();
  return {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    withCredentials: true,
  };
}

const NotificationManagement: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    user_id: '',
    title: '',
    message: '',
    type: 'info',
    broadcast: false,
    user_role: '',
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editNotification, setEditNotification] = useState<Notification | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>(["all"]);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  const handleEdit = (notification: Notification) => {
    setEditNotification(notification);
    setEditModalOpen(true);
  };

  const handleEditSave = async (data: any) => {
    if (!editNotification) return;
    setError(null);
    setSuccess(null);
    try {
      await axios.put(`${API_BASE_URL}/api/v1/admin/notifications/${editNotification.id}`, data);
      setSuccess('Notification updated successfully');
      setEditModalOpen(false);
      setEditNotification(null);
      fetchNotifications();
    } catch (e: any) {
      setError('Failed to update notification');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notification?')) return;
    setError(null);
    setSuccess(null);
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/admin/notifications/${id}`);
      setSuccess('Notification deleted successfully');
      fetchNotifications();
    } catch (e: any) {
      setError('Failed to delete notification');
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUserRoles();
  }, []);

  const fetchUserRoles = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/admin/user-roles`, getAuthConfig());
      if (Array.isArray(res.data.data)) {
        setUserRoles(["all", ...res.data.data.filter((r: string) => r !== "all")]);
      } else {
        setUserRoles(["all", "individual", "agent", "corporate", "government", "admin"]);
      }
    } catch (e) {
      setUserRoles(["all", "individual", "agent", "corporate", "government", "admin"]);
    }
  };


  const fetchNotifications = async (allowRetry = true) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/v1/admin/notifications`, getAuthConfig());
      // Handle both direct array and paginated object
      let notificationsArr: Notification[] = [];
      if (Array.isArray(res.data.data)) {
        notificationsArr = res.data.data;
      } else if (res.data.data && Array.isArray(res.data.data.data)) {
        notificationsArr = res.data.data.data;
      }
      setNotifications(notificationsArr);
    } catch (e: any) {
      if (e.response && e.response.status === 401 && allowRetry) {
        try {
          await refreshAccessToken();
          return fetchNotifications(false);
        } catch {
          setError('Authentication failed. Please log in again.');
        }
      } else {
        setError('Failed to fetch notifications');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let fieldValue: string | boolean = value;
    if (type === 'checkbox') {
      fieldValue = (e.target as HTMLInputElement).checked;
    }
    setForm((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));
  };


  const handleSend = async (e: React.FormEvent, allowRetry = true) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (form.broadcast) {
        await axios.post(
          `${API_BASE_URL}/api/v1/admin/notifications/broadcast`,
          {
            title: form.title,
            message: form.message,
            type: form.type,
            user_role: form.user_role,
          },
          getAuthConfig()
        );
      } else {
        await axios.post(
          `${API_BASE_URL}/api/v1/admin/notifications`,
          {
            user_id: form.user_id,
            title: form.title,
            message: form.message,
            type: form.type,
          },
          getAuthConfig()
        );
      }
      setSuccess('Notification sent successfully');
      setForm({ user_id: '', title: '', message: '', type: 'info', broadcast: false, user_role: '' });
      fetchNotifications();
    } catch (e: any) {
      if (e.response && e.response.status === 401 && allowRetry) {
        try {
          await refreshAccessToken();
          return handleSend(e, false);
        } catch {
          setError('Authentication failed. Please log in again.');
        }
      } else {
        setError('Failed to send notification');
      }
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Notification Management</h2>
      <form onSubmit={handleSend} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
        <div className="md:col-span-2">
          <label className="block font-medium mb-1">Message</label>
          <textarea name="message" value={form.message} onChange={handleChange} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block font-medium mb-1">Send to User ID</label>
          <input name="user_id" value={form.user_id} onChange={handleChange} className="w-full border rounded px-3 py-2" disabled={form.broadcast} />
        </div>
        <div className="flex items-center gap-2 mt-6">
          <input type="checkbox" name="broadcast" checked={form.broadcast} onChange={handleChange} id="broadcast" />
          <label htmlFor="broadcast" className="font-medium">Broadcast to all users</label>
        </div>
        {form.broadcast && (
          Array.isArray(userRoles) ? (
            <div>
              <label className="block font-medium mb-1">User Role (optional)</label>
              <select
                name="user_role"
                value={form.user_role}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
              >
                {userRoles.map((role) => (
                  <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="text-red-600 font-medium">Failed to load user roles.</div>
          )
        )}
        <div className="md:col-span-2 flex gap-4 mt-4">
          <button type="submit" className="bg-emerald-700 text-white px-6 py-2 rounded font-semibold hover:bg-emerald-800">Send Notification</button>
          {error && <span className="text-red-600 font-medium ml-4">{error}</span>}
          {success && <span className="text-green-600 font-medium ml-4">{success}</span>}
        </div>
      </form>
      <h3 className="text-xl font-semibold mb-2">Recent Notifications</h3>
      {loading ? (
        <div>Loading...</div>
      ) : notifications.length === 0 ? (
        <div>No notifications found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded shadow text-sm">
            <thead>
              <tr>
                <th className="px-3 py-2 border-b">ID</th>
                <th className="px-3 py-2 border-b">Title</th>
                <th className="px-3 py-2 border-b">Message</th>
                <th className="px-3 py-2 border-b">Type</th>
                <th className="px-3 py-2 border-b">User ID</th>
                <th className="px-3 py-2 border-b">Sent By</th>
                <th className="px-3 py-2 border-b">Created At</th>
                <th className="px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(notifications) && notifications.map((n) => (
                <tr key={n.id}>
                  <td className="px-3 py-2 border-b">{n.id}</td>
                  <td className="px-3 py-2 border-b">{n.title}</td>
                  <td className="px-3 py-2 border-b">{n.message}</td>
                  <td className="px-3 py-2 border-b">{n.type}</td>
                  <td className="px-3 py-2 border-b">{n.user_id || '-'}</td>
                  <td className="px-3 py-2 border-b">{n.sent_by || '-'}</td>
                  <td className="px-3 py-2 border-b">{n.created_at ? new Date(n.created_at).toLocaleString() : '-'}</td>
                  <td className="px-3 py-2 border-b">
                    <button className="text-blue-600 hover:underline mr-2" onClick={() => handleEdit(n)}>Edit</button>
                    <button className="text-red-600 hover:underline" onClick={() => handleDelete(n.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NotificationEditModal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); setEditNotification(null); }}
        onSave={handleEditSave}
        initialData={editNotification}
      />
    </div>
  );
};

export default NotificationManagement;
