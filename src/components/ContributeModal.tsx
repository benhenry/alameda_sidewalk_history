'use client'

import { useState } from 'react'
import { X, MapPin, Camera, Save } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import SegmentForm from './SegmentForm'
import PhotoUpload from './PhotoUpload'
import { SidewalkSegment } from '@/types/sidewalk'

interface ContributeModalProps {
  isOpen: boolean
  onClose: () => void
  selectedSegment?: SidewalkSegment
  onSegmentSaved: () => void
}

export default function ContributeModal({ 
  isOpen, 
  onClose, 
  selectedSegment,
  onSegmentSaved 
}: ContributeModalProps) {
  const [mode, setMode] = useState<'segment' | 'photo'>('segment')
  const { user } = useAuth()

  if (!isOpen || !user) return null

  const handleSegmentSave = async (segmentData: Partial<SidewalkSegment>) => {
    try {
      const url = selectedSegment ? `/api/segments/${selectedSegment.id}` : '/api/segments'
      const method = selectedSegment ? 'PUT' : 'POST'
      
      const token = typeof document !== 'undefined' ? document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1] : null

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(segmentData)
      })

      if (!response.ok) {
        const error = await response.json()
        if (response.status === 422 && error.invalidCoordinates) {
          // Handle validation error with more specific message
          alert(`Some coordinates are not near known sidewalk locations. Please adjust your segment to follow actual sidewalk paths. Invalid coordinates: ${error.invalidCoordinates.map((c: [number, number]) => `${c[0].toFixed(6)}, ${c[1].toFixed(6)}`).join('; ')}`)
          return
        }
        throw new Error(error.error || 'Failed to save segment')
      }

      onSegmentSaved()
      onClose()
      if (selectedSegment) {
        alert('Segment updated successfully!')
      } else {
        alert('Segment submitted for review! It will appear on the map once approved by an admin.')
      }
    } catch (error) {
      console.error('Error saving segment:', error)
      alert(error instanceof Error ? error.message : 'Failed to save segment')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1100]">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Contribute to Alameda Sidewalk Map
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Help document the history of Alameda's sidewalks
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            onClick={() => setMode('segment')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              mode === 'segment'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <MapPin className="h-4 w-4" />
            Add/Edit Segment
          </button>
          {selectedSegment && (
            <button
              onClick={() => setMode('photo')}
              className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
                mode === 'photo'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Camera className="h-4 w-4" />
              Add Photos
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {mode === 'segment' ? (
            <div>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Guidelines for Contributing
                </h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Provide accurate contractor names and installation years</li>
                  <li>• Use precise coordinates for the sidewalk segment</li>
                  <li>• Document special markings like pipe indicators ("P")</li>
                  <li>• Include helpful notes about the condition or historical context</li>
                  <li>• Upload clear photos of contractor stamps when possible</li>
                </ul>
              </div>

              <SegmentForm
                segment={selectedSegment}
                onSave={handleSegmentSave}
                onCancel={onClose}
              />
            </div>
          ) : selectedSegment ? (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Add Photos for {selectedSegment.street}
                </h3>
                <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                  <p><strong>Contractor:</strong> {selectedSegment.contractor}</p>
                  <p><strong>Year:</strong> {selectedSegment.year}</p>
                  <p><strong>Block:</strong> {selectedSegment.block}</p>
                </div>
              </div>

              <PhotoUpload
                sidewalkSegmentId={selectedSegment.id}
                existingPhotos={selectedSegment.photos || []}
                onPhotosUpdated={onSegmentSaved}
              />
            </div>
          ) : null}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Thank you for contributing to preserve Alameda's sidewalk history!
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}