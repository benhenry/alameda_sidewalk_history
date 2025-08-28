'use client'

import { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Popup, useMapEvents, useMap } from 'react-leaflet'
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
  highlightedSegmentId?: string
  zoomToSegment?: string
  adminPreviewMode?: boolean
  isAdminPage?: boolean
}

// Alameda, CA coordinates
const ALAMEDA_CENTER: [number, number] = [37.7652, -122.2416]

const getSegmentColor = (segment: SidewalkSegment, filters: FilterOptions, highlightedSegmentId?: string) => {
  // Highlighted segments get a bright red color for visibility
  if (highlightedSegmentId && segment.id === highlightedSegmentId) return '#FF0000'
  
  // Pending segments get a special orange color
  if (segment.status === 'pending') return '#FF8C00'
  
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

function MapController({ zoomToSegment, segments }: { zoomToSegment?: string, segments: SidewalkSegment[] }) {
  const map = useMap()
  
  useEffect(() => {
    if (zoomToSegment && segments.length > 0) {
      const segment = segments.find(s => s.id === zoomToSegment)
      if (segment && segment.coordinates.length > 0) {
        // Calculate bounds for the segment
        const latLngs = segment.coordinates.map(coord => L.latLng(coord[0], coord[1]))
        const bounds = L.latLngBounds(latLngs)
        
        // Add some padding to the bounds
        const paddedBounds = bounds.pad(0.1)
        
        // Fit the map to the segment bounds
        map.fitBounds(paddedBounds, {
          maxZoom: 18,
          animate: true,
          duration: 1
        })
      }
    }
  }, [zoomToSegment, segments, map])
  
  return null
}

export default function Map({ segments, filters, onSegmentClick, highlightedSegmentId, zoomToSegment, adminPreviewMode, isAdminPage }: MapProps) {
  const [isClient, setIsClient] = useState(false)
  const [showLegend, setShowLegend] = useState(true)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleMapClick = (latlng: [number, number]) => {
    console.log('Map clicked at:', latlng)
  }

  // Filter segments for admin preview mode
  const displaySegments = adminPreviewMode && highlightedSegmentId 
    ? segments.filter(s => s.id === highlightedSegmentId)
    : segments

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
        <MapController zoomToSegment={zoomToSegment} segments={segments} />
        
        {/* Mapped segments with actual data */}
        {displaySegments.map((segment) => {
          const isHighlighted = highlightedSegmentId === segment.id
          const isPending = segment.status === 'pending'
          
          return (
            <Polyline
              key={segment.id}
              positions={segment.coordinates}
              color={getSegmentColor(segment, filters, highlightedSegmentId)}
              weight={isHighlighted ? 12 : isPending ? 8 : 6}
              opacity={isHighlighted ? 1.0 : isPending ? 0.8 : 0.9}
              dashArray={isHighlighted ? '5, 5' : isPending ? '10, 5' : undefined}
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
                {segment.status && (
                  <p><strong>Status:</strong> 
                    <span className={`ml-1 px-2 py-1 rounded text-xs ${
                      segment.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                      segment.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {segment.status.charAt(0).toUpperCase() + segment.status.slice(1)}
                    </span>
                  </p>
                )}
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
          )
        })}
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
            {/* Show highlighted segment info only if there's one */}
            {highlightedSegmentId && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-red-500" style={{height: '4px'}}></div>
                <span>Highlighted segment</span>
              </div>
            )}
            
            {/* Show pending approval only on admin page */}
            {isAdminPage && (
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-orange-500 border-dashed border-2 border-orange-500" style={{height: '3px'}}></div>
                <span>Pending approval</span>
              </div>
            )}
            
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