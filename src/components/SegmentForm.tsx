'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { SidewalkSegment } from '@/types/sidewalk'
import { Save, X, Plus, Minus, MapPin, Loader2 } from 'lucide-react'
import { useSidewalkData } from '@/lib/sidewalk-context'
import AutocompleteInput from './AutocompleteInput'

// Dynamically import to avoid SSR issues with Leaflet
const InteractiveSegmentDrawer = dynamic(() => import('./InteractiveSegmentDrawer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
      <span className="text-gray-500">Loading map...</span>
    </div>
  )
})

interface SegmentFormProps {
  segment?: SidewalkSegment
  onSave: (segment: Partial<SidewalkSegment>) => void
  onCancel: () => void
}

export default function SegmentForm({ segment, onSave, onCancel }: SegmentFormProps) {
  const [formData, setFormData] = useState({
    contractor: segment?.contractor || '',
    year: segment?.year || new Date().getFullYear(),
    notes: segment?.notes || '',
    specialMarks: segment?.specialMarks || [],
    coordinates: segment?.coordinates || []
  })

  // Inferred location data (auto-filled from coordinates)
  const [inferredStreet, setInferredStreet] = useState<string | null>(segment?.street || null)
  const [inferredBlock, setInferredBlock] = useState<string | null>(segment?.block || null)
  const [isGeocodingBlock, setIsGeocodingBlock] = useState(false)

  const [newSpecialMark, setNewSpecialMark] = useState('')
  const { sidewalkData, isLoading: loadingSidewalks } = useSidewalkData()

  // Autocomplete state
  const [contractorSuggestions, setContractorSuggestions] = useState<string[]>([])
  const [contractorLoading, setContractorLoading] = useState(false)
  const [lastContractorSearch, setLastContractorSearch] = useState(formData.contractor || '')

  // Handle street detection from snap API
  const handleStreetDetected = useCallback((street: string | null) => {
    if (street && !inferredStreet) {
      setInferredStreet(street)
    }
  }, [inferredStreet])

  // Reverse geocode to get block when coordinates change
  const reverseGeocodeForBlock = useCallback(async (coords: [number, number][]) => {
    if (coords.length === 0) return

    // Use the first coordinate for reverse geocoding
    const [lat, lng] = coords[0]

    setIsGeocodingBlock(true)
    try {
      const response = await fetch('/api/reverse-geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.block) {
          setInferredBlock(data.block)
        }
        // Also use street from reverse geocode if we didn't get one from snap
        if (data.street && !inferredStreet) {
          setInferredStreet(data.street)
        }
      }
    } catch (error) {
      console.error('Reverse geocode error:', error)
    } finally {
      setIsGeocodingBlock(false)
    }
  }, [inferredStreet])

  // Handle coordinate changes
  const handleCoordinatesChange = useCallback((coords: [number, number][]) => {
    setFormData(prev => ({ ...prev, coordinates: coords }))

    // Reverse geocode for block if we have coordinates
    if (coords.length > 0 && !inferredBlock) {
      reverseGeocodeForBlock(coords)
    }
  }, [inferredBlock, reverseGeocodeForBlock])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.contractor || formData.coordinates.length < 2) {
      alert('Please fill in contractor and add at least 2 points on the map')
      return
    }

    if (!inferredStreet) {
      alert('Could not determine street name. Please try drawing the segment again closer to the reference sidewalks.')
      return
    }

    onSave({
      ...formData,
      street: inferredStreet,
      block: inferredBlock || 'Unknown',
      coordinates: formData.coordinates.filter(coord => coord[0] !== 0 && coord[1] !== 0)
    })
  }

  const addSpecialMark = () => {
    if (newSpecialMark.trim()) {
      setFormData(prev => ({
        ...prev,
        specialMarks: [...prev.specialMarks, newSpecialMark.trim()]
      }))
      setNewSpecialMark('')
    }
  }

  const removeSpecialMark = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialMarks: prev.specialMarks.filter((_, i) => i !== index)
    }))
  }

  // Autocomplete functions
  const searchContractors = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setContractorSuggestions([])
      setLastContractorSearch('')
      return
    }

    // Only search if the query has actually changed
    if (query === lastContractorSearch) {
      return
    }

    setLastContractorSearch(query)
    setContractorLoading(true)
    try {
      const response = await fetch(`/api/autocomplete/contractors?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const suggestions = await response.json()
        setContractorSuggestions(suggestions)
      }
    } catch (error) {
      console.error('Error fetching contractor suggestions:', error)
    }
    setContractorLoading(false)
  }, [lastContractorSearch])


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200]">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {segment ? 'Edit Segment' : 'Add New Segment'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Segment Location - FIRST so street/block are auto-detected */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Draw Segment on Map *
            </label>
            <p className="text-sm text-gray-500 mb-2">
              Click on the map to draw your sidewalk segment. Street and block will be detected automatically.
            </p>
            {loadingSidewalks ? (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Loading sidewalk data...</span>
              </div>
            ) : (
              <InteractiveSegmentDrawer
                onCoordinatesChange={handleCoordinatesChange}
                onStreetDetected={handleStreetDetected}
                initialCoordinates={formData.coordinates}
                sidewalkData={sidewalkData}
              />
            )}
          </div>

          {/* Auto-detected location info */}
          {(inferredStreet || inferredBlock || formData.coordinates.length > 0) && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">Detected Location</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-green-700 font-medium">Street:</span>{' '}
                  <span className="text-green-900">
                    {inferredStreet || <span className="text-gray-400 italic">Draw on map to detect</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-700 font-medium">Block:</span>{' '}
                  {isGeocodingBlock ? (
                    <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                  ) : (
                    <span className="text-green-900">
                      {inferredBlock || <span className="text-gray-400 italic">Detecting...</span>}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contractor *
              </label>
              <AutocompleteInput
                value={formData.contractor}
                onChange={(value) => setFormData(prev => ({ ...prev, contractor: value }))}
                placeholder="Start typing contractor name..."
                required
                className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                suggestions={contractorSuggestions}
                loading={contractorLoading}
                onSearch={searchContractors}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year *
              </label>
              <input
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any additional notes about this sidewalk segment..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Marks
            </label>
            <div className="space-y-2">
              {formData.specialMarks.map((mark, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="flex-1 px-2 py-1 bg-gray-100 rounded">{mark}</span>
                  <button
                    type="button"
                    onClick={() => removeSpecialMark(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSpecialMark}
                  onChange={(e) => setNewSpecialMark(e.target.value)}
                  placeholder="Add special mark (e.g., P for pipe)"
                  className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialMark())}
                />
                <button
                  type="button"
                  onClick={addSpecialMark}
                  className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              <Save className="h-4 w-4" />
              Save Segment
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}