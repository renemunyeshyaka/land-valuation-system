
import React, { useEffect, useState, useRef } from 'react';
import adminHierarchyRaw from '../src/data/land_admin_hierarchy_from_csv.json';
import Head from 'next/head';
import Link from 'next/link';
import PropertyCard from '../src/components/property/PropertyCard';
import Footer from '@/components/Footer';

interface Property {
  id: string;
  title: string;
  description?: string;
  images?: string[];
  status: string;
  isDiaspora?: boolean;
  isVerified?: boolean;
  district?: string;
  sector?: string;
  price: number;
  pricePerSqm?: number;
  landSize?: number;
  sizeUnit?: string;
  features?: string[];
  gazetteReference?: string;
  zoneCoefficient?: string;
  views?: number;
  interested?: number;
}



export default function Marketplace() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(16); // Properties per page
  const [search, setSearch] = useState('');
  // Dependent selector state
  type AdminHierarchy = {
    [province: string]: {
      [district: string]: {
        [sector: string]: {
          [cell: string]: string[];
        };
      };
    };
  };
  const adminHierarchy: AdminHierarchy = adminHierarchyRaw as AdminHierarchy;
  const provinceNames = Object.keys(adminHierarchy);
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [sector, setSector] = useState('');
  const [cell, setCell] = useState('');
  const [village, setVillage] = useState('');
  const [type, setType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Dependent dropdown options
  const districtNames = province ? Object.keys(adminHierarchy[province] || {}) : [];
  const sectorNames = province && district ? Object.keys((adminHierarchy[province] || {})[district] || {}) : [];
  const cellNames = province && district && sector ? Object.keys(((adminHierarchy[province] || {})[district] || {})[sector] || {}) : [];
  const villageNames = province && district && sector && cell ? (((adminHierarchy[province] || {})[district] || {})[sector] || {})[cell] || [] : [];

  // Property types (hardcoded for now)
  const propertyTypes = [
    { value: '', label: 'All Types' },
    { value: 'residential', label: 'Residential Land' },
    { value: 'commercial', label: 'Commercial Land' },
    { value: 'agricultural', label: 'Agricultural Land' },
    { value: 'industrial', label: 'Industrial Land' },
    { value: 'mixed', label: 'Mixed Use' },
  ];

  // Price ranges (can be improved)
  const priceRanges = [
    { value: '', label: 'Any Price' },
    { value: '0-1000000', label: 'Up to 1M RWF' },
    { value: '1000000-5000000', label: '1M - 5M RWF' },
    { value: '5000000-20000000', label: '5M - 20M RWF' },
    { value: '20000000-100000000', label: '20M - 100M RWF' },
    { value: '100000000-', label: '100M+ RWF' },
  ];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sample properties removed (no longer used)

  // --- Real-time property updates via WebSocket (with fallback polling) ---
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch properties from API
  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const res = await fetch(`${apiUrl}/api/v1/marketplace/properties-for-sale?t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch properties');
      const data = await res.json();
      const propertyArray = data?.data?.data;
      if (Array.isArray(propertyArray)) {
        setProperties(propertyArray);
      } else {
        setProperties([]);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ws: WebSocket | null = null;
    let polling: NodeJS.Timeout | null = null;
    let closedByClient = false;

    // Helper to start polling if WS fails
    const startPolling = () => {
      if (!polling) {
        polling = setInterval(fetchProperties, 45000); // 45s fallback polling
        pollingRef.current = polling;
      }
    };

    // Try to connect to WebSocket for real-time updates
    try {
      const wsUrl = (process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5001') + '/ws/marketplace';
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // On connect, fetch initial data
        fetchProperties();
        // Stop polling if running
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
      ws.onmessage = (event) => {
        // Expecting a message like { type: 'property_update' }
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'property_update') {
            fetchProperties();
          }
        } catch {}
      };
      ws.onerror = () => {
        // On error, fallback to polling
        startPolling();
      };
      ws.onclose = () => {
        if (!closedByClient) startPolling();
      };
    } catch {
      // If WS fails to construct, fallback to polling
      startPolling();
    }

    // Cleanup on unmount
    return () => {
      closedByClient = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, []);

  // Filtered and paginated properties
  const filtered = properties.filter((p) => {
    // Text search
    const s = search.toLowerCase();
    const matchesText = !search ||
      p.title?.toLowerCase().includes(s) ||
      p.district?.toLowerCase().includes(s) ||
      p.sector?.toLowerCase().includes(s) ||
      (p.description?.toLowerCase().includes(s) ?? false);

    // Dependent selectors (only use fields that exist in Property interface)
    // No province, cell, or village in Property interface, so skip those
    const matchesDistrict = !district || p.district === district;
    const matchesSector = !sector || p.sector === sector;
    // No type field in Property interface, so skip type filtering or use a fallback if available
    const matchesType = true;
    let matchesPrice = true;
    if (priceMin || priceMax) {
      const price = Number(p.price);
      if (priceMin && price < Number(priceMin)) matchesPrice = false;
      if (priceMax && price > Number(priceMax)) matchesPrice = false;
    }

    return matchesText && matchesDistrict && matchesSector && matchesType && matchesPrice;
  });
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Navigation handlers
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Pagination logic removed

  return (
    <>
      <Head>
        <title>Marketplace · Land Valuation System</title>
      </Head>
      <div className="antialiased text-gray-800 min-h-screen flex flex-col">
        {/* Navigation Bar (copied from homepage) */}
        <nav className="bg-white/90 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16 md:h-20">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center shadow-sm">
                  <i className="fas fa-map-marked-alt text-white text-lg"></i>
                </div>
                <span className="font-bold text-xl tracking-tight text-emerald-900">
                  Land<span className="text-emerald-600">Val</span>
                </span>
              </div>
              <div className="hidden md:flex space-x-7 text-sm font-medium text-gray-700">
                <Link href="/" className="hover:text-emerald-700 transition">Home</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition">How it works</Link>
                <Link href="/benefits" className="hover:text-emerald-700 transition">Benefits</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition">Marketplace</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition">Contact</Link>
              </div>
              <div className="md:hidden flex items-center">
                <button
                  aria-label="Open menu"
                  className="inline-flex items-center justify-center p-2 rounded-md text-emerald-800 hover:text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  onClick={() => setMobileMenuOpen(v => !v)}
                >
                  {mobileMenuOpen ? (
                    <i className="fas fa-times text-2xl"></i>
                  ) : (
                    <i className="fas fa-bars text-2xl"></i>
                  )}
                </button>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="hidden sm:flex items-center border border-gray-200 rounded-full px-3 py-1.5 text-sm bg-white/80">
                  <i className="fas fa-globe text-emerald-600 mr-1 text-xs"></i>
                  <span className="font-medium">RW</span>
                  <i className="fas fa-chevron-down ml-1 text-gray-400 text-xs"></i>
                </div>
                <Link href="/auth/login" className="text-sm font-medium text-emerald-800 hover:text-emerald-900 px-3 py-2">Log in</Link>
                <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition">Sign up</Link>
              </div>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden bg-white/95 border-b border-gray-200/70 shadow-lg absolute left-0 right-0 top-full z-40">
              <div className="flex flex-col px-6 py-4 space-y-2 text-base font-medium text-gray-800">
                <Link href="/" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>How it works</Link>
                <Link href="/benefits" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>Benefits</Link>
                <Link href="/marketplace" className="text-emerald-700 font-semibold" onClick={() => setMobileMenuOpen(false)}>Marketplace</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
                <div className="flex flex-col gap-2 mt-2">
                  <Link href="/auth/login" className="text-emerald-800 hover:text-emerald-900 px-3 py-2 rounded-md transition text-sm font-medium bg-emerald-50" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
                  <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-3 py-2 rounded-md shadow-sm transition" onClick={() => setMobileMenuOpen(false)}>Sign up</Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Main Marketplace Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">

          <h1 className="text-3xl font-bold mb-2 text-center">Marketplace</h1>
          <p className="text-gray-600 mb-8 text-center">Browse properties for sale. Use filters and search to find your ideal property.</p>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Province */}
            <select
              value={province}
              onChange={e => { setProvince(e.target.value); setDistrict(''); setSector(''); setCell(''); setVillage(''); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Provinces</option>
              {provinceNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {/* District */}
            <select
              value={district}
              onChange={e => { setDistrict(e.target.value); setSector(''); setCell(''); setVillage(''); setCurrentPage(1); }}
              disabled={!province}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">All Districts</option>
              {districtNames.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {/* Sector */}
            <select
              value={sector}
              onChange={e => { setSector(e.target.value); setCell(''); setVillage(''); setCurrentPage(1); }}
              disabled={!district}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">All Sectors</option>
              {sectorNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Cell */}
            <select
              value={cell}
              onChange={e => { setCell(e.target.value); setVillage(''); setCurrentPage(1); }}
              disabled={!sector}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">All Cells</option>
              {cellNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Village */}
            <select
              value={village}
              onChange={e => { setVillage(e.target.value); setCurrentPage(1); }}
              disabled={!cell}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">All Villages</option>
              {villageNames.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            {/* Property Type */}
            <select
              value={type}
              onChange={e => { setType(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {propertyTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {/* Price Range */}
            <select
              value={priceMin && priceMax ? `${priceMin}-${priceMax}` : ''}
              onChange={e => {
                const val = e.target.value;
                if (!val) { setPriceMin(''); setPriceMax(''); setCurrentPage(1); return; }
                const [min, max] = val.split('-');
                setPriceMin(min);
                setPriceMax(max || '');
                setCurrentPage(1);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {priceRanges.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            {/* Text search */}
            <input
              type="text"
              placeholder="Search by title, district, sector, or description..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {/* Clear button */}
            <button
              className="w-full px-4 py-2 bg-gray-200 rounded-lg text-gray-700 font-semibold hover:bg-gray-300"
              onClick={() => {
                setSearch(''); setProvince(''); setDistrict(''); setSector(''); setCell(''); setVillage(''); setType(''); setPriceMin(''); setPriceMax(''); setCurrentPage(1);
              }}
              type="button"
            >
              Clear All
            </button>
          </div>

          {loading && (
            <div className="text-center py-10 text-lg text-gray-500">Loading properties...</div>
          )}
          {error && (
            <div className="text-center py-10 text-red-500">{error}</div>
          )}
          {!loading && !error && properties.length === 0 && (
            <div className="text-center py-10 text-gray-400">No properties found.</div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                {paginated.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>

              {/* Pagination Controls */}
              <div className="flex items-center justify-center gap-2 mt-10">
                <button
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 disabled:opacity-50"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Back
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`px-3 py-2 rounded-lg font-semibold ${page === currentPage ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    onClick={() => goToPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300 disabled:opacity-50"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </main>

        {/* Footer (copied from homepage) */}
        <Footer />
      </div>
    </>
  );
}
