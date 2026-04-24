// ...existing code from src/pages/dashboard/properties.tsx...
import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../../src/utils/image';
import adminHierarchyRaw from '../../src/data/land_admin_hierarchy_from_csv.json';

type Property = {
	id: number;
	owner_id: number;
	upi?: string;
	area_sqm?: number;
	market_price_rwf?: number;
	title: string;
	description?: string;
	property_type: string;
	province?: string;
	district: string;
	sector: string;
	cell?: string;
	village?: string;
	latitude?: number;
	longitude?: number;
	price: number;
	status: string;
	visibility: 'public' | 'registered' | 'only_me';
	created_at: string;
	images?: string[];
};

type EditableProperty = {
	id: number;
	upi: string;
	area_sqm: string;
	market_price_rwf: string;
	title: string;
	description: string;
	property_type: string;
	province: string;
	district: string;
	sector: string;
	cell: string;
	village: string;
	latitude: string;
	longitude: string;
	price: string;
	status: string;
	visibility: 'public' | 'registered' | 'only_me';
	images: string[];
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
const CARD_PLACEHOLDER = 'https://placehold.co/192x192/e5e7eb/6b7280?text=No+Image';

type AdminHierarchy = {
	[province: string]: {
		[district: string]: {
			[sector: string]: {
				[cell: string]: string[];
			};
		};
	};
};

function DashboardPropertiesPage() {
	const router = useRouter();
	const { data: session, status } = useSession();
	const adminHierarchy: AdminHierarchy = adminHierarchyRaw as AdminHierarchy;

	// State variables
	const [loading, setLoading] = useState(true);
	const [properties, setProperties] = useState<Property[]>([]);
	const [currentUserId, setCurrentUserId] = useState<number | null>(null);
	const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
	const [editing, setEditing] = useState<EditableProperty | null>(null);
	const [deletingId, setDeletingId] = useState<number | null>(null);
	const [editingImages, setEditingImages] = useState<string[]>([]);
	const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);

	// Get unique location names for dropdowns
	const provinceNames = useMemo(() => Object.keys(adminHierarchy), [adminHierarchy]);
	const districtNames = useMemo(() => {
		if (!editing?.province) return [];
		return Object.keys(adminHierarchy[editing.province] || {});
	}, [editing?.province, adminHierarchy]);
	const sectorNames = useMemo(() => {
		if (!editing?.province || !editing?.district) return [];
		return Object.keys(adminHierarchy[editing.province]?.[editing.district] || {});
	}, [editing?.province, editing?.district, adminHierarchy]);
	const cellNames = useMemo(() => {
		if (!editing?.province || !editing?.district || !editing?.sector) return [];
		return Object.keys(adminHierarchy[editing.province]?.[editing.district]?.[editing.sector] || {});
	}, [editing?.province, editing?.district, editing?.sector, adminHierarchy]);
	const villageNames = useMemo(() => {
		if (!editing?.province || !editing?.district || !editing?.sector || !editing?.cell) return [];
		return adminHierarchy[editing.province]?.[editing.district]?.[editing.sector]?.[editing.cell] || [];
	}, [editing?.province, editing?.district, editing?.sector, editing?.cell, adminHierarchy]);

	// Fetch current user and properties using NextAuth session
	useEffect(() => {
		const fetchData = async () => {
			try {
				if (status === 'loading') return; // Wait for session to load
				if (!session || !session.accessToken) {
					router.push('/auth/login');
					return;
				}

				const userRes = await fetch(`${API_BASE_URL}/api/auth/me`, {
					headers: { Authorization: `Bearer ${session.accessToken}` }
				});
				if (!userRes.ok) throw new Error('Failed to fetch user');
				const userData = await userRes.json();

				setCurrentUserId(userData.id);
				setCurrentUserRole(userData.role || null);

				// Fetch properties
				const propsRes = await fetch(`${API_BASE_URL}/api/properties/user/${userData.id}`, {
					headers: { Authorization: `Bearer ${session.accessToken}` }
				});
				if (!propsRes.ok) throw new Error('Failed to fetch properties');
				const propsData = await propsRes.json();
				setProperties(propsData);
			} catch (error) {
				console.error('Error fetching data:', error);
				toast.error('Failed to load properties');
			} finally {
				setLoading(false);
			}
		};
		fetchData();
	}, [router, session, status]);

	const openEdit = (property: Property) => {
		setEditing({
			id: property.id,
			upi: property.upi?.toString() || '',
			area_sqm: property.area_sqm?.toString() || '',
			market_price_rwf: property.market_price_rwf?.toString() || '',
			title: property.title,
			description: property.description || '',
			property_type: property.property_type,
			province: property.province || '',
			district: property.district,
			sector: property.sector,
			cell: property.cell || '',
			village: property.village || '',
			latitude: property.latitude?.toString() || '',
			longitude: property.longitude?.toString() || '',
			price: property.price.toString(),
			status: property.status,
			visibility: property.visibility,
			images: property.images || []
		});
		setEditingImages(property.images || []);
		setImagesToRemove([]);
	};

	const removeExistingImage = (index: number) => {
		const imageToRemove = editingImages[index];
		setImagesToRemove(prev => [...prev, imageToRemove]);
		setEditingImages(prev => prev.filter((_, i) => i !== index));
	};

	const updateProperty = async () => {
		if (!editing) return;
		if (!session || !session.accessToken) {
			toast.error('Please login again');
			router.push('/auth/login');
			return;
		}

		// Helper to safely parse numbers or return null
		const safeParseFloat = (val: string) => {
			if (val === undefined || val === null || val.trim() === '') return null;
			const num = parseFloat(val);
			return isNaN(num) ? null : num;
		};

		try {
			const response = await fetch(`${API_BASE_URL}/api/properties/${editing.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.accessToken}`
				},
				body: JSON.stringify({
					upi: editing.upi || null,
					area_sqm: safeParseFloat(editing.area_sqm),
					market_price_rwf: safeParseFloat(editing.market_price_rwf),
					title: editing.title,
					description: editing.description,
					property_type: editing.property_type,
					province: editing.province,
					district: editing.district,
					sector: editing.sector,
					cell: editing.cell,
					village: editing.village,
					latitude: safeParseFloat(editing.latitude),
					longitude: safeParseFloat(editing.longitude),
					price: safeParseFloat(editing.price),
					status: editing.status,
					visibility: editing.visibility,
					images_to_remove: imagesToRemove
				})
			});

			if (!response.ok) throw new Error('Failed to update property');

			const updatedProperty = await response.json();
			setProperties(prev => prev.map(p => p.id === editing.id ? updatedProperty : p));
			toast.success('Property updated successfully');
			setEditing(null);
		} catch (error) {
			console.error('Error updating property:', error);
			toast.error('Failed to update property');
		}
	};

	const deleteProperty = async (id: number) => {
		if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) return;
		setDeletingId(id);
		if (!session || !session.accessToken) {
			toast.error('Please login again');
			setDeletingId(null);
			router.push('/auth/login');
			return;
		}

		try {
			const response = await fetch(`${API_BASE_URL}/api/properties/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${session.accessToken}` }
			});

			if (!response.ok) throw new Error('Failed to delete property');
      
			setProperties(prev => prev.filter(p => p.id !== id));
			toast.success('Property deleted successfully');
		} catch (error) {
			console.error('Error deleting property:', error);
			toast.error('Failed to delete property');
		} finally {
			setDeletingId(null);
		}
	};

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-RW').format(price);
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="text-gray-600">Loading your properties...</div>
				</div>
			</div>
		);
	}

	return (
		<>
			<Head>
				<title>My Properties | Dashboard</title>
				<meta name="description" content="View, update, and delete your registered properties." />
			</Head>

			<main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
				<div className="max-w-6xl mx-auto">
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
						<div>
							<h1 className="text-2xl font-bold text-gray-900">My Registered Properties</h1>
							<p className="text-sm text-gray-600">View, update, or delete your own listings.</p>
						</div>

						<div className="flex items-center gap-2">
							<Link
								href="/properties/add"
								className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors"
							>
								Add New Property
							</Link>
							<Link
								href="/dashboard"
								className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
							>
								Back to Dashboard
							</Link>
						</div>
					</div>

					{properties.length === 0 ? (
						<div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
							<p className="text-gray-700 mb-4">No registered properties found for your account.</p>
							<Link
								href="/properties/add"
								className="inline-block px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors"
							>
								Register Your First Property
							</Link>
						</div>
					) : (
						<div className="space-y-4">
							{properties.map((property) => {
								const thumbnail = resolveImageUrl(property.images?.[0]) || CARD_PLACEHOLDER;
								return (
									<div key={property.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
										<div className="flex flex-col lg:flex-row lg:items-start gap-4">
											<div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
												<img
													src={thumbnail}
													alt={property.title}
													className="w-full h-full object-cover"
													onError={(e) => {
														e.currentTarget.src = CARD_PLACEHOLDER;
													}}
												/>
											</div>

											<div className="flex-1 min-w-0">
												<h2 className="text-lg font-semibold text-gray-900">{property.title}</h2>
												{/* Additional property details */}
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
													{property.upi && (
														<p className="text-xs text-gray-500">UPI: {property.upi}</p>
													)}
													{property.area_sqm && (
														<p className="text-xs text-gray-500">Area: {property.area_sqm.toLocaleString()} sqm</p>
													)}
													{property.market_price_rwf && (
														<p className="text-xs text-gray-500">Market Price: {formatPrice(property.market_price_rwf)} RWF</p>
													)}
													<p className="text-xs text-gray-500">Type: {property.property_type}</p>
													<p className="text-xs text-gray-500">Status: {property.status}</p>
													<p className="text-xs text-gray-500">Visibility: {property.visibility}</p>
												</div>
												<p className="text-sm text-gray-600 mt-2">{property.district}, {property.sector}</p>
												<p className="text-sm text-gray-800 font-semibold mt-1">Price: {formatPrice(property.price)} RWF</p>
												<p className="text-xs text-gray-400 mt-2">ID: {property.id} | Owner ID: {property.owner_id}</p>
											</div>

											<div className="flex items-center gap-2">
												<button
													onClick={() => openEdit(property)}
													className="px-3 py-2 rounded-lg border border-blue-600 text-blue-700 hover:bg-blue-50 transition-colors"
												>
													Update
												</button>
												<button
													onClick={() => deleteProperty(property.id)}
													disabled={deletingId === property.id}
													className="px-3 py-2 rounded-lg border border-red-600 text-red-700 hover:bg-red-50 disabled:opacity-60 transition-colors"
												>
													{deletingId === property.id ? 'Deleting...' : 'Delete'}
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>

				{/* Edit Modal */}
				{editing && (
					<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
						<div className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8">
							<div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl flex justify-between items-center">
								<h3 className="text-xl font-semibold text-gray-900">Update Property #{editing.id}</h3>
								<button
									onClick={() => setEditing(null)}
									className="text-gray-400 hover:text-gray-600 text-2xl"
									aria-label="Close"
								>
									&times;
								</button>
							</div>

							<div className="p-6 space-y-4 max-h-[calc(90vh-80px)] overflow-y-auto">
								{/* Basic Information */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">UPI (Unique Parcel ID)</label>
										<input
											value={editing.upi}
											onChange={(e) => setEditing({ ...editing, upi: e.target.value })}
											className="w-full border border-gray-300 rounded-lg px-3 py-2"
											placeholder="Enter UPI"
											disabled={currentUserRole !== 'admin'}
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Area (sqm)</label>
										<input
											type="number"
											value={editing.area_sqm}
											onChange={(e) => setEditing({ ...editing, area_sqm: e.target.value })}
											className="w-full border border-gray-300 rounded-lg px-3 py-2"
											placeholder="Area in square meters"
											disabled={currentUserRole !== 'admin'}
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Market Price (RWF)</label>
									<input
										type="number"
										value={editing.market_price_rwf}
										onChange={(e) => setEditing({ ...editing, market_price_rwf: e.target.value })}
										className="w-full border border-gray-300 rounded-lg px-3 py-2"
										placeholder="Estimated market price"
										disabled={currentUserRole !== 'admin'}
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
									<input
										value={editing.title}
										onChange={(e) => setEditing({ ...editing, title: e.target.value })}
										className="w-full border border-gray-300 rounded-lg px-3 py-2"
										placeholder="Property title"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
									<textarea
										value={editing.description}
										onChange={(e) => setEditing({ ...editing, description: e.target.value })}
										className="w-full border border-gray-300 rounded-lg px-3 py-2"
										rows={3}
										placeholder="Property description"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-1">Property Type</label>
									<input
										value={editing.property_type}
										onChange={(e) => setEditing({ ...editing, property_type: e.target.value })}
										className="w-full border border-gray-300 rounded-lg px-3 py-2"
										placeholder="e.g., Residential, Commercial, Agricultural"
									/>
								</div>

								{/* Location Information */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
										<select
											value={editing.province}
											onChange={(e) =>
												setEditing({ ...editing, province: e.target.value, district: '', sector: '', cell: '', village: '' })
											}
											className="w-full border border-gray-300 rounded-lg px-3 py-2"
										>
											<option value="">Select Province</option>
											{provinceNames.map((province) => (
												<option key={province} value={province}>{province}</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">District</label>
										<select
											value={editing.district}
											onChange={(e) => setEditing({ ...editing, district: e.target.value, sector: '', cell: '', village: '' })}
											disabled={!editing.province}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
										>
											<option value="">Select District</option>
											{districtNames.map((district) => (
												<option key={district} value={district}>{district}</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
										<select
											value={editing.sector}
											onChange={(e) => setEditing({ ...editing, sector: e.target.value, cell: '', village: '' })}
											disabled={!editing.district}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
										>
											<option value="">Select Sector</option>
											{sectorNames.map((sector) => (
												<option key={sector} value={sector}>{sector}</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Cell</label>
										<select
											value={editing.cell}
											onChange={(e) => setEditing({ ...editing, cell: e.target.value, village: '' })}
											disabled={!editing.sector}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
										>
											<option value="">Select Cell</option>
											{cellNames.map((cell) => (
												<option key={cell} value={cell}>{cell}</option>
											))}
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
										<select
											value={editing.village}
											onChange={(e) => setEditing({ ...editing, village: e.target.value })}
											disabled={!editing.cell}
											className="w-full border border-gray-300 rounded-lg px-3 py-2 disabled:bg-gray-100"
										>
											<option value="">Select Village</option>
											{villageNames.map((village) => (
												<option key={village} value={village}>{village}</option>
											))}
										</select>
									</div>
								</div>

								{/* Coordinates */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
										<input
											value={editing.latitude}
											onChange={(e) => setEditing({ ...editing, latitude: e.target.value })}
											className="w-full border border-gray-300 rounded-lg px-3 py-2"
											placeholder="Latitude"
										/>
									</div>
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
										<input
											value={editing.longitude}
											onChange={(e) => setEditing({ ...editing, longitude: e.target.value })}
											className="w-full border border-gray-300 rounded-lg px-3 py-2"
											placeholder="Longitude"
										/>
									</div>
								</div>

								{/* Pricing and Status */}
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (RWF)</label>
										<input
											type="number"
											value={editing.price}
											onChange={(e) => setEditing({ ...editing, price: e.target.value })}
											className="w-full border border-gray-300 rounded-lg px-3 py-2"
											placeholder="Selling price"
											disabled={currentUserRole !== 'admin'}
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
										<select
											value={editing.status}
											onChange={(e) => setEditing({ ...editing, status: e.target.value })}
											className="w-full border border-gray-300 rounded-lg px-3 py-2"
										>
											<option value="available">Available</option>
											<option value="pending">Pending</option>
											<option value="sold">Sold</option>
											<option value="rented">Rented</option>
										</select>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
										<select
											value={editing.visibility}
											onChange={(e) => setEditing({ ...editing, visibility: e.target.value as 'public' | 'registered' | 'only_me' })}
											className="w-full border border-gray-300 rounded-lg px-3 py-2"
										>
											<option value="public">Public</option>
											<option value="registered">Registered Users Only</option>
											<option value="only_me">Only Me</option>
										</select>
									</div>
								</div>

								{/* Images Section */}
								<div className="border-t pt-4">
									<h4 className="text-sm font-semibold text-gray-900 mb-3">Property Images</h4>
									<div className="mb-4">
										<p className="text-xs text-gray-600 mb-2">Current Images</p>
										<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
											{editingImages.length > 0 ? (
												editingImages.map((imageUrl, index) => (
													<div key={`${imageUrl}-${index}`} className="relative group rounded-lg overflow-hidden bg-gray-200 h-24">
														<img
															src={resolveImageUrl(imageUrl) || CARD_PLACEHOLDER}
															alt={`Property image ${index + 1}`}
															className="w-full h-full object-cover"
															onError={(e) => {
																e.currentTarget.src = CARD_PLACEHOLDER;
															}}
														/>
														<button
															type="button"
															onClick={() => removeExistingImage(index)}
															className="absolute inset-0 bg-red-600/0 group-hover:bg-red-600/70 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center"
														>
															Remove
														</button>
													</div>
												))
											) : (
												<div className="col-span-full rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500 text-center">
													No images available for this property.
												</div>
											)}
										</div>
									</div>
								</div>
							</div>

							<div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-xl flex justify-end gap-3">
								<button
									onClick={() => setEditing(null)}
									className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
								>
									Cancel
								</button>
								<button
									onClick={updateProperty}
									className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-medium hover:bg-emerald-800 transition-colors"
								>
									Save Changes
								</button>
							</div>
						</div>
					</div>
				)}
			</main>
		</>
	);
}

export default DashboardPropertiesPage;
