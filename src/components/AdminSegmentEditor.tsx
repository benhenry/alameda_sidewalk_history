'use client'

import { useState, useEffect } from 'react'
import { X, Save, AlertTriangle } from 'lucide-react'
import { SidewalkSegment } from '@/types/sidewalk'
import { authenticatedFetch, handleApiError } from '@/lib/api'
import dynamic from 'next/dynamic'

// Dynamically import map component to avoid SSR issues
const InteractiveSegmentDrawer = dynamic(
  () => import('./InteractiveSegmentDrawer'),
  { ssr: false, loading: () => <div className="h-64 bg-gray-200 flex items-center justify-center">Loading map...</div> }
)

interface AdminSegmentEditorProps {
  segment: SidewalkSegment
  onClose: () => void
  onSave: (updatedSegment: SidewalkSegment) => void
  sidewalkData?: [number, number][][]
}

export default function AdminSegmentEditor({
  segment,
  onClose,
  onSave,
  sidewalkData
}: AdminSegmentEditorProps) {
  const [formData, setFormData] = useState({
    street: segment.street,
    block: segment.block,
    contractor: segment.contractor,
    year: segment.year,
    notes: segment.notes || '',
    specialMarks: segment.specialMarks || [],
    status: segment.status || 'pending'
  })
  const [coordinates, setCoordinates] = useState<[number, number][]>(segment.coordinates)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)  // Show map by default for easier editing

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'year' ? parseInt(value) || 0 : value
    }))
  }

  const handleSpecialMarksChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const marks = e.target.value.split(',').map(m => m.trim()).filter(Boolean)
    setFormData(prev => ({ ...prev, specialMarks: marks }))
  }

  const handleCoordinatesChange = (newCoords: [number, number][]) => {
    setCoordinates(newCoords)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)

    try {
      // Validate
      if (!formData.street || !formData.block || !formData.contractor || !formData.year) {
        throw new Error('Please fill in all required fields')
      }
      if (coordinates.length < 2) {
        throw new Error('At least 2 coordinates are required')
      }

      const response = await authenticatedFetch(`/api/admin/segments/${segment.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...formData,
          coordinates
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update segment')
      }

      const updatedSegment = await response.json()
      onSave(updatedSegment)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Segment</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street *
                </label>
                <input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Block *
                </label>
                <input
                  type="text"
                  name="block"
                  value={formData.block}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contractor *
                </label>
                <input
                  type="text"
                  name="contractor"
                  value={formData.contractor}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  min="1850"
                  max={new Date().getFullYear()}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Marks
                </label>
                <input
                  type="text"
                  value={formData.specialMarks.join(', ')}
                  onChange={handleSpecialMarksChange}
                  placeholder="P, D, Logo, etc. (comma-separated)"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about this segment..."
              />
            </div>

            {/* Coordinates Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Coordinates ({coordinates.length} points)
                </label>
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {showMap ? 'Hide Map Editor' : 'Edit on Map'}
                </button>
              </div>

              {!showMap && (
                <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-600 max-h-32 overflow-y-auto">
                  {coordinates.map((coord, idx) => (
                    <div key={idx} className="font-mono">
                      Point {idx + 1}: [{coord[0].toFixed(6)}, {coord[1].toFixed(6)}]
                    </div>
                  ))}
                </div>
              )}

              {showMap && (
                <div className="mt-2">
                  <InteractiveSegmentDrawer
                    onCoordinatesChange={handleCoordinatesChange}
                    initialCoordinates={coordinates}
                    sidewalkData={sidewalkData}
                  />
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
