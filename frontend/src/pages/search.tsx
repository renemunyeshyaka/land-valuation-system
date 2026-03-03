import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Property {
  id: number;
  title: string;
  district: string;
  sector: string;
  property_type: string;
  land_size: number;
  estimated_value_rwf: number;
  price_per_sqm: number;
  rating: number;
  seller: string;
  seller_rating: number;
  image?: string;
}

const SearchResults = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    // Mock data for MVP - in production, fetch from API
    const mockProperties: Property[] = [
      {
        id: 1,
        title: 'Well-Located Residential Plot - Kigali',
        district: 'Kigali City',
        sector: 'Nyarugenge',
        property_type: 'residential',
        land_size: 500,
        estimated_value_rwf: 26873437.5,
        price_per_sqm: 53746.88,
        rating: 4.5,
        seller: 'John Habimana',
        seller_rating: 4.8,
        image: '🏘️',
      },
      {
        id: 2,
        title: 'Commercial Space - Gasabo',
        district: 'Kigali City',
        sector: 'Gasabo',
        property_type: 'commercial',
        land_size: 1000,
        estimated_value_rwf: 53746875,
        price_per_sqm: 53746.88,
        rating: 4.3,
        seller: 'Marie Uwamahoro',
        seller_rating: 4.9,
        image: '🏢',
      },
      {
        id: 3,
        title: 'Agricultural Land - Musanze',
        district: 'Musanze',
        sector: 'Muhoza',
        property_type: 'agricultural',
        land_size: 5000,
        estimated_value_rwf: 47700000,
        price_per_sqm: 9540,
        rating: 4.1,
        seller: 'Pierre Mukizwa',
        seller_rating: 4.6,
        image: '🌾',
      },
      {
        id: 4,
        title: 'Industrial Space - Rubavu',
        district: 'Rubavu',
        sector: 'Gisenyi',
        property_type: 'industrial',
        land_size: 2000,
        estimated_value_rwf: 37800000,
        price_per_sqm: 18900,
        rating: 4.2,
        seller: 'Daniel Musinguzi',
        seller_rating: 4.7,
        image: '🏭',
      },
      {
        id: 5,
        title: 'Premium Residential - Kigali CBD',
        district: 'Kigali City',
        sector: 'Remera',
        property_type: 'residential',
        land_size: 800,
        estimated_value_rwf: 53746875,
        price_per_sqm: 67183.59,
        rating: 4.7,
        seller: 'Grace Kamali',
        seller_rating: 5.0,
        image: '🏠',
      },
      {
        id: 6,
        title: 'Mixed-Use Property - Rubavu',
        district: 'Rubavu',
        sector: 'Gisagara',
        property_type: 'commercial',
        land_size: 1500,
        estimated_value_rwf: 42570000,
        price_per_sqm: 28380,
        rating: 4.4,
        seller: 'Samuel Kayitare',
        seller_rating: 4.8,
        image: '🏬',
      },
      {
        id: 7,
        title: 'Farmland Investment - Huye',
        district: 'Huye',
        sector: 'Gisanvu',
        property_type: 'agricultural',
        land_size: 10000,
        estimated_value_rwf: 47500000,
        price_per_sqm: 4750,
        rating: 4.0,
        seller: 'Francine Ndayisaba',
        seller_rating: 4.5,
        image: '🌻',
      },
      {
        id: 8,
        title: 'Manufacturing Hub - Nyagatare',
        district: 'Nyagatare',
        sector: 'Nyagatare City',
        property_type: 'industrial',
        land_size: 3000,
        estimated_value_rwf: 40500000,
        price_per_sqm: 13500,
        rating: 4.3,
        seller: 'Antoine Kagire',
        seller_rating: 4.7,
        image: '⚙️',
      },
      {
        id: 9,
        title: 'Cozy Apartment Block - Musanze',
        district: 'Musanze',
        sector: 'Musanze City',
        property_type: 'residential',
        land_size: 2000,
        estimated_value_rwf: 43920000,
        price_per_sqm: 21960,
        rating: 4.6,
        seller: 'Pauline Ingabire',
        seller_rating: 4.9,
        image: '🏘️',
      },
      {
        id: 10,
        title: 'Eco-Tourism Venture - Huye',
        district: 'Huye',
        sector: 'Muhanga',
        property_type: 'commercial',
        land_size: 5000,
        estimated_value_rwf: 75000000,
        price_per_sqm: 15000,
        rating: 4.8,
        seller: 'Catherine Mukandayire',
        seller_rating: 5.0,
        image: '🏕️',
      },
    ];

    setProperties(mockProperties);
    setTotalPages(Math.ceil(mockProperties.length / 5));
    setLoading(false);
  }, [page]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const renderStars = (rating: number) => {
    return '⭐'.repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? '✨' : '');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading properties...</p>
          </div>
        </div>
      </div>
    );
  }

  const displayedProperties = properties.slice((page - 1) * 5, page * 5);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Property Search Results</h1>
          <p className="text-lg text-gray-600">
            Found <span className="font-semibold text-blue-600">{properties.length}</span> properties matching your search
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>All Types</option>
                <option>Residential</option>
                <option>Commercial</option>
                <option>Agricultural</option>
                <option>Industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">District</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>All Districts</option>
                <option>Kigali City</option>
                <option>Musanze</option>
                <option>Rubavu</option>
                <option>Huye</option>
                <option>Nyagatare</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Price Range</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>All Prices</option>
                <option>0 - 10M RWF</option>
                <option>10M - 50M RWF</option>
                <option>50M - 100M RWF</option>
                <option>100M+ RWF</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option>Relevance</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Newest First</option>
                <option>Rating: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Properties Grid */}
        <div className="space-y-4">
          {displayedProperties.map((property) => (
            <Link key={property.id} href={`/properties/${property.id}`}>
              <a className="block bg-white rounded-lg shadow-sm hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 p-6">
                  {/* Image */}
                  <div className="md:col-span-1 flex items-center justify-center bg-gray-100 rounded-lg min-h-[150px]">
                    <div className="text-6xl">{property.image}</div>
                  </div>

                  {/* Details */}
                  <div className="md:col-span-3">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{property.title}</h3>
                        <p className="text-gray-600">
                          <span className="font-medium">{property.district}</span>
                          {property.sector && <span> • {property.sector}</span>}
                        </p>
                      </div>
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                        {property.property_type.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Land Size</p>
                        <p className="font-semibold text-gray-900">{property.land_size.toLocaleString()} sqm</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Price per sqm</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(property.price_per_sqm)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Seller: <span className="font-medium">{property.seller}</span></span>
                        <span className="text-sm text-yellow-600">{renderStars(property.seller_rating)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="md:col-span-1 flex flex-col justify-center text-right">
                    <p className="text-sm text-gray-500 mb-2">Estimated Value</p>
                    <p className="text-2xl font-bold text-blue-600 mb-4">{formatCurrency(property.estimated_value_rwf)}</p>
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </a>
            </Link>
          ))}
        </div>

        {/* Pagination */}
        <div className="mt-12 flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← Previous
          </button>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx + 1}
                onClick={() => setPage(idx + 1)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  page === idx + 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>

        {/* Empty State */}
        {displayedProperties.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No properties found. Try adjusting your search filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
