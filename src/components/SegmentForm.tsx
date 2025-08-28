'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { SidewalkSegment } from '@/types/sidewalk'
import { Save, X, MapPin, Plus, Minus, AlertCircle } from 'lucide-react'
import { useSidewalkData } from '@/lib/sidewalk-context'
import { normalizeStreetName, normalizeBlockNumber, validateStreetName, validateBlockNumber } from '@/lib/street-validation'
import AutocompleteInput from './AutocompleteInput'
import GooglePlacesInput from './GooglePlacesInput'

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
    street: segment?.street || '',
    block: segment?.block || '',
    notes: segment?.notes || '',
    specialMarks: segment?.specialMarks || [],
    coordinates: segment?.coordinates || []
  })

  const [newSpecialMark, setNewSpecialMark] = useState('')
  const { sidewalkData, isLoading: loadingSidewalks } = useSidewalkData()
  const [streetValidation, setStreetValidation] = useState<{ isValid: boolean; suggestion?: string; message?: string; isWarning?: boolean }>({ isValid: true })
  const [blockValidation, setBlockValidation] = useState<{ isValid: boolean; message?: string }>({ isValid: true })
  
  // Autocomplete state
  const [contractorSuggestions, setContractorSuggestions] = useState<string[]>([])
  const [blockSuggestions, setBlockSuggestions] = useState<string[]>([])
  const [contractorLoading, setContractorLoading] = useState(false)
  const [blockLoading, setBlockLoading] = useState(false)
  
  // Track last searched values to prevent unnecessary API calls
  // Initialize with current values to prevent initial searches
  const [lastContractorSearch, setLastContractorSearch] = useState(formData.contractor || '')
  const [lastBlockSearch, setLastBlockSearch] = useState(`${formData.block || ''}|${formData.street || ''}`)
  
  // Use ref to get current street value without triggering re-renders
  const currentStreetRef = useRef(formData.street)
  
  // Update ref when street changes
  useEffect(() => {
    currentStreetRef.current = formData.street
  }, [formData.street])

  const handleStreetChange = (street: string) => {
    // Update the street value without normalization during typing
    setFormData(prev => ({ ...prev, street }))
  }

  const handleStreetBlur = () => {
    // Normalize and validate only when field loses focus
    const normalized = normalizeStreetName(formData.street)
    setFormData(prev => ({ ...prev, street: normalized }))
    
    const validation = validateStreetName(normalized)
    setStreetValidation(validation)
  }

  const handleBlockChange = (block: string) => {
    const normalized = normalizeBlockNumber(block)
    setFormData(prev => ({ ...prev, block: normalized }))
    
    // Validate block number
    const validation = validateBlockNumber(normalized)
    setBlockValidation(validation)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.contractor || !formData.street || !formData.block || formData.coordinates.length === 0) {
      alert('Please fill in all required fields and add at least one coordinate')
      return
    }

    // Normalize street name before validation and submission
    const normalizedStreet = normalizeStreetName(formData.street)
    setFormData(prev => ({ ...prev, street: normalizedStreet }))

    // Re-validate before submitting
    const streetValidationResult = validateStreetName(normalizedStreet)
    const blockValidationResult = validateBlockNumber(formData.block)
    
    if (!streetValidationResult.isValid || !blockValidationResult.isValid) {
      alert('Please fix the validation errors before submitting.')
      return
    }

    onSave({
      ...formData,
      street: normalizedStreet,
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

  const searchBlocks = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setBlockSuggestions([])
      setLastBlockSearch('')
      return
    }

    // Get current street value from ref to avoid dependency issues
    const currentStreet = currentStreetRef.current
    
    // Create a search key that includes both query and street for comparison
    const searchKey = `${query}|${currentStreet || ''}`
    
    // Only search if the query or street has actually changed
    if (searchKey === lastBlockSearch) {
      return
    }

    setLastBlockSearch(searchKey)
    setBlockLoading(true)
    try {
      const params = new URLSearchParams({ q: query })
      if (currentStreet) {
        params.append('street', currentStreet)
      }
      const response = await fetch(`/api/autocomplete/blocks?${params}`)
      if (response.ok) {
        const suggestions = await response.json()
        setBlockSuggestions(suggestions)
      }
    } catch (error) {
      console.error('Error fetching block suggestions:', error)
    }
    setBlockLoading(false)
  }, [lastBlockSearch])


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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street *
              </label>
              <GooglePlacesInput
                value={formData.street}
                onChange={handleStreetChange}
                onBlur={handleStreetBlur}
                placeholder="e.g., Park Street, Marina Village Pkwy"
                required
                className={`p-2 border rounded-md focus:ring-2 ${
                  streetValidation.isValid 
                    ? streetValidation.isWarning
                      ? 'border-yellow-300 focus:ring-yellow-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    : 'border-red-300 focus:ring-red-500'
                }`}
              />
              {(!streetValidation.isValid || streetValidation.isWarning) && streetValidation.message && (
                <div className={`mt-1 flex items-center gap-1 text-sm ${
                  streetValidation.isValid && streetValidation.isWarning
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  <AlertCircle className="h-4 w-4" />
                  <span>{streetValidation.message}</span>
                </div>
              )}
              {streetValidation.suggestion && (
                <button
                  type="button"
                  onClick={() => handleStreetChange(streetValidation.suggestion!)}
                  className="mt-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  Use: {streetValidation.suggestion}
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Block *
              </label>
              <AutocompleteInput
                value={formData.block}
                onChange={handleBlockChange}
                placeholder="Enter block number (e.g., 2300)"
                required
                className={`p-2 border rounded-md focus:ring-2 ${
                  blockValidation.isValid 
                    ? 'border-gray-300 focus:ring-blue-500' 
                    : 'border-red-300 focus:ring-red-500'
                }`}
                suggestions={blockSuggestions}
                loading={blockLoading}
                onSearch={searchBlocks}
              />
              {!blockValidation.isValid && (
                <div className="mt-1 flex items-center gap-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span>{blockValidation.message}</span>
                </div>
              )}
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Segment Location *
            </label>
            {loadingSidewalks ? (
              <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-500">Loading sidewalk data...</span>
              </div>
            ) : (
              <InteractiveSegmentDrawer
                onCoordinatesChange={(coords) => setFormData(prev => ({ ...prev, coordinates: coords }))}
                initialCoordinates={formData.coordinates}
                sidewalkData={sidewalkData}
              />
            )}
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