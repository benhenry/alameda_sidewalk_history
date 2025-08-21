'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Polyline, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { SidewalkSegment, FilterOptions } from '@/types/sidewalk'
import { Info } from 'lucide-react'

// Fix for default markers in react-leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
  })
}

interface MapProps {
  segments: SidewalkSegment[]
  filters: FilterOptions
  onSegmentClick: (segment: SidewalkSegment) => void
}

// Alameda, CA coordinates
const ALAMEDA_CENTER: [number, number] = [37.7652, -122.2416]

const getSegmentColor = (segment: SidewalkSegment, filters: FilterOptions) => {
  if (filters.contractor && segment.contractor !== filters.contractor) return '#cccccc'
  if (filters.year && segment.year !== filters.year) return '#cccccc'
  if (filters.decade && Math.floor(segment.year / 10) * 10 !== filters.decade) return '#cccccc'
  
  // Color by decade if no specific filters
  const decade = Math.floor(segment.year / 10) * 10
  const colors: { [key: number]: string } = {
    1900: '#8B4513',
    1910: '#CD853F', 
    1920: '#DEB887',
    1930: '#F4A460',
    1940: '#2E8B57',
    1950: '#3CB371',
    1960: '#20B2AA',
    1970: '#4682B4',
    1980: '#6495ED',
    1990: '#9370DB',
    2000: '#BA55D3',
    2010: '#FF69B4',
    2020: '#FF1493'
  }
  
  return colors[decade] || '#666666'
}


function MapEvents({ onMapClick }: { onMapClick: (latlng: [number, number]) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick([e.latlng.lat, e.latlng.lng])
    },
  })
  return null
}

export default function Map({ segments, filters, onSegmentClick }: MapProps) {
  const [isClient, setIsClient] = useState(false)
  const [showLegend, setShowLegend] = useState(true)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleMapClick = (latlng: [number, number]) => {
    console.log('Map clicked at:', latlng)
  }

  if (!isClient) {
    return <div className="w-full h-screen bg-gray-200 flex items-center justify-center">Loading map...</div>
  }

  return (
    <div className="relative w-full h-screen">
      <MapContainer
        center={ALAMEDA_CENTER}
        zoom={14}
        className="leaflet-container"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEvents onMapClick={handleMapClick} />
        
        {/* Mapped segments with actual data */}
        {segments.map((segment) => (
          <Polyline
            key={segment.id}
            positions={segment.coordinates}
            color={getSegmentColor(segment, filters)}
            weight={6}
            opacity={0.9}
            eventHandlers={{
              click: () => onSegmentClick(segment)
            }}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold">{segment.street}</h3>
                <p><strong>Contractor:</strong> {segment.contractor}</p>
                <p><strong>Year:</strong> {segment.year}</p>
                <p><strong>Block:</strong> {segment.block}</p>
                {segment.notes && <p><strong>Notes:</strong> {segment.notes}</p>}
                {segment.specialMarks && segment.specialMarks.length > 0 && (
                  <p><strong>Special marks:</strong> {segment.specialMarks.join(', ')}</p>
                )}
                {segment.photos && segment.photos.length > 0 && (
                  <p><strong>Photos:</strong> {segment.photos.length} uploaded</p>
                )}
              </div>
            </Popup>
          </Polyline>
        ))}
      </MapContainer>

      {/* Map Legend */}
      {showLegend && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 text-sm">Map Legend</h3>
            <button 
              onClick={() => setShowLegend(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-red-600 border-dashed border border-red-600"></div>
              <span>Unmapped sidewalks</span>
            </div>
            
            <div className="border-t pt-2">
              <div className="font-medium text-gray-700 mb-1">Mapped by decade:</div>
              <div className="grid grid-cols-2 gap-1">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#8B4513'}}></div>
                  <span>1900s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#CD853F'}}></div>
                  <span>1910s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#DEB887'}}></div>
                  <span>1920s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#F4A460'}}></div>
                  <span>1930s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#2E8B57'}}></div>
                  <span>1940s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#3CB371'}}></div>
                  <span>1950s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#20B2AA'}}></div>
                  <span>1960s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#4682B4'}}></div>
                  <span>1970s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#6495ED'}}></div>
                  <span>1980s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#9370DB'}}></div>
                  <span>1990s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#BA55D3'}}></div>
                  <span>2000s</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-1" style={{backgroundColor: '#FF69B4'}}></div>
                  <span>2010s</span>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-2 text-gray-600">
              <p>Click segments for details</p>
              <p>Thicker lines = mapped data</p>
            </div>
          </div>
        </div>
      )}

      {/* Legend toggle button when hidden */}
      {!showLegend && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-[1000] hover:bg-gray-50"
          title="Show legend"
        >
          <Info className="h-5 w-5 text-gray-600" />
        </button>
      )}
    </div>
  )
}