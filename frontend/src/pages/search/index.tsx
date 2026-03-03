import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

/**
 * PROPERTY SEARCH PAGE · Land Valuation System
 * 
 * Purpose: Advanced property search with filters and results
 * Features:
 * - Advanced search filters
 * - Grid/List view toggle
 * - Property listings with valuations
 * - Map integration
 * - Sorting and pagination
 */

interface Property {
  id: string;
  location: string;
  district: string;
  sector: string;
  cell: string;
  propertyType: string;
  size: number;
  price: number;
  bedrooms?: number;
  bathrooms?: number;
  image: string;
  valuation: number;
  valuationDate: string;
  featured: boolean;
}

const PropertySearch: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Search filters state
  const [searchLocation, setSearchLocation] = useState('');
  const [propertyType, setPropertyType] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [sizeMin, setSizeMin] = useState('');
  const [sizeMax, setSizeMax] = useState('');
  const [sortBy, setSortBy] = useState('featured');

  // Mock property data
  const allProperties: Property[] = [
    {
      id: '1',
      location: 'Kigali Central Business District',
      district: 'Kigali',
      sector: 'Gasabo',
      cell: 'Muhima',
      propertyType: 'Commercial',
      size: 500,
      price: 250000000,
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&q=80',
      valuation: 280000000,
      valuationDate: '2026-02-15',
      featured: true,
    },
    {
      id: '2',
      location: 'Nyarutarama Residential Area',
      district: 'Kigali',
      sector: 'Kicukiro',
      cell: 'Nyarutarama',
      propertyType: 'Residential',
      size: 250,
      price: 85000000,
      bedrooms: 3,
      bathrooms: 2,
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&q=80',
      valuation: 92000000,
      valuationDate: '2026-02-10',
      featured: true,
    },
    {
      id: '3',
      location: 'Kimironko Industrial Park',
      district: 'Kigali',
      sector: 'Gasabo',
      cell: 'Kimironko',
      propertyType: 'Industrial',
      size: 1200,
      price: 180000000,
      image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=500&q=80',
      valuation: 195000000,
      valuationDate: '2026-02-05',
      featured: false,
    },
    {
      id: '4',
      location: 'Rebero Hills Apartments',
      district: 'Kigali',
      sector: 'Kicukiro',
      cell: 'Rebero',
      propertyType: 'Residential',
      size: 180,
      price: 65000000,
      bedrooms: 2,
      bathrooms: 1,
      image: 'https://images.unsplash.com/photo-1545324418-cc1ef14d4fe0?w=500&q=80',
      valuation: 70000000,
      valuationDate: '2026-01-28',
      featured: false,
    },
    {
      id: '5',
      location: 'Gisozi Farm Land',
      district: 'Kigali',
      sector: 'Gasabo',
      cell: 'Gisozi',
      propertyType: 'Agricultural',
      size: 2500,
      price: 45000000,
      image: 'https://images.unsplash.com/photo-1500595046891-76a5038bdc67?w=500&q=80',
      valuation: 48000000,
      valuationDate: '2026-01-15',
      featured: false,
    },
    {
      id: '6',
      location: 'Muhima Commercial Space',
      district: 'Kigali',
      sector: 'Gasabo',
      cell: 'Muhima',
      propertyType: 'Commercial',
      size: 300,
      price: 95000000,
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&q=80',
      valuation: 105000000,
      valuationDate: '2026-02-01',
      featured: false,
    },
    {
      id: '7',
      location: 'Kicukiro Residential Complex',
      district: 'Kigali',
      sector: 'Kicukiro',
      cell: 'Kicukiro',
      propertyType: 'Residential',
      size: 200,
      price: 58000000,
      bedrooms: 2,
      bathrooms: 2,
      image: 'https://images.unsplash.com/photo-1570129477492-45ec003f2975?w=500&q=80',
      valuation: 62000000,
      valuationDate: '2026-02-12',
      featured: false,
    },
    {
      id: '8',
      location: 'Remera Prime Location',
      district: 'Kigali',
      sector: 'Gasabo',
      cell: 'Remera',
      propertyType: 'Residential',
      size: 350,
      price: 125000000,
      bedrooms: 4,
      bathrooms: 3,
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500&q=80',
      valuation: 138000000,
      valuationDate: '2026-02-14',
      featured: true,
    },
  ];

  // Filter and sort properties
  const filteredProperties = allProperties.filter((prop) => {
    const matchLocation = prop.location.toLowerCase().includes(searchLocation.toLowerCase()) ||
                         prop.district.toLowerCase().includes(searchLocation.toLowerCase());
    const matchType = propertyType === 'all' || prop.propertyType === propertyType;
    const matchPrice = (!priceMin || prop.price >= parseInt(priceMin)) &&
                      (!priceMax || prop.price <= parseInt(priceMax));
    const matchSize = (!sizeMin || prop.size >= parseInt(sizeMin)) &&
                     (!sizeMax || prop.size <= parseInt(sizeMax));
    
    return matchLocation && matchType && matchPrice && matchSize;
  });

  // Sort properties
  const sortedProperties = [...filteredProperties].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'valuation':
        return b.valuation - a.valuation;
      case 'featured':
      default:
        return (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
    }
  });

  const handleResetFilters = () => {
    setSearchLocation('');
    setPropertyType('all');
    setPriceMin('');
    setPriceMax('');
    setSizeMin('');
    setSizeMax('');
    setSortBy('featured');
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-emerald-700"></i>
      </div>
    );
  }

  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>Property Search · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content="Search properties in Rwanda with advanced filters and valuations" />
        <meta property="og:title" content="Property Search · LandVal" />
      </Head>

      {/* MAIN LAYOUT */}
      <div className="antialiased text-gray-800 bg-gray-50/50 min-h-screen flex flex-col">

        {/* NAVIGATION */}
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
                {status === 'authenticated' && (
                  <Link href="/dashboard" className="px-4 py-2 text-sm font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors">
                    Dashboard
                  </Link>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">

            {/* Page Header */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
                Find Properties
              </h1>
              <p className="text-lg text-gray-600">
                Search and discover properties across Rwanda with detailed valuations
              </p>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8 mb-8">
              
              {/* Main Search Bar */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Search by Location
                </label>
                <input
                  type="text"
                  placeholder="Enter district, sector, or cell name..."
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                />
              </div>

              {/* Filter Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Property Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Property Type
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="all">All Types</option>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Agricultural">Agricultural</option>
                  </select>
                </div>

                {/* Price Range Min */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Price (RWF)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Price Range Max */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Price (RWF)
                  </label>
                  <input
                    type="number"
                    placeholder="999,999,999"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Size Range Min */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Min Size (sqm)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={sizeMin}
                    onChange={(e) => setSizeMin(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Size Range Max */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Max Size (sqm)
                  </label>
                  <input
                    type="number"
                    placeholder="999,999"
                    value={sizeMax}
                    onChange={(e) => setSizeMax(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="featured">Featured First</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="valuation">Valuation</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <i className="fas fa-redo mr-2"></i>
                  Reset Filters
                </button>
              </div>
            </div>

            {/* Results Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Results <span className="text-emerald-700">({sortedProperties.length})</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Showing all properties matching your criteria
                </p>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-2 bg-white rounded-lg border border-gray-200 p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-emerald-700 text-white'
                      : 'text-gray-700 hover:text-emerald-700'
                  }`}
                >
                  <i className="fas fa-th"></i>
                  <span className="hidden sm:inline ml-2">Grid</span>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-emerald-700 text-white'
                      : 'text-gray-700 hover:text-emerald-700'
                  }`}
                >
                  <i className="fas fa-list"></i>
                  <span className="hidden sm:inline ml-2">List</span>
                </button>
              </div>
            </div>

            {/* Properties Results */}
            {sortedProperties.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-100 p-12 text-center">
                <i className="fas fa-search text-5xl text-gray-300 mb-4"></i>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Properties Found</h3>
                <p className="text-gray-600 mb-6">Try adjusting your search filters</p>
                <button
                  onClick={handleResetFilters}
                  className="px-6 py-2 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {sortedProperties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/search/${property.id}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-300 transition-all group"
                  >
                    {/* Property Image */}
                    <div className="relative h-48 bg-gray-200 overflow-hidden">
                      <img
                        src={property.image}
                        alt={property.location}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {property.featured && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-emerald-700 text-white text-xs font-bold rounded-full">
                          Featured
                        </div>
                      )}
                    </div>

                    {/* Property Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-gray-800 mb-1 line-clamp-2">
                        {property.location}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        <i className="fas fa-map-marker-alt mr-1 text-emerald-700"></i>
                        {property.district}, {property.sector}
                      </p>

                      {/* Property Details */}
                      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-gray-600">Type</p>
                          <p className="font-semibold text-gray-800">{property.propertyType}</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="text-gray-600">Size</p>
                          <p className="font-semibold text-gray-800">{property.size.toLocaleString()} m²</p>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="border-t border-gray-200 pt-4">
                        <p className="text-sm text-gray-600 mb-1">Asking Price</p>
                        <p className="text-2xl font-bold text-emerald-700">
                          FRW {(property.price / 1000000).toFixed(1)}M
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Valuation: FRW {(property.valuation / 1000000).toFixed(1)}M
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="space-y-4 mb-12">
                {sortedProperties.map((property) => (
                  <Link
                    key={property.id}
                    href={`/search/${property.id}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 flex gap-6 hover:shadow-lg hover:border-emerald-300 transition-all group"
                  >
                    {/* Image */}
                    <div className="hidden md:block w-48 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={property.image}
                        alt={property.location}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-grow">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-800">
                          {property.location}
                          {property.featured && (
                            <span className="ml-2 px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
                              Featured
                            </span>
                          )}
                        </h3>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        <i className="fas fa-map-marker-alt mr-1 text-emerald-700"></i>
                        {property.district}, {property.sector}, {property.cell}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                        <div>
                          <p className="text-gray-600">Type</p>
                          <p className="font-semibold text-gray-800">{property.propertyType}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Size</p>
                          <p className="font-semibold text-gray-800">{property.size.toLocaleString()} m²</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Price</p>
                          <p className="font-bold text-emerald-700">FRW {(property.price / 1000000).toFixed(1)}M</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Valuation</p>
                          <p className="font-semibold text-gray-800">FRW {(property.valuation / 1000000).toFixed(1)}M</p>
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex items-center">
                      <i className="fas fa-arrow-right text-2xl text-emerald-700 group-hover:translate-x-2 transition-transform"></i>
                    </div>
                  </Link>
                ))}
              </div>
            )}

          </div>
        </main>

        {/* FOOTER */}
        <footer className="bg-gray-900 text-gray-300 py-12 md:py-16 mt-12">
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
                  <li><Link href="/docs" className="hover:text-emerald-400 transition-colors">Docs</Link></li>
                  <li><Link href="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                  <li><Link href="/support" className="hover:text-emerald-400 transition-colors">Support</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Company</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/about" className="hover:text-emerald-400 transition-colors">About</Link></li>
                  <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">Contact</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-4">Legal</h3>
                <ul className="space-y-2.5 text-sm">
                  <li><Link href="/privacy" className="hover:text-emerald-400 transition-colors">Privacy</Link></li>
                  <li><Link href="/terms" className="hover:text-emerald-400 transition-colors">Terms</Link></li>
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

export default PropertySearch;
