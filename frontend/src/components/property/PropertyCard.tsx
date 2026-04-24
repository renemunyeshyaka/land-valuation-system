import React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  MapPin,
  Heart,
  Share2,
  CheckCircle,
  Globe,
  FileText,
  MessageCircle,
  Search
} from 'lucide-react'
import { formatPrice, formatSize } from '../../utils/formatters'
import { resolveImageUrl } from '../../utils/image'



interface PropertyCardProps {
  property: any
  isAuthenticated?: boolean // (Unused, but kept for future use)
}

export default function PropertyCard({ property }: PropertyCardProps) {



  const placeholder = 'https://placehold.co/600x400/png?text=No+Image'
  const [displayImageUrl, setDisplayImageUrl] = React.useState<string>(placeholder)
  const [interested, setInterested] = React.useState<number>(property.interested ?? 0)
  const [views, setViews] = React.useState<number>(property.views ?? 0)
  // Use property.landSize and property.sizeUnit directly for instant updates
  const [isLiking, setIsLiking] = React.useState(false)
  const [shareOpen, setShareOpen] = React.useState(false)

  // Fetch real property stats (views, sqm) on mount
  React.useEffect(() => {
    let isMounted = true;
    if (property.images && property.images.length > 0 && property.images[0]) {
      setDisplayImageUrl(resolveImageUrl(property.images[0]))
    } else {
      setDisplayImageUrl(placeholder)
    }

    // Fetch real stats from backend (increments views)
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        const res = await fetch(`${apiUrl}/api/v1/properties/${property.id}`);
        if (res.ok) {
          const data = await res.json();
          const prop = data?.data ?? {};
          if (isMounted) {
            if (typeof prop.views === 'number') setViews(prop.views);
            if (typeof prop.interested === 'number') setInterested(prop.interested);
            // Do not update landSize/sizeUnit here; always use props
          }
        }
      } catch {}
    };
    fetchStats();
    return () => { isMounted = false; };
  }, [property.id, property.images]);

  // Like handler (public, persistent, correct endpoint)
  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    setInterested((prev) => prev + 1); // Optimistic UI update
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const res = await fetch(`${apiUrl}/api/v1/properties/${property.id}/interested`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        // Some handlers return {interested: ...}, some {data: {interested: ...}}
        if (data?.interested !== undefined) setInterested(data.interested);
        else if (data?.data?.interested !== undefined) setInterested(data.data.interested);
      }
    } catch (e) {
      setInterested((prev) => prev - 1); // Optionally revert on error
    } finally {
      setIsLiking(false);
    }
  };

  // Share handler
  const handleShare = () => {
    const shareData = {
      title: property.title,
      text: `Check out this property: ${property.title}`,
      url: typeof window !== 'undefined' ? window.location.origin + `/search/${property.id}` : '',
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else {
      setShareOpen(true);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group hover:border-blue-500 hover:bg-blue-50"
    >
      <div className="relative h-48 bg-gray-200">
        {/* Property Image */}
        <img
          src={displayImageUrl}
          alt={property.title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setDisplayImageUrl(placeholder)}
        />
        
        {/* Status Badge */}
        <div className="absolute top-4 left-4">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            property.status === 'available' 
              ? 'bg-green-500 text-white' 
              : property.status === 'pending'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-500 text-white'
          }`}>
            {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
          </span>
        </div>

        {/* Badges */}
        <div className="absolute top-4 right-4 flex space-x-2">
          {property.isDiaspora && (
            <span className="bg-purple-500 text-white p-1.5 rounded-full" title="Diaspora Owner">
              <Globe className="w-4 h-4" />
            </span>
          )}
          {property.isVerified && (
            <span className="bg-blue-500 text-white p-1.5 rounded-full" title="Verified Property">
              <CheckCircle className="w-4 h-4" />
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="absolute bottom-4 right-4 flex space-x-2 z-10">
          <button
            onClick={handleLike}
            disabled={isLiking}
            aria-label="Like property"
            className={`bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition ${isLiking ? 'opacity-60 pointer-events-none' : ''}`}
            title="I'm interested"
          >
            <Heart className={`w-4 h-4 ${interested > (property.interested ?? 0) ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
            <span>{interested}</span>
          </button>
          <button
            onClick={handleShare}
            aria-label="Share property"
            className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition"
            title="Share property"
          >
            <Share2 className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="p-5">
        <Link href={`/search/${property.id}`}>
          <h3 className="font-semibold text-gray-900 hover:text-green-600 transition mb-2 line-clamp-1">
            {property.title}
          </h3>
        </Link>
        
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate">{property.district}, {property.sector || property.district}</span>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-2xl font-bold text-green-600">
              {formatPrice(property.price)}
            </span>
            {property.pricePerSqm > 0 && (
              <span className="text-sm text-gray-500 ml-2">
                ({formatPrice(property.pricePerSqm)}/sqm)
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {/* Always show sqm publicly */}
            {typeof property.landSize === 'number' && property.landSize > 0 && typeof property.sizeUnit === 'string'
              ? formatSize(property.landSize, property.sizeUnit)
              : '—'}
          </span>
        </div>

        {/* Features */}
        {property.features && property.features.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {property.features.slice(0, 3).map((feature: string, idx: number) => (
              <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                {feature}
              </span>
            ))}
            {property.features.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">
                +{property.features.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Gazette Reference */}
        {property.gazetteReference && (
          <div className="flex items-center text-xs text-gray-400 mb-4">
            <FileText className="w-3 h-3 mr-1" />
            <span>Gazette: {property.gazetteReference}</span>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 py-3 border-t border-gray-100">
          <div className="text-center">
            <div className="text-xs text-gray-500">Zone Coef</div>
            <div className="font-semibold text-sm">{property.zoneCoefficient || '1.0'}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Views</div>
            <div className="font-semibold text-sm">{views}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Interested</div>
            <div className="font-semibold text-sm">{interested}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link href={`/search/${property.id}`}>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center justify-center">
              <Search className="w-4 h-4 mr-1" />
              View Details
            </button>
          </Link>
          <button className="px-4 py-2 border border-green-600 text-green-600 rounded-lg text-sm font-medium hover:bg-green-50 transition flex items-center justify-center">
            <MessageCircle className="w-4 h-4 mr-1" />
            Contact
          </button>
        </div>
      </div>
      {/* Social Share Popup (fallback) */}
      {shareOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShareOpen(false)}>
          <div className="bg-white rounded-xl shadow-lg p-6 min-w-[280px] relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={() => setShareOpen(false)}>&times;</button>
            <div className="font-bold mb-2">Share this property</div>
            <div className="flex flex-col gap-2 mb-3">
              <a
                href={`https://wa.me/?text=${encodeURIComponent('Check out this property: ' + property.title + ' ' + (typeof window !== 'undefined' ? window.location.origin + '/search/' + property.id : ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-green-50 text-green-700 font-medium"
              >
                <i className="fab fa-whatsapp text-xl" /> WhatsApp
              </a>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out this property: ' + property.title + ' ' + (typeof window !== 'undefined' ? window.location.origin + '/search/' + property.id : ''))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50 text-blue-600 font-medium"
              >
                <i className="fab fa-twitter text-xl" /> Twitter
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/search/' + property.id : '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50 text-blue-700 font-medium"
              >
                <i className="fab fa-linkedin text-xl" /> LinkedIn
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/search/' + property.id : '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded hover:bg-blue-50 text-blue-800 font-medium"
              >
                <i className="fab fa-facebook text-xl" /> Facebook
              </a>
            </div>
            {/* Copy to clipboard button */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? window.location.origin + '/search/' + property.id : ''}
                className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm text-gray-700 bg-gray-50"
                style={{ minWidth: 0 }}
                onFocus={e => e.target.select()}
                aria-label="Property URL"
              />
              <button
                className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm font-medium"
                onClick={() => {
                  const url = typeof window !== 'undefined' ? window.location.origin + '/search/' + property.id : '';
                  navigator.clipboard.writeText(url);
                }}
                type="button"
                aria-label="Copy property URL"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}