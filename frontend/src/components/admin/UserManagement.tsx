import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';


type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  status?: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<User>();

  // Get JWT token from next-auth session or localStorage
  const { data: session } = useSession();
  // Helper to extract accessToken from session if present (custom property)
  const getAuthToken = () => {
    // If your session includes a custom accessToken, access it with type assertion or optional chaining
    if (session && (session as any).accessToken) return (session as any).accessToken as string;
    // Fallback to localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      if (token) return token;
    }
    return null;
  };

  // Helper to get axios config with Authorization header
  const getAuthConfig = () => {
    const token = getAuthToken();
    return {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };
  };


  // Fetch users with optional search
  const fetchUsers = async (searchQuery?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (typeof searchQuery === 'string' && searchQuery.trim() !== '') {
        params.search = searchQuery.trim();
      }
      const res = await axios.get(`${API_BASE_URL}/api/v1/admin/users`, {
        ...getAuthConfig(),
        params,
      });
      // Accept both data.data.users and data.users for compatibility
      let usersArr = res.data.data?.users || res.data.users || res.data.data || [];
      if (!Array.isArray(usersArr)) usersArr = [];
      setUsers(usersArr);
    } catch (err: any) {
      setUsers([]); // Always set an array to avoid .map errors
      setError('Failed to fetch users');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Add user
  const onAdd = async (data: User) => {
    try {
      await axios.post(`${API_BASE_URL}/api/v1/admin/users`, data, getAuthConfig());
      setShowAdd(false);
      reset();
      fetchUsers();
    } catch (err) {
      setError('Failed to add user');
    }
  };

  // Edit user
  const onEdit = async (data: User) => {
    if (!editUser) return;
    try {
      await axios.put(`${API_BASE_URL}/api/v1/admin/users/${editUser.id}`, data, getAuthConfig());
      setShowEdit(false);
      setEditUser(null);
      reset();
      fetchUsers();
    } catch (err) {
      setError('Failed to edit user');
    }
  };

  // Delete user
  const onDelete = async (id: string) => {
    try {
      await axios.delete(`${API_BASE_URL}/api/v1/admin/users/${id}`, getAuthConfig());
      setDeleteUserId(null);
      fetchUsers();
    } catch (err) {
      setError('Failed to delete user');
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '2rem auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '2rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>User Management</h2>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button onClick={() => { setShowAdd(true); reset(); }} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Add User</button>
        <button disabled style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Edit User (select row)</button>
        <button disabled style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Delete User (select row)</button>
      </div>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name, email, phone, or national ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 320, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button
          onClick={() => fetchUsers(search)}
          style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Search
        </button>
        <button
          onClick={() => { setSearch(''); fetchUsers(''); }}
          style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Clear
        </button>
      </div>
      {error && <div style={{ color: 'red', marginBottom: 16 }}>{error}</div>}
      <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: 8, border: '1px solid #eee' }}>First Name</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Last Name</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Email</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Status</th>
                <th style={{ padding: 8, border: '1px solid #eee' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{user.first_name}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{user.last_name}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{user.email}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>{user.status || '-'}</td>
                  <td style={{ padding: 8, border: '1px solid #eee' }}>
                    <button onClick={() => { setEditUser(user); setShowEdit(true); reset(user); }} style={{ marginRight: 8, background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => setDeleteUserId(user.id)} style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleSubmit(onAdd)} style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Add User</h3>
            <input {...register('first_name', { required: true })} placeholder="First Name" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <input {...register('last_name', { required: true })} placeholder="Last Name" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <input {...register('email', { required: true })} placeholder="Email" type="email" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Add</button>
              <button type="button" onClick={() => setShowAdd(false)} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {showEdit && editUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleSubmit(onEdit)} style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Edit User</h3>
            <input {...register('first_name', { required: true })} placeholder="First Name" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <input {...register('last_name', { required: true })} placeholder="Last Name" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <input {...register('email', { required: true })} placeholder="Email" type="email" style={{ width: '100%', marginBottom: 12, padding: 8 }} />
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Save</button>
              <button type="button" onClick={() => { setShowEdit(false); setEditUser(null); }} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Delete User Confirmation */}
      {deleteUserId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 320 }}>
            <h3 style={{ marginBottom: 16 }}>Delete User</h3>
            <p>Are you sure you want to delete this user?</p>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button onClick={() => onDelete(deleteUserId)} style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              <button onClick={() => setDeleteUserId(null)} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
