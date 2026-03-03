import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
import { formatPrice, formatSize } from '../../utils/formatters.js'

interface PropertyCardProps {
  property: any
}

export default function PropertyCard({ property }: PropertyCardProps) {
  const [isSaved, setIsSaved] = React.useState(false)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
    >
      <div className="relative h-48 bg-gray-200">
        {/* Property Image */}
        {property.images && property.images.length > 0 ? (
          <Image
            src={property.images[0]}
            alt={property.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-blue-500 opacity-75 flex items-center justify-center">
            <span className="text-white text-lg font-semibold">No Image</span>
          </div>
        )}
        
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
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <button 
            onClick={() => setIsSaved(!isSaved)}
            className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition"
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
          </button>
          <button className="bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition">
            <Share2 className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      <div className="p-5">
        <Link href={`/property/${property.id}`}>
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
            {formatSize(property.landSize, property.sizeUnit)}
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
            <div className="font-semibold text-sm">{property.views || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500">Interested</div>
            <div className="font-semibold text-sm">{property.interested || 0}</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Link href={`/property/${property.id}`}>
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
    </motion.div>
  )
}