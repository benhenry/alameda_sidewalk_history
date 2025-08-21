'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { SidewalkSegment } from '@/types/sidewalk'
import { Save, X, MapPin, Plus, Minus } from 'lucide-react'

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
  const [sidewalkData, setSidewalkData] = useState<[number, number][]>([])
  const [loadingSidewalks, setLoadingSidewalks] = useState(true)

  // Fetch sidewalk data for overlay
  useEffect(() => {
    async function fetchSidewalks() {
      try {
        const response = await fetch('/api/sidewalks')
        if (response.ok) {
          const data = await response.json()
          setSidewalkData(data.coordinates || [])
        }
      } catch (error) {
        console.error('Failed to fetch sidewalk data:', error)
      } finally {
        setLoadingSidewalks(false)
      }
    }
    fetchSidewalks()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.contractor || !formData.street || !formData.block || formData.coordinates.length === 0) {
      alert('Please fill in all required fields and add at least one coordinate')
      return
    }

    onSave({
      ...formData,
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


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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
              <input
                type="text"
                value={formData.contractor}
                onChange={(e) => setFormData(prev => ({ ...prev, contractor: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
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
              <input
                type="text"
                value={formData.street}
                onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Block *
              </label>
              <input
                type="text"
                value={formData.block}
                onChange={(e) => setFormData(prev => ({ ...prev, block: e.target.value }))}
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