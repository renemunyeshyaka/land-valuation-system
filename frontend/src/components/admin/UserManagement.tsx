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
  phone?: string;
  national_id?: string;
  user_type?: string;
  full_name?: string;
  company_name?: string;
  business_license?: string;
  preferred_language?: string;
  language_preference?: string;
  city?: string;
  country?: string;
  bio?: string;
  profile_image?: string;
  profile_picture_url?: string;
  status?: string;
  kyc_status?: string;
  subscription_tier?: string;
  subscription_status?: string;
  email_verified?: boolean;
  is_verified?: boolean;
  is_active?: boolean;
  is_diaspora?: boolean;
  notification_email?: boolean;
  notification_sms?: boolean;
  two_factor_enabled?: boolean;
  two_fa_enabled?: boolean;
  is_ultimate_no_expiry?: boolean;
};

type RoleControlForm = {
  user_type?: string;
  confirm_role_change?: boolean;
};

type AccessControlForm = {
  subscription_tier?: string;
  subscription_status?: string;
  email_verified?: boolean;
  is_verified?: boolean;
  two_factor_enabled?: boolean;
  two_fa_enabled?: boolean;
  is_ultimate_no_expiry?: boolean;
  confirm_access_change?: boolean;
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
  const [showView, setShowView] = useState(false);
  const [showManageRole, setShowManageRole] = useState(false);
  const [showManageAccess, setShowManageAccess] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [roleUser, setRoleUser] = useState<User | null>(null);
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | number | null>(null);

  const { register, handleSubmit, reset } = useForm<User>();
  const {
    register: registerRole,
    handleSubmit: handleSubmitRole,
    reset: resetRole,
    watch: watchRole,
  } = useForm<RoleControlForm>();
  const {
    register: registerAccess,
    handleSubmit: handleSubmitAccess,
    reset: resetAccess,
    watch: watchAccess,
  } = useForm<AccessControlForm>();

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
          phone: data.phone || '',
          national_id: data.national_id || '',
          full_name: data.full_name || '',
          company_name: data.company_name || '',
          business_license: data.business_license || '',
          preferred_language: data.preferred_language || 'rw',
          language_preference: data.language_preference || 'en',
          city: data.city || '',
          country: data.country || '',
          bio: data.bio || '',
          profile_image: data.profile_image || '',
          profile_picture_url: data.profile_picture_url || '',
          kyc_status: data.kyc_status || 'pending',
          status: (data.status || (data.is_active ? 'active' : 'pending')).toLowerCase() === 'active' ? 'active' : 'pending',
          is_active: Boolean(data.is_active),
          is_diaspora: Boolean(data.is_diaspora),
          notification_email: data.notification_email !== false,
          notification_sms: Boolean(data.notification_sms),
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

  const onManageRole = async (data: RoleControlForm) => {
    if (!roleUser) return;
    if (!data.confirm_role_change) {
      setError('Confirm the role change before applying it.');
      return;
    }

    const run = async (allowRetry: boolean) => {
      try {
        const payload = {
          first_name: roleUser.first_name,
          last_name: roleUser.last_name,
          email: roleUser.email,
          user_type: data.user_type || 'individual',
        };
        await axios.put(`${API_BASE_URL}/api/v1/admin/users/${roleUser.id}`, payload, getAuthConfig());
        setShowManageRole(false);
        setRoleUser(null);
        resetRole();
        fetchUsers(search, currentPage);
      } catch (err: any) {
        if (allowRetry && err?.response?.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            await run(false);
            return;
          }
        }
        setError(getApiErrorMessage(err, 'Failed to update user role'));
      }
    };

    await run(true);
  };

  const onManageAccess = async (data: AccessControlForm) => {
    if (!accessUser) return;
    if (!data.confirm_access_change) {
      setError('Confirm the access override before applying it.');
      return;
    }

    const run = async (allowRetry: boolean) => {
      try {
        const payload = {
          first_name: accessUser.first_name,
          last_name: accessUser.last_name,
          email: accessUser.email,
          subscription_tier: data.subscription_tier || 'free',
          subscription_status: data.subscription_status || 'inactive',
          email_verified: Boolean(data.email_verified),
          is_verified: Boolean(data.is_verified),
          two_factor_enabled: Boolean(data.two_factor_enabled),
          two_fa_enabled: Boolean(data.two_fa_enabled),
          is_ultimate_no_expiry: Boolean(data.is_ultimate_no_expiry),
        };
        await axios.put(`${API_BASE_URL}/api/v1/admin/users/${accessUser.id}`, payload, getAuthConfig());
        setShowManageAccess(false);
        setAccessUser(null);
        resetAccess();
        fetchUsers(search, currentPage);
      } catch (err: any) {
        if (allowRetry && err?.response?.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            await run(false);
            return;
          }
        }
        setError(getApiErrorMessage(err, 'Failed to update access overrides'));
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

  const openEdit = (user: User) => {
    setEditUser(user);
    setShowEdit(true);
    reset({
      ...user,
      status: getEditableStatus(user),
      user_type: user.user_type || 'individual',
      preferred_language: user.preferred_language || 'rw',
      language_preference: user.language_preference || 'en',
      subscription_tier: user.subscription_tier || 'free',
      subscription_status: user.subscription_status || 'inactive',
      kyc_status: user.kyc_status || 'pending',
      notification_email: user.notification_email !== false,
      notification_sms: Boolean(user.notification_sms),
      email_verified: Boolean(user.email_verified),
      is_verified: Boolean(user.is_verified),
      is_active: Boolean(user.is_active),
      is_diaspora: Boolean(user.is_diaspora),
      two_factor_enabled: Boolean(user.two_factor_enabled),
      two_fa_enabled: Boolean(user.two_fa_enabled),
      is_ultimate_no_expiry: Boolean(user.is_ultimate_no_expiry),
    });
  };

  const openManageRole = (user: User) => {
    setError(null);
    setRoleUser(user);
    setShowManageRole(true);
    resetRole({
      user_type: user.user_type || 'individual',
      confirm_role_change: false,
    });
  };

  const openManageAccess = (user: User) => {
    setError(null);
    setAccessUser(user);
    setShowManageAccess(true);
    resetAccess({
      subscription_tier: user.subscription_tier || 'free',
      subscription_status: user.subscription_status || 'inactive',
      email_verified: Boolean(user.email_verified),
      is_verified: Boolean(user.is_verified),
      two_factor_enabled: Boolean(user.two_factor_enabled),
      two_fa_enabled: Boolean(user.two_fa_enabled),
      is_ultimate_no_expiry: Boolean(user.is_ultimate_no_expiry),
      confirm_access_change: false,
    });
  };

  const closeManageRole = () => {
    setShowManageRole(false);
    setRoleUser(null);
    resetRole();
  };

  const closeManageAccess = () => {
    setShowManageAccess(false);
    setAccessUser(null);
    resetAccess();
  };

  const detailRow = (label: string, value: React.ReactNode) => (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, padding: '8px 0', borderBottom: '1px solid #eee' }}>
      <strong>{label}</strong>
      <span>{value || '-'}</span>
    </div>
  );

  const renderSensitiveAccountSummary = (user: User, actions?: React.ReactNode) => (
    <div style={{ marginTop: 20, padding: 16, borderRadius: 10, background: '#f8fafc', border: '1px solid #dbe4ee' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 8, flexWrap: 'wrap' }}>
        <h4 style={{ margin: 0 }} data-testid="sensitive-account-controls-heading">Read-only account controls</h4>
        {actions}
      </div>
      <p style={{ marginTop: 0, marginBottom: 12, color: '#4b5563', fontSize: 14 }}>
        Role, verification, subscription, and 2FA flags are visible here for review but are not editable from this screen.
      </p>
      {detailRow('User Type', user.user_type)}
      {detailRow('Email Verified', user.email_verified ? 'Yes' : 'No')}
      {detailRow('Verified', user.is_verified ? 'Yes' : 'No')}
      {detailRow('Subscription Tier', user.subscription_tier)}
      {detailRow('Subscription Status', user.subscription_status)}
      {detailRow('2FA Enabled', user.two_factor_enabled || user.two_fa_enabled ? 'Yes' : 'No')}
      {detailRow('Ultimate No Expiry', user.is_ultimate_no_expiry ? 'Yes' : 'No')}
    </div>
  );

  return (
    <div style={{ width: '100%', maxWidth: '100%', margin: 0, background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px #0001', padding: '1.25rem' }}>
      <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem', color: '#2d6a4f' }}>User Management</h2>
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button onClick={() => { setShowAdd(true); reset(); }} style={{ background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Add User</button>
        <button disabled style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Edit User (select row)</button>
        <button disabled style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'not-allowed', opacity: 0.7 }}>Delete User (select row)</button>
      </div>
      {/* Search bar with Search and Clear buttons */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name, email, phone, or national ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 'min(320px, 100%)', padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
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
            <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, minWidth: 650 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12 }}>ID</th>
                  <th style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12 }}>First Name</th>
                  <th style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12 }}>Last Name</th>
                  <th style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12 }}>Email</th>
                  <th style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12 }}>Type</th>
                  <th className="hidden sm:table-cell" style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12 }}>Ultimate</th>
                  <th style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12 }}>Status</th>
                  <th style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12, minWidth: 80 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(users) && users.length > 0 ? users.map(user => (
                  <tr key={user.id}>
                    <td style={{ padding: '6px 4px', border: '1px solid #eee', fontFamily: 'monospace', fontSize: 11 }}>{String(user.id)}</td>
                    <td style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12 }}>{user.first_name}</td>
                    <td style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 12 }}>{user.last_name}</td>
                    <td style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 11, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</td>
                    <td style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 11 }}>{user.user_type || '-'}</td>
                    <td className="hidden sm:table-cell" style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 11 }}>{user.is_ultimate_no_expiry ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '6px 4px', border: '1px solid #eee', fontSize: 11 }}>{getUserStatusLabel(user)}</td>
                    <td style={{ padding: '6px 4px', border: '1px solid #eee' }}>
                      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                        <button onClick={() => { setViewUser(user); setShowView(true); }} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.45rem', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} title="View"><i className="fas fa-eye"></i></button>
                        <button onClick={() => openEdit(user)} style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.45rem', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} title="Edit"><i className="fas fa-edit"></i></button>
                        <button onClick={() => openManageRole(user)} style={{ background: '#6b21a8', color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.45rem', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} title="Role"><i className="fas fa-user-tag"></i></button>
                        <button onClick={() => setDeleteUserId(user.id)} style={{ background: '#d9534f', color: '#fff', border: 'none', borderRadius: 4, padding: '0.25rem 0.45rem', fontSize: 11, fontWeight: 600, cursor: 'pointer' }} title="Delete"><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#666', fontSize: 13 }}>No users found.</td></tr>
                )}
              </tbody>
            </table>
            </div>
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
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <form onSubmit={handleSubmit(onAdd)} style={{ background: '#fff', padding: '24px 16px', borderRadius: 12, width: 'min(600px, 100%)', maxHeight: '90vh', overflowY: 'auto' }}>
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

      {showView && viewUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, width: 'min(820px, 92vw)', maxHeight: '86vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>User Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div>
                {detailRow('User ID', String(viewUser.id))}
                {detailRow('Full Name', viewUser.full_name || `${viewUser.first_name || ''} ${viewUser.last_name || ''}`.trim())}
                {detailRow('First Name', viewUser.first_name)}
                {detailRow('Last Name', viewUser.last_name)}
                {detailRow('Email', viewUser.email)}
                {detailRow('Phone', viewUser.phone)}
                {detailRow('National ID', viewUser.national_id)}
                {detailRow('User Type', viewUser.user_type)}
                {detailRow('Diaspora', viewUser.is_diaspora ? 'Yes' : 'No')}
                {detailRow('City', viewUser.city)}
                {detailRow('Country', viewUser.country)}
              </div>
              <div>
                {detailRow('Status', getUserStatusLabel(viewUser))}
                {detailRow('Active', viewUser.is_active ? 'Yes' : 'No')}
                {detailRow('Email Verified', viewUser.email_verified ? 'Yes' : 'No')}
                {detailRow('Verified', viewUser.is_verified ? 'Yes' : 'No')}
                {detailRow('KYC Status', viewUser.kyc_status)}
                {detailRow('Subscription Tier', viewUser.subscription_tier)}
                {detailRow('Subscription Status', viewUser.subscription_status)}
                {detailRow('Preferred Language', viewUser.preferred_language)}
                {detailRow('Language Preference', viewUser.language_preference)}
                {detailRow('Notification Email', viewUser.notification_email === false ? 'No' : 'Yes')}
                {detailRow('Notification SMS', viewUser.notification_sms ? 'Yes' : 'No')}
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              {detailRow('Company Name', viewUser.company_name)}
              {detailRow('Business License', viewUser.business_license)}
              {detailRow('Profile Image', viewUser.profile_image || viewUser.profile_picture_url)}
              {detailRow('Bio', viewUser.bio)}
              {detailRow('2FA Enabled', viewUser.two_factor_enabled || viewUser.two_fa_enabled ? 'Yes' : 'No')}
              {detailRow('Ultimate No Expiry', viewUser.is_ultimate_no_expiry ? 'Yes' : 'No')}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button type="button" onClick={() => { setShowView(false); setViewUser(null); }} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Close</button>
              <button type="button" onClick={() => { setShowView(false); setViewUser(null); openEdit(viewUser); }} style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Edit User</button>
              <button type="button" onClick={() => { setShowView(false); setViewUser(null); openManageRole(viewUser); }} style={{ background: '#6b21a8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Manage Role</button>
              <button type="button" onClick={() => { setShowView(false); setViewUser(null); openManageAccess(viewUser); }} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Manage Access</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEdit && editUser && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleSubmit(onEdit)} style={{ background: '#fff', padding: '24px 16px', borderRadius: 12, width: 'min(920px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: 16 }}>Edit User</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <input {...register('first_name', { required: true })} placeholder="First Name" style={{ width: '100%', padding: 8 }} />
              <input {...register('last_name', { required: true })} placeholder="Last Name" style={{ width: '100%', padding: 8 }} />
              <input {...register('full_name')} placeholder="Full Name" style={{ width: '100%', padding: 8 }} />
              <input {...register('email', { required: true })} placeholder="Email" type="email" style={{ width: '100%', padding: 8 }} />
              <input {...register('phone')} placeholder="Phone" style={{ width: '100%', padding: 8 }} />
              <input {...register('national_id')} placeholder="National ID" style={{ width: '100%', padding: 8 }} />
              <select {...register('status', { required: true })} style={{ width: '100%', padding: 8 }}>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
              </select>
              <select {...register('kyc_status')} style={{ width: '100%', padding: 8 }}>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
                <option value="active">Active</option>
                <option value="approved">Approved</option>
              </select>
              <input {...register('company_name')} placeholder="Company Name" style={{ width: '100%', padding: 8 }} />
              <input {...register('business_license')} placeholder="Business License" style={{ width: '100%', padding: 8 }} />
              <input {...register('city')} placeholder="City" style={{ width: '100%', padding: 8 }} />
              <input {...register('country')} placeholder="Country" style={{ width: '100%', padding: 8 }} />
              <input {...register('preferred_language')} placeholder="Preferred Language" style={{ width: '100%', padding: 8 }} />
              <input {...register('language_preference')} placeholder="Language Preference" style={{ width: '100%', padding: 8 }} />
              <input {...register('profile_image')} placeholder="Profile Image URL" style={{ width: '100%', padding: 8 }} />
              <input {...register('profile_picture_url')} placeholder="Profile Picture URL" style={{ width: '100%', padding: 8 }} />
            </div>
            <textarea {...register('bio')} placeholder="Bio" style={{ width: '100%', marginTop: 12, marginBottom: 12, padding: 8, minHeight: 96 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 8 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" {...register('is_active')} /> Active</label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" {...register('is_diaspora')} /> Diaspora</label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" {...register('notification_email')} /> Email Notifications</label>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" {...register('notification_sms')} /> SMS Notifications</label>
            </div>
            {renderSensitiveAccountSummary(editUser, (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => openManageRole(editUser)}
                  style={{ background: '#6b21a8', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Manage Role
                </button>
                <button
                  type="button"
                  onClick={() => openManageAccess(editUser)}
                  style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer' }}
                >
                  Manage Access
                </button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button type="submit" style={{ background: '#f0ad4e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Save</button>
              <button type="button" onClick={() => { setShowEdit(false); setEditUser(null); }} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {showManageRole && roleUser && (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={handleSubmitRole(onManageRole)} style={{ background: '#fff', padding: '24px 16px', borderRadius: 12, width: 'min(680px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: 12 }}>Manage Role</h3>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#4b5563' }}>
          Use this flow only for role changes. This directly affects authorization and admin access.
        </p>
        <div style={{ padding: 12, borderRadius: 8, background: '#fff7ed', border: '1px solid #fdba74', marginBottom: 16 }}>
          <strong>Target user:</strong> {roleUser.first_name} {roleUser.last_name} ({roleUser.email})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <select aria-label="Role user type" {...registerRole('user_type')} style={{ width: '100%', padding: 8 }}>
            <option value="individual">Individual</option>
            <option value="agent">Agent</option>
            <option value="corporate">Corporate</option>
            <option value="government">Government</option>
            <option value="partner">Partner</option>
            <option value="gov_partner">Gov Partner</option>
            <option value="admin">Admin</option>
          </select>
          <div style={{ padding: 8, borderRadius: 8, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <strong>Current role:</strong> {roleUser.user_type || 'individual'}
          </div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 20, padding: 12, borderRadius: 8, background: '#f3f4f6' }}>
          <input type="checkbox" {...registerRole('confirm_role_change')} />
          I confirm this role change is intentional and approved.
        </label>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            type="submit"
            disabled={!watchRole('confirm_role_change')}
            style={{ background: watchRole('confirm_role_change') ? '#6b21a8' : '#c4b5fd', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: watchRole('confirm_role_change') ? 'pointer' : 'not-allowed' }}
          >
            Apply Role Change
          </button>
          <button type="button" onClick={closeManageRole} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
        </div>
      </form>
    </div>
      )}

      {showManageAccess && accessUser && (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <form onSubmit={handleSubmitAccess(onManageAccess)} style={{ background: '#fff', padding: '24px 16px', borderRadius: 12, width: 'min(760px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: 12 }}>Manage Access Overrides</h3>
        <p style={{ marginTop: 0, marginBottom: 16, color: '#4b5563' }}>
          Use this flow for subscription, verification, 2FA, and privileged-access overrides only.
        </p>
        <div style={{ padding: 12, borderRadius: 8, background: '#eff6ff', border: '1px solid #93c5fd', marginBottom: 16 }}>
          <strong>Target user:</strong> {accessUser.first_name} {accessUser.last_name} ({accessUser.email})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <select aria-label="Access subscription tier" {...registerAccess('subscription_tier')} style={{ width: '100%', padding: 8 }}>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="professional">Professional</option>
            <option value="ultimate">Ultimate</option>
          </select>
          <select aria-label="Access subscription status" {...registerAccess('subscription_status')} style={{ width: '100%', padding: 8 }}>
            <option value="inactive">Inactive</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 16 }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" {...registerAccess('email_verified')} /> Email Verified</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" {...registerAccess('is_verified')} /> Verified</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" {...registerAccess('two_factor_enabled')} /> Two-Factor Enabled</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" {...registerAccess('two_fa_enabled')} /> 2FA Enabled</label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" {...registerAccess('is_ultimate_no_expiry')} /> Ultimate No Expiry</label>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 20, padding: 12, borderRadius: 8, background: '#f3f4f6' }}>
          <input type="checkbox" {...registerAccess('confirm_access_change')} />
          I confirm this access override is intentional and approved.
        </label>
        <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
          <button
            type="submit"
            disabled={!watchAccess('confirm_access_change')}
            style={{ background: watchAccess('confirm_access_change') ? '#7c3aed' : '#c4b5fd', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: watchAccess('confirm_access_change') ? 'pointer' : 'not-allowed' }}
          >
            Apply Access Overrides
          </button>
          <button type="button" onClick={closeManageAccess} style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '0.5rem 1.5rem', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
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
