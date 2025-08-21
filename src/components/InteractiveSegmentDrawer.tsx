'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { Trash2, Undo, Check, AlertTriangle } from 'lucide-react'

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
  setCoordinates 
}: {
  onCoordinatesChange: (coords: [number, number][]) => void
  coordinates: [number, number][]
  setCoordinates: (coords: [number, number][]) => void
}) {
  useMapEvents({
    click: (e) => {
      const newCoord: [number, number] = [e.latlng.lat, e.latlng.lng]
      const updatedCoords = [...coordinates, newCoord]
      setCoordinates(updatedCoords)
      onCoordinatesChange(updatedCoords)
    },
  })
  return null
}

function SidewalkOverlay({ sidewalkData }: { sidewalkData?: [number, number][] }) {
  const map = useMap()
  
  useEffect(() => {
    if (!sidewalkData || sidewalkData.length === 0) return

    // Group consecutive coordinates into lines for better performance
    const lines: [number, number][][] = []
    let currentLine: [number, number][] = []
    
    for (let i = 0; i < sidewalkData.length; i++) {
      if (currentLine.length === 0) {
        currentLine.push(sidewalkData[i])
      } else {
        const lastCoord = currentLine[currentLine.length - 1]
        const currentCoord = sidewalkData[i]
        
        // If coordinates are close (within ~50m), add to current line
        const distance = Math.sqrt(
          Math.pow((currentCoord[0] - lastCoord[0]) * 111000, 2) +
          Math.pow((currentCoord[1] - lastCoord[1]) * 111000, 2)
        )
        
        if (distance < 50 && currentLine.length < 100) {
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

    // Add polylines to map
    const overlays = lines.map(line => 
      L.polyline(line, {
        color: '#3B82F6',
        weight: 2,
        opacity: 0.3,
        dashArray: '5, 5'
      }).addTo(map)
    )

    return () => {
      overlays.forEach(overlay => map.removeLayer(overlay))
    }
  }, [map, sidewalkData])

  return null
}

export default function InteractiveSegmentDrawer({
  onCoordinatesChange,
  initialCoordinates = [],
  sidewalkData
}: InteractiveSegmentDrawerProps) {
  const [coordinates, setCoordinates] = useState<[number, number][]>(initialCoordinates)
  const [isClient, setIsClient] = useState(false)

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

  if (!isClient) {
    return <div className="w-full h-64 bg-gray-200 flex items-center justify-center">Loading map...</div>
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 mb-1">How to draw a sidewalk segment:</p>
            <ul className="text-blue-700 space-y-1">
              <li>• Click on the map to add points along the sidewalk</li>
              <li>• Blue dashed lines show known sidewalk locations</li>
              <li>• Connect points to create a line representing the sidewalk segment</li>
              <li>• Add at least 2 points to define a segment</li>
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
          
          {/* Show sidewalk overlay */}
          <SidewalkOverlay sidewalkData={sidewalkData} />
          
          {/* Drawing events */}
          <DrawingEvents 
            onCoordinatesChange={onCoordinatesChange}
            coordinates={coordinates}
            setCoordinates={setCoordinates}
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
          
          {/* Show individual points */}
          {coordinates.map((coord, index) => (
            <div key={index}>
              {/* We'll add markers here if needed */}
            </div>
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