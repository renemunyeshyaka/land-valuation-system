
import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PropertyCard from '../src/components/property/PropertyCard';

interface Property {
  id: string;
  title: string;
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
  const [currentPage, setCurrentPage] = useState(1);
  const propertiesPerPage = 12;

  // Sample properties for demo
  const sampleProperties: Property[] = [
    {
      id: '1',
      title: 'Modern Family Home in Kicukiro',
      images: [
        'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80'
      ],
      status: 'available',
      isDiaspora: true,
      isVerified: true,
      district: 'Kicukiro',
      sector: 'Nyarugunga',
      price: 95000000,
      pricePerSqm: 120000,
      landSize: 800,
      sizeUnit: 'sqm',
      features: ['3 Bedrooms', '2 Bathrooms', 'Garden', 'Garage'],
      gazetteReference: 'GZT-2024-001',
      zoneCoefficient: '1.5',
      views: 120,
      interested: 8
    },
    {
      id: '2',
      title: 'Prime Plot in Gasabo',
      images: [
        'https://images.unsplash.com/photo-1460518451285-97b6aa326961?auto=format&fit=crop&w=400&q=80'
      ],
      status: 'pending',
      isDiaspora: false,
      isVerified: true,
      district: 'Gasabo',
      sector: 'Remera',
      price: 45000000,
      pricePerSqm: 90000,
      landSize: 500,
      sizeUnit: 'sqm',
      features: ['Near Main Road', 'Utilities Connected'],
      gazetteReference: 'GZT-2024-002',
      zoneCoefficient: '1.2',
      views: 80,
      interested: 3
    },
    {
      id: '3',
      title: 'Affordable Land in Nyarugenge',
      images: [],
      status: 'available',
      isDiaspora: false,
      isVerified: false,
      district: 'Nyarugenge',
      sector: 'Kimisagara',
      price: 25000000,
      pricePerSqm: 60000,
      landSize: 400,
      sizeUnit: 'sqm',
      features: ['Flat Terrain'],
      gazetteReference: '',
      zoneCoefficient: '1.0',
      views: 40,
      interested: 1
    },
    {
      id: '4',
      title: 'Luxury Villa in Bugesera',
      images: [
        'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=400&q=80'
      ],
      status: 'available',
      isDiaspora: true,
      isVerified: true,
      district: 'Bugesera',
      sector: 'Nyamata',
      price: 180000000,
      pricePerSqm: 200000,
      landSize: 1200,
      sizeUnit: 'sqm',
      features: ['5 Bedrooms', 'Swimming Pool', 'Lake View', 'Private Security'],
      gazetteReference: 'GZT-2024-003',
      zoneCoefficient: '2.0',
      views: 200,
      interested: 15
    }
  ];

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiUrl}/api/v1/marketplace/properties-for-sale`);
        if (!res.ok) throw new Error('Failed to fetch properties');
        const data = await res.json();
        if (data?.data && data.data.length > 0) {
          setProperties(data.data);
        } else {
          setProperties(sampleProperties);
        }
      } catch (err: any) {
        setError(err.message || 'Unknown error');
        setProperties(sampleProperties); // fallback to samples on error
      } finally {
        setLoading(false);
      }
    }
    fetchProperties();
  }, []);

  // Pagination logic
  const totalPages = Math.ceil(properties.length / propertiesPerPage);
  const paginatedProperties = properties.slice(
    (currentPage - 1) * propertiesPerPage,
    currentPage * propertiesPerPage
  );
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

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
              <div className="flex items-center gap-3">
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
        </nav>

        {/* Main Marketplace Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
          <h1 className="text-3xl font-bold mb-2 text-center">Marketplace</h1>
          <p className="text-gray-600 mb-8 text-center">Browse properties for sale. Use filters and search to find your ideal property.</p>

          {loading && (
            <div className="text-center py-10 text-lg text-gray-500">Loading properties...</div>
          )}
          {error && (
            <div className="text-center py-10 text-red-500">{error}</div>
          )}
          {!loading && !error && properties.length === 0 && (
            <div className="text-center py-10 text-gray-400">No properties found.</div>
          )}
          {!loading && !error && properties.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                {paginatedProperties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
                {/* Fill empty slots for symmetry */}
                {Array.from({ length: propertiesPerPage - paginatedProperties.length }).map((_, idx) => (
                  <div key={idx} className="invisible" />
                ))}
              </div>
              {/* Pagination Controls */}
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  className="px-4 py-2 rounded-lg border bg-white text-emerald-700 font-semibold hover:bg-emerald-50 disabled:opacity-50"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Back
                </button>
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    className={`px-3 py-2 rounded-lg font-semibold border ${currentPage === i + 1 ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-700 hover:bg-emerald-50'}`}
                    onClick={() => handlePageChange(i + 1)}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  className="px-4 py-2 rounded-lg border bg-white text-emerald-700 font-semibold hover:bg-emerald-50 disabled:opacity-50"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </main>

        {/* Footer (copied from homepage) */}
        <footer className="bg-emerald-950 text-emerald-200 py-12 mt-12">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <div className="flex items-center gap-2 text-white">
                <i className="fas fa-map-marked-alt text-2xl"></i>
                <span className="font-bold text-xl">LandVal</span>
              </div>
              <p className="text-sm mt-3">The most trusted land valuation and land marketplace in Rwanda. All gazette data sourced from official publications.</p>
              <div className="flex gap-4 mt-5">
                <i className="fab fa-twitter hover:text-white text-xl"></i>
                <i className="fab fa-linkedin hover:text-white text-xl"></i>
                <i className="fab fa-whatsapp hover:text-white text-xl"></i>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-white">Product</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Valuation</li>
                <li>Marketplace</li>
                <li>Pricing</li>
                <li>API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white">Resources</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li>Gazette 2025</li>
                <li>Help center</li>
                <li>Blog</li>
                <li>Developers</li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white">Legal</h4>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link href="/privacy" className="hover:text-white transition">Privacy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition">Terms</Link></li>
                <li>Copyright©</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-emerald-800 mt-10 pt-6 text-center text-xs text-emerald-400">
            © 2026 Land Valuation System Ltd. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}
