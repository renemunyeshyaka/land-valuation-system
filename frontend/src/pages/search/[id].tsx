import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { resolveImageUrl } from '../../utils/image';

/**
 * PROPERTY DETAIL PAGE · Land Valuation System
 * 
 * Purpose: Detailed view of a single property with valuation info
 * Features:
 * - Property images and details
 * - Full valuation information
 * - Location mapping
 * - Contact form
 * - Similar properties
 */

const PropertyDetail: React.FC = () => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { id } = router.query;
  const [loading, setLoading] = useState(true);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Mock property details
  const propertyData: { [key: string]: any } = {
    '1': {
      id: '1',
      location: 'Kigali Central Business District',
      district: 'Kigali',
      sector: 'Gasabo',
      cell: 'Muhima',
      propertyType: 'Commercial',
      size: 500,
      price: 250000000,
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80',
        'https://images.unsplash.com/photo-1487958449ae28245fa1c73f5a41a6b1?w=1200&q=80',
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=80',
      ],
      valuation: 280000000,
      valuationDate: '2026-02-15',
      valuationExpiry: '2027-02-15',
      assessor: 'Dr. Stephen Muhirwa',
      description: 'Premium commercial space in Kigali CBD with excellent foot traffic and visibility. Recently renovated with modern facilities, security systems, and parking.',
      features: ['24/7 Security', 'Parking', 'Modern HVAC', 'Glass Facades', 'Ground Floor Reception'],
      amenities: ['Elevator', 'Disabled Access', 'Fire Safety System', 'CCTV Monitoring', 'Backup Generator'],
      featured: true,
    },
    '2': {
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
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
      images: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=80',
        'https://images.unsplash.com/photo-1567105424725-b5c8e9dce6fd?w=1200&q=80',
      ],
      valuation: 92000000,
      valuationDate: '2026-02-10',
      valuationExpiry: '2027-02-10',
      assessor: 'Eng. Marie Mutesi',
      description: 'Modern 3-bedroom residential home in prestigious Nyarutarama area. Well-maintained with spacious living areas, modern kitchen, and garden.',
      features: ['3 Bedrooms', '2 Bathrooms', 'Living Room', 'Kitchen', 'Garden', 'Garage'],
      amenities: ['Hot Water', 'Solar Panels', 'Rainwater Tank', 'Security Gate', 'Paved Driveway'],
      featured: true,
    },
  };

  const property = propertyData[String(id)] || null;

  // Get similar properties (different property types)
  const similarProperties = [
    { id: '3', location: 'Kimironko Industrial Park', price: 180000000, type: 'Industrial' },
    { id: '4', location: 'Rebero Hills Apartments', price: 65000000, type: 'Residential' },
    { id: '5', location: 'Gisozi Farm Land', price: 45000000, type: 'Agricultural' },
  ];

  useEffect(() => {
    if (id && property) {
      setLoading(false);
    } else if (id) {
      setLoading(false);
    }
  }, [id, property]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      toast.error('Please fill in all fields');
      setSubmitting(false);
      return;
    }

    // Simulate API call
    setTimeout(() => {
      toast.success('Message sent! We will contact you soon');
      setContactName('');
      setContactEmail('');
      setContactMessage('');
      setSubmitting(false);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <i className="fas fa-spinner fa-spin text-4xl text-emerald-700"></i>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <i className="fas fa-home text-5xl text-gray-300 mb-4"></i>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Property Not Found</h1>
        <p className="text-gray-600 mb-6">The property you are looking for does not exist.</p>
        <Link
          href="/search"
          className="px-6 py-3 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors"
        >
          <i className="fas fa-search mr-2"></i>
          Back to Search
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* HEAD / SEO */}
      <Head>
        <title>{property.location} · Property Details · Land Valuation System</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
        <meta name="description" content={`${property.location} - ${property.propertyType} property for sale in Rwanda`} />
        <meta property="og:title" content={`${property.location} · LandVal`} />
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
                <Link
                  href="/search"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-700 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-1"></i>
                  Back to Search
                </Link>
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

            {/* Images Gallery */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
              {/* Main Image */}
              <div className="lg:col-span-2">
                <div className="w-full h-96 md:h-[500px] bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={resolveImageUrl(property.image)}
                    alt={property.location}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Thumbnails */}
                {property.images && property.images.length > 1 && (
                  <div className="flex gap-3 mt-4">
                    {property.images.map((img: string, idx: number) => (
                      <div
                        key={idx}
                        className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden cursor-pointer border-2 border-gray-300 hover:border-emerald-500 transition-colors"
                      >
                        <img src={resolveImageUrl(img)} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Info Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 h-fit">
                {property.featured && (
                  <div className="mb-4 px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full inline-block">
                    Featured Property
                  </div>
                )}

                <h1 className="text-2xl font-bold text-gray-800 mb-3">
                  {property.location}
                </h1>

                <p className="text-gray-600 mb-4">
                  <i className="fas fa-map-marker-alt mr-2 text-emerald-700"></i>
                  {property.district}, {property.sector}, {property.cell}
                </p>

                {/* Price */}
                <div className="border-t border-gray-200 pt-4 mb-4">
                  <p className="text-sm text-gray-600 mb-1">Asking Price</p>
                  <p className="text-3xl font-bold text-emerald-700">
                    RWF {(property.price / 1000000).toFixed(1)}M
                  </p>
                </div>

                {/* Key Details */}
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Property Type</span>
                    <span className="font-semibold text-gray-800">{property.propertyType}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Size</span>
                    <span className="font-semibold text-gray-800">{property.size.toLocaleString()} m²</span>
                  </div>
                  {property.bedrooms && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Bedrooms</span>
                      <span className="font-semibold text-gray-800">{property.bedrooms}</span>
                    </div>
                  )}
                  {property.bathrooms && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Bathrooms</span>
                      <span className="font-semibold text-gray-800">{property.bathrooms}</span>
                    </div>
                  )}
                </div>

                {/* Contact Button */}
                <button
                  onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full px-4 py-3 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 transition-colors"
                >
                  <i className="fas fa-envelope mr-2"></i>
                  Inquire About This Property
                </button>
              </div>
            </div>

            {/* Property Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">

              {/* Main Details - Left (2 cols) */}
              <div className="lg:col-span-2 space-y-6">

                {/* Description */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">Property Description</h2>
                  <p className="text-gray-700 leading-relaxed">{property.description}</p>
                </div>

                {/* Features */}
                {property.features && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Highlights & Features</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {property.features.map((feature: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
                          <i className="fas fa-check text-emerald-700"></i>
                          <span className="text-sm font-medium text-gray-800">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amenities */}
                {property.amenities && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">Amenities</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {property.amenities.map((amenity: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <i className="fas fa-star text-blue-600"></i>
                          <span className="text-sm font-medium text-gray-800">{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Valuation Info - Right */}
              <div className="space-y-6">

                {/* Valuation Card */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    <i className="fas fa-certificate text-amber-500 mr-2"></i>
                    Valuation Details
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Estimated Value</p>
                      <p className="text-2xl font-bold text-emerald-700">
                        RWF {(property.valuation / 1000000).toFixed(1)}M
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-600 mb-1">Valuation Date</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        {new Date(property.valuationDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-600 mb-1">Valid Until</p>
                      <p className="font-semibold text-gray-800 text-sm">
                        {new Date(property.valuationExpiry).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-sm text-gray-600 mb-1">Assessed By</p>
                      <p className="font-semibold text-gray-800">{property.assessor}</p>
                    </div>

                    <div className="border-t border-gray-200 pt-4 mt-4">
                      <div className="bg-emerald-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Price Evaluation</p>
                        <p className="text-sm font-bold text-emerald-700">
                          {property.valuation > property.price ? '✓ Good Value' : '⚠ Market Check Advised'}
                        </p>
                        <p className="text-xs text-gray-600 mt-2">
                          {property.valuation > property.price
                            ? 'Property priced below estimated value'
                            : 'Property priced above estimated value'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Location Info */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-4">
                    <i className="fas fa-map text-blue-600 mr-2"></i>
                    Location
                  </h2>

                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">District</p>
                      <p className="text-gray-800">{property.district}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Sector</p>
                      <p className="text-gray-800">{property.sector}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide font-semibold">Cell</p>
                      <p className="text-gray-800">{property.cell}</p>
                    </div>
                  </div>

                  {/* Map Placeholder */}
                  <div className="mt-4 w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <i className="fas fa-map-pin text-3xl text-gray-400 mb-2"></i>
                      <p className="text-sm text-gray-500">Map view available</p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* Contact Form */}
            <div id="contact-form" className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 md:p-8 mb-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Interested in This Property?</h2>
              <p className="text-gray-600 mb-6">Send us a message and we'll get back to you within 24 hours</p>

              <form onSubmit={handleContactSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    placeholder="your@email.com"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message *</label>
                  <textarea
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                    placeholder="Tell us about your interest in this property..."
                  />
                </div>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-emerald-700 text-white font-medium rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <i className="fas fa-spinner fa-spin"></i>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane"></i>
                        Send Inquiry
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Similar Properties */}
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Similar Properties</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {similarProperties.map((prop) => (
                  <Link
                    key={prop.id}
                    href={`/search/${prop.id}`}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-emerald-300 transition-all group"
                  >
                    <div className="h-40 bg-gray-200 overflow-hidden">
                      <i className="fas fa-image text-4xl text-gray-400 flex items-center justify-center w-full h-full"></i>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 mb-2 line-clamp-2">{prop.location}</h3>
                      <p className="text-xs text-gray-600 mb-3">{prop.type}</p>
                      <p className="text-emerald-700 font-bold">RWF {(prop.price / 1000000).toFixed(1)}M</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

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

export default PropertyDetail;
