import React, { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MapPin, Navigation } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface MapViewProps {
  properties: any[]
  center: [number, number]
  onLocationSelect?: (lngLat: [number, number]) => void
}

export default function MapView({ properties, center, onLocationSelect }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<any>(null)

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12',
      center: center,
      zoom: 10,
      pitch: 45,
      bearing: -17.6,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    }))

    map.current.on('load', () => {
      setMapLoaded(true)
    })

    return () => {
      map.current?.remove()
    }
  }, [])

  useEffect(() => {
    if (!map.current || !mapLoaded || !properties.length) return

    // Add property markers
    properties.forEach((property) => {
      if (!property.latitude || !property.longitude) return

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-3 min-w-[200px]">
          <h3 class="font-semibold text-gray-900 mb-1">${property.title}</h3>
          <p class="text-sm text-gray-600 mb-2">${property.district}</p>
          <p class="text-lg font-bold text-green-600">RWF ${Number(property.price).toLocaleString()}</p>
          <p class="text-xs text-gray-500 mt-2">${property.landSize} ${property.sizeUnit}</p>
          <a href="/property/${property.id}" class="mt-2 inline-block text-sm text-blue-600 hover:underline">View Details →</a>
        </div>
      `)

      // Create marker element
      const el = document.createElement('div')
      el.className = 'cursor-pointer'
      el.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white shadow-lg border-2 border-white">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-green-600 rotate-45"></div>
        </div>
      `

      // Add marker to map
      new mapboxgl.Marker(el)
        .setLngLat([property.longitude, property.latitude])
        .setPopup(popup)
        .addTo(map.current!)
    })

    // Add click handler for location selection
    if (onLocationSelect) {
      map.current.on('click', (e) => {
        onLocationSelect([e.lngLat.lng, e.lngLat.lat])
      })
    }
  }, [properties, mapLoaded, onLocationSelect])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* Map Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2">
        <button 
          onClick={() => {
            if (map.current) {
              map.current.flyTo({ center, zoom: 12 })
            }
          }}
          className="p-2 hover:bg-gray-100 rounded-lg transition"
          title="Reset view"
        >
          <Navigation className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Map Legend</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-600 rounded-full mr-2"></div>
            <span className="text-xs text-gray-600">Available Properties</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-xs text-gray-600">Pending</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-500 rounded-full mr-2"></div>
            <span className="text-xs text-gray-600">Sold</span>
          </div>
        </div>
      </div>

      {/* Property Count */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-4 py-2">
        <span className="text-sm font-medium text-gray-700">
          {properties.length} properties on map
        </span>
      </div>
    </div>
  )
}