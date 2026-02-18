'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents, CircleMarker, Marker } from 'react-leaflet'
import L from 'leaflet'
import { Trash2, Undo, Check, AlertTriangle, Search, Loader2 } from 'lucide-react'
import { useToast } from './Toast'

interface ApprovedSegment {
  id: string
  street: string
  geometry: {
    type: string
    coordinates: [number, number][]
  }
}

interface InteractiveSegmentDrawerProps {
  onCoordinatesChange: (coordinates: [number, number][]) => void
  onStreetDetected?: (street: string | null) => void
  initialCoordinates?: [number, number][]
  sidewalkData?: [number, number][][]  // Array of LineStrings
  showApprovedSegments?: boolean  // Show approved segments for snapping (default: true)
}

// Alameda, CA coordinates
const ALAMEDA_CENTER: [number, number] = [37.7652, -122.2416]

// Custom icon for draggable markers
const createDraggableIcon = (index: number, isFirst: boolean, isLast: boolean) => {
  const color = isFirst ? '#22C55E' : isLast ? '#EF4444' : '#3B82F6'
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: bold;
      color: white;
      cursor: grab;
    ">${index + 1}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

// Draggable marker component for editing points
function DraggablePointMarker({
  position,
  index,
  totalPoints,
  onDragEnd,
}: {
  position: [number, number]
  index: number
  totalPoints: number
  onDragEnd: (index: number, newPosition: [number, number]) => void
}) {
  const markerRef = useRef<L.Marker>(null)
  const isFirst = index === 0
  const isLast = index === totalPoints - 1

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current
      if (marker) {
        const latlng = marker.getLatLng()
        onDragEnd(index, [latlng.lat, latlng.lng])
      }
    },
  }

  return (
    <Marker
      ref={markerRef}
      position={position}
      draggable={true}
      eventHandlers={eventHandlers}
      icon={createDraggableIcon(index, isFirst, isLast)}
    />
  )
}

function DrawingEvents({
  onCoordinatesChange,
  onStreetDetected,
  coordinates,
  setCoordinates,
  sidewalkData,
  onSnapError
}: {
  onCoordinatesChange: (coords: [number, number][]) => void
  onStreetDetected?: (street: string | null) => void
  coordinates: [number, number][]
  setCoordinates: (coords: [number, number][]) => void
  sidewalkData?: [number, number][][]
  onSnapError?: (message: string) => void
}) {
  const [snapping, setSnapping] = useState(false)

  // API-based snapping using PostGIS ST_ClosestPoint
  const snapCoordinate = async (lat: number, lng: number): Promise<{ snapped: [number, number]; street: string | null } | null> => {
    try {
      const response = await fetch('/api/snap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coordinates: [[lat, lng]]
        })
      })

      if (!response.ok) {
        console.error('Snap API error:', response.status)
        return null
      }

      const data = await response.json()

      // Check if snapping was successful
      if (data.metadata && data.metadata[0] && data.metadata[0].snapped) {
        return {
          snapped: data.metadata[0].snapped as [number, number],
          street: data.metadata[0].street || null
        }
      }

      return null
    } catch (error) {
      console.error('Snapping error:', error)
      return null
    }
  }

  useMapEvents({
    click: async (e) => {
      if (snapping) return // Prevent multiple simultaneous snaps

      const clickCoord: [number, number] = [e.latlng.lat, e.latlng.lng]

      setSnapping(true)
      try {
        // Try to snap to nearest sidewalk using PostGIS
        const result = await snapCoordinate(clickCoord[0], clickCoord[1])

        // Require snapping when sidewalk data is available
        if (sidewalkData && sidewalkData.length > 0 && !result) {
          onSnapError?.('No nearby sidewalk found. Click closer to the reference lines (within 50m).')
          return
        }

        const finalCoord = result?.snapped || clickCoord

        const updatedCoords = [...coordinates, finalCoord]
        setCoordinates(updatedCoords)
        onCoordinatesChange(updatedCoords)

        // Notify parent about detected street
        if (result?.street && onStreetDetected) {
          onStreetDetected(result.street)
        }
      } finally {
        setSnapping(false)
      }
    },
  })

  return snapping ? (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.7)',
      color: 'white',
      padding: '8px 12px',
      borderRadius: '4px',
      zIndex: 1000,
      fontSize: '14px'
    }}>
      Snapping to sidewalk...
    </div>
  ) : null
}

function SidewalkOverlay({ sidewalkData }: { sidewalkData?: [number, number][][] }) {
  const map = useMap()
  const [visibleLines, setVisibleLines] = useState<[number, number][][]>([])

  // Function to calculate visible sidewalk lines based on current viewport
  const updateVisibleLines = useCallback(() => {
    if (!sidewalkData || sidewalkData.length === 0 || !map) {
      setVisibleLines([])
      return
    }

    // Get current map bounds to only render visible sidewalks
    const bounds = map.getBounds ? map.getBounds() : null
    if (!bounds) {
      setVisibleLines([])
      return
    }

    // Filter LineStrings that have at least one point within viewport
    const visibleLineStrings = sidewalkData.filter(lineString => {
      return lineString.some(coord => bounds.contains(coord))
    })

    console.log('🗺️ InteractiveDrawer - filtering', sidewalkData.length, 'LineStrings to', visibleLineStrings.length, 'visible')

    // Limit the number of polylines for performance (though we now have proper lines)
    const maxLines = 1000  // Increased from 500 since we have proper LineStrings now
    const limitedLines = visibleLineStrings.slice(0, maxLines)

    setVisibleLines(limitedLines)
  }, [map, sidewalkData])

  // Update on mount and when sidewalkData changes
  useEffect(() => {
    updateVisibleLines()
  }, [updateVisibleLines])

  // Update on map movement
  useMapEvents({
    moveend: () => {
      updateVisibleLines()
    },
    zoomend: () => {
      updateVisibleLines()
    }
  })

  return (
    <>
      {visibleLines.map((line, index) => (
        <Polyline
          key={`sidewalk-${index}`}
          positions={line}
          color="#2563EB"
          weight={3}
          opacity={0.6}
          dashArray="8, 4"
        />
      ))}
    </>
  )
}

function ApprovedSegmentsOverlay({ onLoadingChange }: { onLoadingChange?: (loading: boolean) => void }) {
  const map = useMap()
  const [approvedSegments, setApprovedSegments] = useState<ApprovedSegment[]>([])
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Notify parent of loading state
  useEffect(() => {
    onLoadingChange?.(loading)
  }, [loading, onLoadingChange])

  const fetchApprovedSegments = useCallback(async () => {
    if (!map) return

    const bounds = map.getBounds()
    if (!bounds) return

    setLoading(true)
    try {
      const params = new URLSearchParams({
        north: bounds.getNorth().toString(),
        south: bounds.getSouth().toString(),
        east: bounds.getEast().toString(),
        west: bounds.getWest().toString()
      })

      const response = await fetch(`/api/segments/approved-geometries?${params}`)
      if (response.ok) {
        const data = await response.json()
        setApprovedSegments(data.segments || [])
        setHasFetched(true)
      }
    } catch (error) {
      console.error('Error fetching approved segments:', error)
    } finally {
      setLoading(false)
    }
  }, [map])

  // Debounced fetch - only fetch after map stops moving for 500ms
  const debouncedFetch = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchApprovedSegments()
    }, 500)
  }, [fetchApprovedSegments])

  // Fetch once on mount only
  useEffect(() => {
    if (!hasFetched) {
      fetchApprovedSegments()
    }
  }, [hasFetched, fetchApprovedSegments])

  // Debounced updates on map movement
  useMapEvents({
    moveend: () => {
      debouncedFetch()
    },
    zoomend: () => {
      debouncedFetch()
    }
  })

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [])

  // Convert GeoJSON coordinates [lng, lat] to Leaflet [lat, lng]
  const convertCoords = (coords: [number, number][]): [number, number][] => {
    return coords.map(([lng, lat]) => [lat, lng])
  }

  return (
    <>
      {approvedSegments.map((segment) => {
        if (!segment.geometry || segment.geometry.type !== 'LineString') return null
        const positions = convertCoords(segment.geometry.coordinates)
        return (
          <Polyline
            key={`approved-${segment.id}`}
            positions={positions}
            color="#16A34A"
            weight={4}
            opacity={0.7}
            dashArray="12, 6"
          />
        )
      })}
    </>
  )
}

function MapSearch({
  onLocationFound,
  onSearchError
}: {
  onLocationFound: (lat: number, lng: number) => void
  onSearchError?: (message: string) => void
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      // Use Nominatim to search for addresses in Alameda
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ', Alameda, CA'
        )}&limit=1`
      )
      const results = await response.json()

      if (results.length > 0) {
        const { lat, lon } = results[0]
        onLocationFound(parseFloat(lat), parseFloat(lon))
        setSearchQuery('')
      } else {
        onSearchError?.('Location not found. Try a street name or address in Alameda.')
      }
    } catch (error) {
      console.error('Search error:', error)
      onSearchError?.('Search failed. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  return (
    <div className="flex gap-2 mb-4">
      <div className="flex-1">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search for street or address in Alameda..."
          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          disabled={isSearching}
        />
      </div>
      <button
        onClick={handleSearch}
        disabled={isSearching || !searchQuery.trim()}
        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        <Search className="h-4 w-4" />
        {isSearching ? 'Searching...' : 'Search'}
      </button>
    </div>
  )
}

function MapController({ searchLat, searchLng }: { searchLat?: number; searchLng?: number }) {
  const map = useMap()

  useEffect(() => {
    if (searchLat && searchLng) {
      map.setView([searchLat, searchLng], 18)
    }
  }, [map, searchLat, searchLng])

  return null
}

export default function InteractiveSegmentDrawer({
  onCoordinatesChange,
  onStreetDetected,
  initialCoordinates = [],
  sidewalkData,
  showApprovedSegments = true
}: InteractiveSegmentDrawerProps) {
  const [coordinates, setCoordinates] = useState<[number, number][]>(initialCoordinates)
  const [isClient, setIsClient] = useState(false)
  const [searchLat, setSearchLat] = useState<number>()
  const [searchLng, setSearchLng] = useState<number>()
  const [loadingApproved, setLoadingApproved] = useState(false)
  const { showWarning, showError } = useToast()

  useEffect(() => {
    setIsClient(true)
  }, [])

  const removeLastPoint = () => {
    const newCoords = coordinates.slice(0, -1)
    setCoordinates(newCoords)
    onCoordinatesChange(newCoords)
  }

  const clearAll = () => {
    setCoordinates([])
    onCoordinatesChange([])
  }

  const handleLocationFound = (lat: number, lng: number) => {
    setSearchLat(lat)
    setSearchLng(lng)
  }

  const handlePointDragEnd = (index: number, newPosition: [number, number]) => {
    const newCoords = [...coordinates]
    newCoords[index] = newPosition
    setCoordinates(newCoords)
    onCoordinatesChange(newCoords)
  }

  if (!isClient) {
    return <div className="w-full h-64 bg-gray-200 flex items-center justify-center">Loading map...</div>
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <MapSearch onLocationFound={handleLocationFound} onSearchError={showError} />
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 mb-1">How to draw a sidewalk segment:</p>
            <ul className="text-blue-700 space-y-1">
              <li>• <strong>Click on or near the dashed lines to add points</strong></li>
              <li>• <strong>Drag numbered markers to adjust point positions</strong></li>
              <li>• <span className="text-green-700 font-medium">Green dashed lines</span> = existing approved segments (snap within 10m)</li>
              <li>• <span className="text-blue-700 font-medium">Blue dashed lines</span> = OSM reference sidewalks (snap within 50m)</li>
              <li>• Connect 2+ points along the same sidewalk to create a segment</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="relative border border-gray-300 rounded-lg overflow-hidden">
        <MapContainer
          center={ALAMEDA_CENTER}
          zoom={16}
          style={{ height: '400px', width: '100%' }}
          className="leaflet-container"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Map controller for search */}
          <MapController searchLat={searchLat} searchLng={searchLng} />

          {/* Show approved segments overlay (green) */}
          {showApprovedSegments && <ApprovedSegmentsOverlay onLoadingChange={setLoadingApproved} />}

          {/* Show reference sidewalk overlay (blue) */}
          <SidewalkOverlay sidewalkData={sidewalkData} />
          
          {/* Drawing events */}
          <DrawingEvents
            onCoordinatesChange={onCoordinatesChange}
            onStreetDetected={onStreetDetected}
            coordinates={coordinates}
            setCoordinates={setCoordinates}
            sidewalkData={sidewalkData}
            onSnapError={showWarning}
          />
          
          {/* Show drawn segment */}
          {coordinates.length > 1 && (
            <Polyline
              positions={coordinates}
              color="#EF4444"
              weight={4}
              opacity={0.8}
            />
          )}
          
          {/* Show individual points as draggable markers */}
          {coordinates.map((coord, index) => (
            <DraggablePointMarker
              key={index}
              position={coord}
              index={index}
              totalPoints={coordinates.length}
              onDragEnd={handlePointDragEnd}
            />
          ))}
        </MapContainer>

        {/* Loading indicator for approved segments */}
        {loadingApproved && (
          <div className="absolute top-2 left-2 z-[1000] bg-white/90 rounded-lg px-3 py-2 shadow-sm flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading segments...
          </div>
        )}

        {/* Control buttons overlay */}
        <div className="absolute top-2 right-2 flex gap-2 z-[1000]">
          {coordinates.length > 0 && (
            <>
              <button
                onClick={removeLastPoint}
                className="bg-white border border-gray-300 rounded-md p-2 shadow-sm hover:bg-gray-50"
                title="Remove last point"
              >
                <Undo className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={clearAll}
                className="bg-white border border-gray-300 rounded-md p-2 shadow-sm hover:bg-gray-50"
                title="Clear all points"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">
          {coordinates.length} point{coordinates.length !== 1 ? 's' : ''} added
          {coordinates.length >= 2 && (
            <span className="text-green-600 ml-2">
              <Check className="h-4 w-4 inline mr-1" />
              Ready to save
            </span>
          )}
        </span>
        {coordinates.length > 0 && (
          <span className="text-xs text-gray-500">
            Last: {coordinates[coordinates.length - 1][0].toFixed(6)}, {coordinates[coordinates.length - 1][1].toFixed(6)}
          </span>
        )}
      </div>
    </div>
  )
}