import React, { useState, useEffect } from 'react';

interface PublicProperty {
  id: string;
  title: string;
  location: string;
  owner_name?: string;
  price?: number;
  description?: string;
}
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { fetchWithTokenRefresh, startTokenRefreshInterval, clearAuth } from '../../utils/tokenRefresh';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  profilePicture?: string;
}

const Profile: React.FC = () => {

  // State for "View Properties" modal and selector
  const [showPropertiesModal, setShowPropertiesModal] = useState(false);
  const [propertyTab, setPropertyTab] = useState<'public' | 'registered' | 'mine'>('public');
  const [properties, setProperties] = useState<PublicProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);


  // Fetch properties based on selected tab
  const fetchProperties = async (tab: 'public' | 'registered' | 'mine') => {
    setPropertiesLoading(true);
    setPropertiesError(null);
    let url = '';
    let options: RequestInit = {};
    if (tab === 'public') {
      url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/properties?visibility=public`;
    } else if (tab === 'registered') {
      url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/properties?visibility=registered`;
    } else if (tab === 'mine') {
      url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/properties/my`;
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (accessToken) {
        options.headers = { Authorization: `Bearer ${accessToken}` };
      }
    }
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error('Failed to fetch properties');
      }
      const data = await response.json();
      setProperties(data?.data || []);
    } catch (err: any) {
      setPropertiesError(err.message || 'Failed to fetch properties');
    } finally {
      setPropertiesLoading(false);
    }
  };


  // Open modal and fetch properties for default tab
  const handleOpenPropertiesModal = () => {
    setShowPropertiesModal(true);
    setPropertyTab('public');
    fetchProperties('public');
  };

  const handleClosePropertiesModal = () => {
    setShowPropertiesModal(false);
    setProperties([]);
    setPropertiesError(null);
  };

  // Handle tab change
  const handleTabChange = (tab: 'public' | 'registered' | 'mine') => {
    setPropertyTab(tab);
    fetchProperties(tab);
  };
  const router = useRouter();
  const { data: session, status } = useSession();
  const [userLoading, setUserLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminExperienceMode, setAdminExperienceMode] = useState<'off' | 'user' | 'ultimate'>('off');
  const [tokenExpired, setTokenExpired] = useState(false); // Track if token is already known to be expired
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    profilePicture: '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const clearAuthAndRedirectToLogin = () => {
    clearAuth();
    router.replace('/auth/login');  // Use replace instead of push for one-way navigation
  };

  const readAdminExperienceMode = (): 'off' | 'user' | 'ultimate' => {
    if (typeof window === 'undefined') {
      return 'off';
    }

    const rawMode = localStorage.getItem('admin_experience_mode');
    if (!rawMode) {
      return 'off';
    }

    try {
      const parsed = JSON.parse(rawMode);
      if (parsed?.mode === 'user' || parsed?.mode === 'ultimate') {
        return parsed.mode;
      }
    } catch (e) {
      console.error('Failed to parse admin experience mode:', e);
    }

    return 'off';
  };

  const setExperienceMode = (mode: 'off' | 'user' | 'ultimate') => {
    if (typeof window === 'undefined') {
      return;
    }

    if (mode === 'off') {
      localStorage.removeItem('admin_experience_mode');
      setAdminExperienceMode('off');
      toast.success('Admin mode restored');
      return;
    }

    localStorage.setItem(
      'admin_experience_mode',
      JSON.stringify({ mode, enabledAt: new Date().toISOString() })
    );
    setAdminExperienceMode(mode);

    if (mode === 'user') {
      toast.success('Switched to user experience mode');
    } else {
      toast.success('Switched to Ultimate non-expiry experience mode');
    }

    router.push('/dashboard');
  };

  const handleAdminExperienceMenu = (value: string) => {
    if (value === 'user') {
      setExperienceMode('user');
      return;
    }

    if (value === 'ultimate') {
      setExperienceMode('ultimate');
      return;
    }

    if (value === 'off') {
      setExperienceMode('off');
    }
  };

  const refreshAdminToken = async () => {
    // Silently refresh the token for admin users to keep session alive
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (!accessToken || !storedUser) {
      return; // Not logged in
    }

    try {
      let userData: any = null;
      try {
        userData = JSON.parse(storedUser);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
        return;
      }

      // Only auto-refresh for admins
      if (userData?.user_type !== 'admin') {
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/users/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload?.data) {
          // Update cached user data
          localStorage.setItem('user', JSON.stringify(payload.data));
        }
      } else if (response.status === 401) {
        // Token is expired - DON'T logout here
        // Only the main loader should handle logout on 401
        // This background refresh should fail silently
        console.debug('Admin token refresh failed: 401 Unauthorized');
      }
    } catch (error) {
      // Network error - don't logout, just skip refresh
      console.debug('Token refresh failed (network issue):', error);
    }
  };

  useEffect(() => {
    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (accessToken && storedUser) {
      setAdminExperienceMode(readAdminExperienceMode());
      loadUserProfile(accessToken);
    } else if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated') {
      setUserLoading(false);
    }
  }, [status, router]);

  // Auto-refresh token for admins to prevent session expiry
  useEffect(() => {
    // Don't try to refresh if token is already expired
    if (tokenExpired) {
      return;
    }

    const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

    if (!accessToken || !storedUser) {
      return; // Not logged in
    }

    try {
      const userData = JSON.parse(storedUser);
      if (userData?.user_type !== 'admin') {
        return; // Not an admin, skip auto-refresh
      }
    } catch (e) {
      return;
    }

    // Refresh token every 5 minutes for admins
    const interval = setInterval(() => {
      refreshAdminToken();
    }, 5 * 60 * 1000); // 5 minutes

    // Initial refresh on mount
    refreshAdminToken();

    return () => clearInterval(interval);
  }, [isAdmin, tokenExpired]);

  const loadUserProfile = async (accessToken: string) => {
    try {
      const response = await fetchWithTokenRefresh(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/users/profile`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const payload = await response.json();
        const userData = payload?.data;
        
        if (userData) {
          setIsAdmin(userData.user_type === 'admin');
          setTokenExpired(false); // Clear token expired flag on success
          setFormData({
            firstName: userData.first_name || '',
            lastName: userData.last_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            address: userData.address || '',
            profilePicture: userData.profile_picture || '',
          });
          
          const savedPicture = localStorage.getItem('profile_picture');
          if (savedPicture) {
            setProfilePicturePreview(savedPicture);
          }
        }
        setUserLoading(false);
      } else if (response.status === 401) {
        // Token could not be refreshed - user needs to login again
        console.debug('Unauthorized: Token could not be refreshed');
        clearAuthAndRedirectToLogin();
        setUserLoading(false);
      } else {
        console.error('Failed to load profile:', response.status);
        setUserLoading(false);
        toast.error('Failed to load profile data');
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
      setUserLoading(false);
      toast.error('Failed to load profile data');
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Profile picture must be less than 2 MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setProfilePicturePreview(dataUrl);
        setFormData(prev => ({ ...prev, profilePicture: dataUrl }));
        toast.success('Profile picture updated');
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.phone && !/^(\+250|0)7[0-9]{8}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid Rwanda phone format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
    setSaving(true);
    
    try {
      const accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/v1/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone.replace(/\s/g, ''),
          address: formData.address,
        }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired - don't logout, just show error and let user retry
          toast.error('Session expired. Please reload the page and try again.');
        } else {
          const data = await response.json();
          throw new Error(data.message || 'Failed to update profile');
        }
        setSaving(false);
        return;
      }

      if (formData.profilePicture) {
        localStorage.setItem('profile_picture', formData.profilePicture);
      }
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          userData.first_name = formData.firstName;
          userData.last_name = formData.lastName;
          userData.phone = formData.phone;
          userData.address = formData.address;
          localStorage.setItem('user', JSON.stringify(userData));
        } catch (e) {
          console.error('Failed to update cached user data:', e);
        }
      }

      toast.success('Profile updated successfully!');
      setTimeout(() => router.push('/dashboard'), 1500);
      
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  if (status === 'loading' || userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-emerald-700"></i>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Profile · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Edit your Land Valuation System profile information" />
        <meta property="og:title" content="Edit Profile · LandVal" />
      </Head>

      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">

        <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 bg-emerald-700 rounded-lg flex items-center justify-center group-hover:bg-emerald-800 transition-colors">
                  <i className="fas fa-map-marked-alt text-white text-lg"></i>
                </div>
                <div className="flex flex-col">
                  <span className="text-base md:text-lg font-bold text-gray-800 leading-tight">LandVal</span>
                  <span className="text-xs text-gray-500 leading-tight hidden sm:block">Rwanda Property Valuation</span>
                </div>
              </Link>

              <div className="flex items-center gap-2 sm:gap-4">
                <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors">
                  Back to Dashboard
                </Link>
                {isAdmin && (
                  <span
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border ${
                      adminExperienceMode === 'user'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : adminExperienceMode === 'ultimate'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                  >
                    {adminExperienceMode === 'user'
                      ? 'Mode: User View'
                      : adminExperienceMode === 'ultimate'
                        ? 'Mode: Ultimate No Expiry'
                        : 'Mode: Admin'}
                  </span>
                )}
                {isAdmin && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      handleAdminExperienceMenu(e.target.value);
                      e.currentTarget.value = '';
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg bg-white hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="" disabled>
                      Admin Access
                    </option>
                    <option value="user">View as Normal User</option>
                    <option value="ultimate">View as Ultimate (No Expiry)</option>
                    <option value="off">Restore Admin Mode</option>
                  </select>
                )}
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-grow">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                Edit Profile
              </h1>
              <p className="text-base text-gray-600">
                Update your personal information
              </p>

              <button
                type="button"
                onClick={handleOpenPropertiesModal}
                className="mt-4 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                <i className="fas fa-building mr-2"></i>
                View Properties
              </button>

              {/* View Properties Modal */}
              {showPropertiesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                  <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative animate-fade-in">
                    <button
                      className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl"
                      onClick={handleClosePropertiesModal}
                      aria-label="Close"
                    >
                      &times;
                    </button>
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <i className="fas fa-building"></i>
                      View Properties
                    </h2>
                    {/* Selector Tabs */}
                    <div className="flex gap-2 mb-4">
                      <button
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${propertyTab === 'public' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}
                        onClick={() => handleTabChange('public')}
                      >
                        Public
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${propertyTab === 'registered' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}
                        onClick={() => handleTabChange('registered')}
                      >
                        Registered
                      </button>
                      <button
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${propertyTab === 'mine' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-50'}`}
                        onClick={() => handleTabChange('mine')}
                      >
                        Only mine
                      </button>
                    </div>
                    {propertiesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <i className="fas fa-spinner fa-spin text-2xl text-emerald-700"></i>
                        <span className="ml-3 text-gray-600">Loading...</span>
                      </div>
                    ) : propertiesError ? (
                      <div className="text-red-600 py-4">{propertiesError}</div>
                    ) : properties.length === 0 ? (
                      <div className="text-gray-600 py-4">No properties found.</div>
                    ) : (
                      <div className="overflow-y-auto max-h-96 divide-y divide-gray-100">
                        {properties.map((prop) => (
                          <div key={prop.id} className="py-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-gray-800">{prop.title || 'Untitled Property'}</div>
                                <div className="text-sm text-gray-500">{prop.location}</div>
                                {prop.price && (
                                  <div className="text-sm text-emerald-700 font-bold">RWF {prop.price.toLocaleString()}</div>
                                )}
                                {prop.description && (
                                  <div className="text-xs text-gray-600 mt-1">{prop.description}</div>
                                )}
                              </div>
                              {prop.owner_name && (
                                <div className="text-xs text-gray-400 text-right">By: {prop.owner_name}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                <div className="flex flex-col sm:flex-row gap-6 pb-6 border-b border-gray-200">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-32 h-32 rounded-lg bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                      {profilePicturePreview ? (
                        <img 
                          src={profilePicturePreview} 
                          alt="Profile" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center">
                          <i className="fas fa-user text-4xl text-gray-400 mb-2 block"></i>
                          <p className="text-xs text-gray-500">No photo</p>
                        </div>
                      )}
                    </div>
                    <label htmlFor="profilePicture" className="cursor-pointer px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium rounded-lg transition-colors">
                      Upload Photo
                    </label>
                    <input
                      type="file"
                      id="profilePicture"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      disabled={saving}
                      className="hidden"
                    />
                    <p className="text-xs text-gray-500 text-center">Max 2 MB, JPG/PNG</p>
                  </div>

                  <div className="flex-1 flex flex-col justify-center gap-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Full Name</p>
                      <p className="text-lg font-semibold text-gray-800">{formData.firstName} {formData.lastName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
                      <p className="text-sm text-gray-700">{formData.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
                      <p className="text-sm text-gray-700">{formData.phone || 'Not set'}</p>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={saving}
                      className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                        errors.firstName ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.firstName && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-xs"></i> {errors.firstName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={saving}
                      className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                        errors.lastName ? 'border-red-500' : 'border-gray-200'
                      }`}
                    />
                    {errors.lastName && (
                      <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                        <i className="fas fa-exclamation-circle text-xs"></i> {errors.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email Address * (Read-only)
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    disabled={true}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-base bg-gray-50 text-gray-600 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1.5">Email cannot be changed. Contact support if you need to update it.</p>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="+250 7XX XXX XXX"
                    className={`w-full px-4 py-2.5 border rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed ${
                      errors.phone ? 'border-red-500' : 'border-gray-200'
                    }`}
                  />
                  {errors.phone && (
                    <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
                      <i className="fas fa-exclamation-circle text-xs"></i> {errors.phone}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-1.5">Rwanda format: +250 7XX XXX XXX or 07XX XXX XXX</p>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    disabled={saving}
                    rows={3}
                    placeholder="City, District, or full address"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-base transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving || tokenExpired}
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium px-5 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Saving...
                      </>
                    ) : tokenExpired ? (
                      <>
                        <i className="fas fa-lock"></i>
                        Session Expired
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check"></i>
                        Save Changes
                      </>
                    )}
                  </button>
                  {tokenExpired && (
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <i className="fas fa-redo"></i>
                      Reload Page
                    </button>
                  )}
                  <Link
                    href="/dashboard"
                    className="px-5 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 font-medium rounded-lg transition-colors text-center"
                  >
                    Cancel
                  </Link>
                </div>

              </form>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex gap-3">
                <i className="fas fa-info-circle text-blue-700 text-lg mt-0.5"></i>
                <div className="flex-1 text-sm text-gray-700">
                  <p className="font-medium text-gray-800 mb-1">Profile Information</p>
                  <p className="text-gray-600">
                    Your profile information is synced with our database in real-time. Profile pictures are stored securely. Changes are saved immediately.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </main>

        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center">
                    <i className="fas fa-map-marked-alt text-white text-lg"></i>
                  </div>
                  <span className="text-lg font-bold text-white">LandVal</span>
                </div>
                <p className="text-sm text-gray-400">Rwanda's trusted land valuation platform.</p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Resources</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Docs</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">FAQ</a></li>
                  <li><Link href="/notifications" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">About</a></li>
                  <li><a href="#" className="hover:text-emerald-400 transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/legal/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link></li>
                  <li><Link href="/legal/terms" className="hover:text-emerald-400 transition-colors">Terms</Link></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
              © {new Date().getFullYear()} LandVal. All rights reserved.
            </div>
          </div>
        </footer>

      </div>
    </>
  );
};

export default Profile;
