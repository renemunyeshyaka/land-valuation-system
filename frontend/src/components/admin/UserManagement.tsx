import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { useSession } from 'next-auth/react';
import { refreshAccessToken } from '../../utils/tokenRefresh';


type User = {
  id: string | number;
  first_name: string;
  last_name: string;
  email: string;
  status?: string;
  kyc_status?: string;
  subscription_status?: string;
  is_active?: boolean;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | number | null>(null);

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


  const getApiErrorMessage = (err: any, fallback: string) => {
    return (
      err?.response?.data?.error?.message ||
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      fallback
    );
  };

  // Fetch users with optional search
  const fetchUsers = async (searchQuery?: string, page = currentPage, allowRetry = true) => {
    setLoading(true);
    setError(null);
    try {
      let token = getAuthToken();
      if (!token) {
        const refreshed = await refreshAccessToken();
        if (refreshed) token = getAuthToken();
      }
      if (!token) {
        setUsers([]);
        setError('Authentication token missing. Please log in again.');
        setLoading(false);
        return;
      }

      const params: any = {};
      if (typeof searchQuery === 'string' && searchQuery.trim() !== '') {
        params.search = searchQuery.trim();
      }
      params.page = page;
      params.limit = limit;
      const res = await axios.get(`${API_BASE_URL}/api/v1/admin/users`, {
        ...getAuthConfig(),
        params,
      });
      let usersArr = res.data?.data?.data || res.data?.data?.users || res.data?.users || res.data?.data || [];
      if (!Array.isArray(usersArr)) usersArr = [];
      setUsers(usersArr);
      setCurrentPage(Number(res.data?.data?.page || page));
      setTotal(Number(res.data?.data?.total || usersArr.length || 0));
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await fetchUsers(searchQuery, page, false);
          return;
        }
      }
      setUsers([]); // Always set an array to avoid .map errors
      setError(getApiErrorMessage(err, 'Failed to fetch users'));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers(search, currentPage);
  }, [session, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    fetchUsers(search, 1);
  }, [search]);

  // Add user
  const onAdd = async (data: User) => {
    const run = async (allowRetry: boolean) => {
      try {
        await axios.post(`${API_BASE_URL}/api/v1/admin/users`, data, getAuthConfig());
        setShowAdd(false);
        reset();
        fetchUsers(search, currentPage);
      } catch (err: any) {
        if (allowRetry && err?.response?.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            await run(false);
            return;
          }
        }
        setError(getApiErrorMessage(err, 'Failed to add user'));
      }
    };

    await run(true);
  };

  // Edit user
  const onEdit = async (data: User) => {
    if (!editUser) return;
    const run = async (allowRetry: boolean) => {
      try {
        const payload = {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          status: (data.status || 'pending').toLowerCase() === 'active' ? 'active' : 'pending',
        };
        await axios.put(`${API_BASE_URL}/api/v1/admin/users/${editUser.id}`, payload, getAuthConfig());
        setShowEdit(false);
        setEditUser(null);
        reset();
        fetchUsers(search, currentPage);
      } catch (err: any) {
        if (allowRetry && err?.response?.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            await run(false);
            return;
          }
        }
        setError(getApiErrorMessage(err, 'Failed to edit user'));
      }
    };

    await run(true);
  };

  // Delete user
  const onDelete = async (id: string | number, allowRetry = true) => {
    try {
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (storedUser) {
        try {
          const currentUser = JSON.parse(storedUser);
          if (String(currentUser?.id) === String(id)) {
            setDeleteUserId(null);
            setError('You cannot delete your own admin account from this screen.');
            return;
          }
        } catch (parseError) {
          console.debug('Failed to parse stored user during delete check:', parseError);
        }
      }

      await axios.delete(`${API_BASE_URL}/api/v1/admin/users/${id}`, getAuthConfig());
      setDeleteUserId(null);
      fetchUsers(search, currentPage);
    } catch (err: any) {
      if (allowRetry && err?.response?.status === 401) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          await onDelete(id, false);
          return;
        }
      }
      setError(getApiErrorMessage(err, 'Failed to delete user'));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const getUserStatusLabel = (user: User) => {
    if (user.status && String(user.status).trim() !== '') return String(user.status);
    if (user.kyc_status && String(user.kyc_status).trim() !== '') return String(user.kyc_status);
    if (user.subscription_status && String(user.subscription_status).trim() !== '') return String(user.subscription_status);
    if (typeof user.is_active === 'boolean') return user.is_active ? 'active' : 'inactive';
    return '-';
  };

  const getEditableStatus = (user: User): 'pending' | 'active' => {
    const status = getUserStatusLabel(user).toLowerCase();
    if (status === 'active') return 'active';
    if (typeof user.is_active === 'boolean') return user.is_active ? 'active' : 'pending';
    return 'pending';
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
          onClick={() => fetchUsers(search, 1)}
          style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}
        >
          Search
        </button>
        <button
          onClick={() => { setSearch(''); setCurrentPage(1); fetchUsers('', 1); }}
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
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: 8, border: '1px solid #eee' }}>User ID</th>
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
                    <td style={{ padding: 8, border: '1px solid #eee', fontFamily: 'monospace' }}>{String(user.id)}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{user.first_name}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{user.last_name}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{user.email}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>{getUserStatusLabel(user)}</td>
                    <td style={{ padding: 8, border: '1px solid #eee' }}>
                      <button onClick={() => { setEditUser(user); setShowEdit(true); reset({ ...user, status: getEditableStatus(user) }); }} style={{ marginRight: 8, background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => setDeleteUserId(user.id)} style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 8, flexWrap: 'wrap' }}>
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
                      key={`user-page-${pageNum}`}
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
            <select {...register('status', { required: true })} style={{ width: '100%', marginBottom: 12, padding: 8 }}>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
            </select>
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
