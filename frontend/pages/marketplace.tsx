
import React, { useEffect, useState } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sample properties removed (no longer used)

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const res = await fetch(`${apiUrl}/api/v1/marketplace/properties-for-sale?t=${Date.now()}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error('Failed to fetch properties');
        const data = await res.json();
        // The backend returns { data: { data: [...] } }
        const propertyArray = data?.data?.data;
        if (Array.isArray(propertyArray)) {
          if (propertyArray.length > 0) {
            // Map null images/features to empty arrays for compatibility
            const normalized = propertyArray.map((p: any) => ({
              ...p,
              images: Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []),
              features: Array.isArray(p.features) ? p.features : (p.features ? [p.features] : []),
            }));
            // Keep most recently created properties first on page 1.
            normalized.sort((a: any, b: any) => {
              const ta = Date.parse(a?.created_at || '');
              const tb = Date.parse(b?.created_at || '');
              if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return tb - ta;
              const ia = Number(a?.id || 0);
              const ib = Number(b?.id || 0);
              return ib - ia;
            });
            setProperties(normalized);
          } else {
            setProperties([]); // Backend returned empty array
          }
        } else {
          setError('Unexpected API response.');
          setProperties([]);
          if (typeof window !== 'undefined') {
            // Log for debugging
            // eslint-disable-next-line no-console
            console.error('API response:', data);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setProperties([]); // No fallback to samples on error
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, []);

  // Filtered and paginated properties
  const filtered = properties.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      p.title?.toLowerCase().includes(s) ||
      p.district?.toLowerCase().includes(s) ||
      p.sector?.toLowerCase().includes(s) ||
      (p.description?.toLowerCase().includes(s) ?? false)
    );
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

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
            <input
              type="text"
              placeholder="Search by title, district, sector, or description..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <div className="flex gap-2 mt-2 sm:mt-0">
              <button
                className="px-4 py-2 bg-gray-200 rounded-lg text-gray-700 font-semibold hover:bg-gray-300"
                onClick={() => { setSearch(''); setCurrentPage(1); }}
                disabled={!search}
              >
                Clear
              </button>
            </div>
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
