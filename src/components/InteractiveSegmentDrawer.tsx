'use client'

import { useState, useEffect, useCallback } from 'react'
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { Trash2, Undo, Check, AlertTriangle, Search } from 'lucide-react'

interface InteractiveSegmentDrawerProps {
  onCoordinatesChange: (coordinates: [number, number][]) => void
  initialCoordinates?: [number, number][]
  sidewalkData?: [number, number][]
}

// Alameda, CA coordinates
const ALAMEDA_CENTER: [number, number] = [37.7652, -122.2416]

function DrawingEvents({
  onCoordinatesChange,
  coordinates,
  setCoordinates,
  sidewalkData
}: {
  onCoordinatesChange: (coords: [number, number][]) => void
  coordinates: [number, number][]
  setCoordinates: (coords: [number, number][]) => void
  sidewalkData?: [number, number][]
}) {
  const [snapping, setSnapping] = useState(false)

  // API-based snapping using PostGIS ST_ClosestPoint
  const snapCoordinate = async (lat: number, lng: number): Promise<[number, number] | null> => {
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
        return data.metadata[0].snapped as [number, number]
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
        const snappedCoord = await snapCoordinate(clickCoord[0], clickCoord[1])

        // Require snapping when sidewalk data is available
        if (sidewalkData && sidewalkData.length > 0 && !snappedCoord) {
          alert('No nearby sidewalk found. Please click closer to the blue reference lines (within 50 meters of actual sidewalk locations).')
          return
        }

        const finalCoord = snappedCoord || clickCoord

        const updatedCoords = [...coordinates, finalCoord]
        setCoordinates(updatedCoords)
        onCoordinatesChange(updatedCoords)
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

function SidewalkOverlay({ sidewalkData }: { sidewalkData?: [number, number][] }) {
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

    const visibleData = sidewalkData.filter(coord => bounds.contains(coord))

    console.log('🗺️ InteractiveDrawer - filtering', sidewalkData.length, 'to', visibleData.length, 'visible coordinates')

    // Limit the number of points to improve performance
    const maxPoints = 5000
    const step = Math.max(1, Math.floor(visibleData.length / maxPoints))
    const sampledData = visibleData.filter((_, index) => index % step === 0)

    // Group consecutive coordinates into lines for better performance
    const lines: [number, number][][] = []
    let currentLine: [number, number][] = []

    for (let i = 0; i < sampledData.length; i++) {
      if (currentLine.length === 0) {
        currentLine.push(sampledData[i])
      } else {
        const lastCoord = currentLine[currentLine.length - 1]
        const currentCoord = sampledData[i]

        // If coordinates are close (within ~50m), add to current line
        const distance = Math.sqrt(
          Math.pow((currentCoord[0] - lastCoord[0]) * 111000, 2) +
          Math.pow((currentCoord[1] - lastCoord[1]) * 111000, 2)
        )

        if (distance < 50 && currentLine.length < 50) {
          currentLine.push(currentCoord)
        } else {
          if (currentLine.length > 1) {
            lines.push([...currentLine])
          }
          currentLine = [currentCoord]
        }
      }
    }

    if (currentLine.length > 1) {
      lines.push(currentLine)
    }

    // Only create a limited number of polylines
    const maxLines = 500
    const limitedLines = lines.slice(0, maxLines)

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

function MapSearch({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
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
        alert('Location not found. Try searching for a street name or address in Alameda.')
      }
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again.')
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
  initialCoordinates = [],
  sidewalkData
}: InteractiveSegmentDrawerProps) {
  const [coordinates, setCoordinates] = useState<[number, number][]>(initialCoordinates)
  const [isClient, setIsClient] = useState(false)
  const [searchLat, setSearchLat] = useState<number>()
  const [searchLng, setSearchLng] = useState<number>()

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

  if (!isClient) {
    return <div className="w-full h-64 bg-gray-200 flex items-center justify-center">Loading map...</div>
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <MapSearch onLocationFound={handleLocationFound} />
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 mb-1">How to draw a sidewalk segment:</p>
            <ul className="text-blue-700 space-y-1">
              <li>• <strong>Click directly on or very close to the blue dashed lines</strong></li>
              <li>• Blue dashed lines show actual sidewalk locations from OpenStreetMap</li>
              <li>• You must click within 50 meters of a blue line to add a point</li>
              <li>• Connect 2+ points along the same sidewalk to create a segment</li>
              <li>• Points will automatically snap to the exact sidewalk location</li>
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
          
          {/* Show sidewalk overlay */}
          <SidewalkOverlay sidewalkData={sidewalkData} />
          
          {/* Drawing events */}
          <DrawingEvents 
            onCoordinatesChange={onCoordinatesChange}
            coordinates={coordinates}
            setCoordinates={setCoordinates}
            sidewalkData={sidewalkData}
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
          
          {/* Show individual points as markers */}
          {coordinates.map((coord, index) => (
            <CircleMarker
              key={index}
              center={coord}
              radius={6}
              fillColor="#EF4444"
              color="#DC2626"
              weight={2}
              opacity={0.9}
              fillOpacity={0.7}
            />
          ))}
        </MapContainer>

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