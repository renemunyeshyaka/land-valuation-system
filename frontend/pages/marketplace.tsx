
import React, { useEffect, useState, useRef } from 'react';
import adminHierarchyRaw from '../src/data/land_admin_hierarchy_from_csv.json';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../src/components/LanguageSwitcher';
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



// Utility to format seconds
function formatSeconds(sec: number) {
  if (sec < 1) return `${Math.round(sec * 1000)} ms`;
  return `${sec.toFixed(2)} s`;
}

export default function Marketplace() {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadTime, setLoadTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(16); // Properties per page
  const [totalCount, setTotalCount] = useState(0); // Total properties from backend
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

  // Property types
  const propertyTypes = [
    { value: '', labelKey: 'marketplacePage.allTypes' },
    { value: 'residential', labelKey: 'marketplacePage.residential' },
    { value: 'commercial', labelKey: 'marketplacePage.commercial' },
    { value: 'agricultural', labelKey: 'marketplacePage.agricultural' },
    { value: 'industrial', labelKey: 'marketplacePage.industrial' },
    { value: 'mixed', labelKey: 'marketplacePage.mixed' },
  ];

  // Price ranges
  const priceRanges = [
    { value: '', labelKey: 'marketplacePage.anyPrice' },
    { value: '0-1000000', labelKey: 'marketplacePage.priceUpTo1M' },
    { value: '1000000-5000000', labelKey: 'marketplacePage.price1MTo5M' },
    { value: '5000000-20000000', labelKey: 'marketplacePage.price5MTo20M' },
    { value: '20000000-100000000', labelKey: 'marketplacePage.price20MTo100M' },
    { value: '100000000-', labelKey: 'marketplacePage.price100MPlus' },
  ];
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sample properties removed (no longer used)

  // --- Real-time property updates via WebSocket (with fallback polling) ---
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch properties from API (server-side pagination)
  const fetchProperties = async (measureLoad = false) => {
    let start: number | null = null;
    if (measureLoad) start = performance.now();
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      // Add page and limit to query
      const params = new URLSearchParams();
      params.append('page', String(currentPage));
      params.append('limit', String(pageSize));
      
      // Add filter parameters
      if (search) params.append('search', search);
      if (province) params.append('province', province);
      if (district) params.append('district', district);
      if (sector) params.append('sector', sector);
      if (cell) params.append('cell', cell);
      if (village) params.append('village', village);
      if (type) params.append('property_type', type);
      if (priceMin) params.append('price_min', priceMin);
      if (priceMax) params.append('price_max', priceMax);
      
      const res = await fetch(`${apiUrl}/api/v1/marketplace/properties-for-sale?${params.toString()}&t=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Failed to fetch properties');
      const data = await res.json();
      const propertyArray = data?.data?.data;
      const total = data?.data?.total || 0;
      setTotalCount(total);
      if (Array.isArray(propertyArray)) {
        setProperties(propertyArray.map((p: any) => ({
          ...p,
          landSize: p.land_size ?? p.landSize,
          sizeUnit: p.size_unit ?? p.sizeUnit ?? 'sqm',
        })));
      } else {
        setProperties([]);
      }
      if (measureLoad && start !== null) {
        setLoadTime((performance.now() - start) / 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setProperties([]);
      setTotalCount(0);
      if (measureLoad && start !== null) {
        setLoadTime((performance.now() - start) / 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  // First load: measure load time
  useEffect(() => {
    fetchProperties(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload every 2 minutes to increase views
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProperties();
    }, 2 * 60 * 1000); // 2 minutes
    return () => clearInterval(interval);
  }, []);

  // Fetch properties when currentPage, pageSize, or search changes (but not on first mount)
  useEffect(() => {
    if (currentPage !== 1 || search) {
      fetchProperties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, search]);

  // Server-side pagination: properties already paginated
  const totalPages = Math.ceil(totalCount / pageSize) || 1;

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
                <Link href="/" className="hover:text-emerald-700 transition">{t('nav.home')}</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition">{t('nav.howItWorks')}</Link>
                <Link href="/benefits" className="hover:text-emerald-700 transition">{t('nav.benefits')}</Link>
                <Link href="/marketplace" className="hover:text-emerald-700 transition">{t('nav.marketplace')}</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition">{t('nav.contact')}</Link>
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
                <LanguageSwitcher />
                <Link href="/auth/login" className="text-sm font-medium text-emerald-800 hover:text-emerald-900 px-3 py-2">{t('auth.login')}</Link>
                <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm transition">{t('auth.signup')}</Link>
              </div>
            </div>
          </div>
          {mobileMenuOpen && (
            <div className="md:hidden bg-white/95 border-b border-gray-200/70 shadow-lg absolute left-0 right-0 top-full z-40">
              <div className="flex flex-col px-6 py-4 space-y-2 text-base font-medium text-gray-800">
                <Link href="/" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.home')}</Link>
                <Link href="/how-it-works" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.howItWorks')}</Link>
                <Link href="/benefits" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.benefits')}</Link>
                <Link href="/marketplace" className="text-emerald-700 font-semibold" onClick={() => setMobileMenuOpen(false)}>{t('nav.marketplace')}</Link>
                <Link href="/contact" className="hover:text-emerald-700 transition" onClick={() => setMobileMenuOpen(false)}>{t('nav.contact')}</Link>
                <div className="flex flex-col gap-2 mt-2">
                  <Link href="/auth/login" className="text-emerald-800 hover:text-emerald-900 px-3 py-2 rounded-md transition text-sm font-medium bg-emerald-50" onClick={() => setMobileMenuOpen(false)}>{t('auth.login')}</Link>
                  <Link href="/auth/register" className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-3 py-2 rounded-md shadow-sm transition" onClick={() => setMobileMenuOpen(false)}>{t('auth.signup')}</Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* Main Marketplace Content */}
        <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">

          <h1 className="text-3xl font-bold mb-2 text-center">{t('marketplacePage.title')}</h1>
          <p className="text-gray-600 mb-8 text-center">{t('marketplacePage.description')}</p>

          {/* Search & Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Province */}
            <select
              value={province}
              onChange={e => { setProvince(e.target.value); setDistrict(''); setSector(''); setCell(''); setVillage(''); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('marketplacePage.allProvinces')}</option>
              {provinceNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {/* District */}
            <select
              value={district}
              onChange={e => { setDistrict(e.target.value); setSector(''); setCell(''); setVillage(''); setCurrentPage(1); }}
              disabled={!province}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">{t('marketplacePage.allDistricts')}</option>
              {districtNames.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {/* Sector */}
            <select
              value={sector}
              onChange={e => { setSector(e.target.value); setCell(''); setVillage(''); setCurrentPage(1); }}
              disabled={!district}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">{t('marketplacePage.allSectors')}</option>
              {sectorNames.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {/* Cell */}
            <select
              value={cell}
              onChange={e => { setCell(e.target.value); setVillage(''); setCurrentPage(1); }}
              disabled={!sector}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">{t('marketplacePage.allCells')}</option>
              {cellNames.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Village */}
            <select
              value={village}
              onChange={e => { setVillage(e.target.value); setCurrentPage(1); }}
              disabled={!cell}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">{t('marketplacePage.allVillages')}</option>
              {villageNames.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            {/* Property Type */}
            <select
              value={type}
              onChange={e => { setType(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {propertyTypes.map(pt => <option key={pt.value} value={pt.value}>{t(pt.labelKey)}</option>)}
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
              {priceRanges.map(pr => <option key={pr.value} value={pr.value}>{t(pr.labelKey)}</option>)}
            </select>
            {/* Search Button */}
            <button
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition"
              onClick={() => {
                setCurrentPage(1);
                fetchProperties();
              }}
              type="button"
            >
              <i className="fas fa-search mr-2"></i>{t('marketplacePage.search')}
            </button>
            {/* Clear button */}
            <button
              className="w-full px-4 py-2 bg-gray-200 rounded-lg text-gray-700 font-semibold hover:bg-gray-300"
              onClick={() => {
                setSearch(''); setProvince(''); setDistrict(''); setSector(''); setCell(''); setVillage(''); setType(''); setPriceMin(''); setPriceMax(''); setCurrentPage(1);
                // Fetch without filters
                setTimeout(() => fetchProperties(), 0);
              }}
              type="button"
            >
              {t('marketplacePage.clearAll')}
            </button>
          </div>

          {loading && (
            <div className="text-center py-10 text-lg text-gray-500">{t('marketplacePage.loading')}</div>
          )}
          {/* {!loading && loadTime !== null && (
            <div className="text-center text-xs text-gray-400 mb-2">First load time: {formatSeconds(loadTime)} (max 10s target)</div>
          )} */}
          {error && (
            <div className="text-center py-10 text-red-500">{error}</div>
          )}
          {!loading && !error && properties.length === 0 && (
            <div className="text-center py-10 text-gray-400">{t('marketplacePage.noProperties')}</div>
          )}
          {!loading && !error && properties.length > 0 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
                {properties.map((property) => (
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
                  {t('marketplacePage.back')}
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
                  {t('marketplacePage.next')}
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
