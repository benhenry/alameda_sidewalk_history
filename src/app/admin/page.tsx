'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Edit, Trash2, MapPin, Camera, Upload } from 'lucide-react'
import SegmentForm from '@/components/SegmentForm'
import PhotoUpload from '@/components/PhotoUpload'
import AdminSegmentApproval from '@/components/AdminSegmentApproval'
import { SidewalkSegment, Contractor } from '@/types/sidewalk'
import { authenticatedFetch } from '@/lib/api'

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-200 flex items-center justify-center">Loading map...</div>
})

export default function AdminPage() {
  const [segments, setSegments] = useState<SidewalkSegment[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [selectedSegment, setSelectedSegment] = useState<SidewalkSegment | undefined>()
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | undefined>()
  const [zoomToSegmentId, setZoomToSegmentId] = useState<string | undefined>()
  const [adminPreviewMode, setAdminPreviewMode] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingSegment, setEditingSegment] = useState<SidewalkSegment | undefined>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [segmentsRes, contractorsRes, adminSegmentsRes] = await Promise.all([
        fetch('/api/segments'),
        fetch('/api/contractors'),
        authenticatedFetch('/api/admin/segments')
      ])
      
      const segmentsData = await segmentsRes.json()
      const contractorsData = await contractorsRes.json()
      const adminSegmentsData = adminSegmentsRes.ok ? await adminSegmentsRes.json() : []
      
      // Combine approved segments with pending segments for map display
      const allSegmentsForMap = [
        ...segmentsData,
        ...adminSegmentsData.filter((seg: any) => seg.status === 'pending')
      ]
      
      setSegments(allSegmentsForMap)
      setContractors(contractorsData)
    } catch (error) {
      console.error('Error loading data:', error)
      alert('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSegment = async (segmentData: Partial<SidewalkSegment>) => {
    try {
      const url = editingSegment ? `/api/segments/${editingSegment.id}` : '/api/segments'
      const method = editingSegment ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(segmentData)
      })

      if (!response.ok) {
        throw new Error('Failed to save segment')
      }

      await loadData()
      setShowForm(false)
      setEditingSegment(undefined)
      alert(editingSegment ? 'Segment updated successfully!' : 'Segment created successfully!')
    } catch (error) {
      console.error('Error saving segment:', error)
      alert('Failed to save segment')
    }
  }

  const handleDeleteSegment = async (segment: SidewalkSegment) => {
    if (!confirm(`Are you sure you want to delete the segment on ${segment.street}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/segments/${segment.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete segment')
      }

      await loadData()
      alert('Segment deleted successfully!')
    } catch (error) {
      console.error('Error deleting segment:', error)
      alert('Failed to delete segment')
    }
  }

  const handleEditSegment = (segment: SidewalkSegment) => {
    setEditingSegment(segment)
    setShowForm(true)
  }

  const handlePreviewSegment = (segment: SidewalkSegment) => {
    setHighlightedSegmentId(segment.id)
    setZoomToSegmentId(segment.id)
    setSelectedSegment(segment)
    setAdminPreviewMode(true)
    
    // Clear preview mode and zoom after 10 seconds
    setTimeout(() => {
      setHighlightedSegmentId(undefined)
      setZoomToSegmentId(undefined)
      setAdminPreviewMode(false)
    }, 10000)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Alameda Sidewalk Map - Admin
              </h1>
              <p className="text-gray-600">Manage sidewalk segments and contractor data</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Segment
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold text-gray-800">Map View</h2>
                <p className="text-gray-600 text-sm">Click segments to view details</p>
              </div>
              <div className="h-96">
                <Map
                  segments={segments}
                  filters={{}}
                  onSegmentClick={setSelectedSegment}
                  highlightedSegmentId={highlightedSegmentId}
                  zoomToSegment={zoomToSegmentId}
                  adminPreviewMode={adminPreviewMode}
                  isAdminPage={true}
                />
              </div>
            </div>

            {/* Selected Segment Details */}
            {selectedSegment && (
              <div className="mt-6 space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">
                      Selected Segment
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSegment(selectedSegment)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteSegment(selectedSegment)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Street:</span>
                      <span className="ml-2">{selectedSegment.street}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Block:</span>
                      <span className="ml-2">{selectedSegment.block}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Contractor:</span>
                      <span className="ml-2">{selectedSegment.contractor}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Year:</span>
                      <span className="ml-2">{selectedSegment.year}</span>
                    </div>
                    {selectedSegment.notes && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-700">Notes:</span>
                        <span className="ml-2">{selectedSegment.notes}</span>
                      </div>
                    )}
                    {selectedSegment.specialMarks && selectedSegment.specialMarks.length > 0 && (
                      <div className="col-span-2">
                        <span className="font-medium text-gray-700">Special Marks:</span>
                        <span className="ml-2">{selectedSegment.specialMarks.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Photo Upload Section */}
                <PhotoUpload
                  sidewalkSegmentId={selectedSegment.id}
                  existingPhotos={selectedSegment.photos || []}
                  onPhotosUpdated={loadData}
                />
              </div>
            )}
          </div>

          {/* Statistics and Data Section */}
          <div className="space-y-6">
            {/* Segment Approval */}
            <AdminSegmentApproval onPreviewSegment={handlePreviewSegment} />

            {/* Statistics */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Segments</span>
                  <span className="font-semibold">{segments.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Contractors</span>
                  <span className="font-semibold">{contractors.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Year Range</span>
                  <span className="font-semibold">
                    {segments.length > 0 
                      ? `${Math.min(...segments.map(s => s.year))} - ${Math.max(...segments.map(s => s.year))}`
                      : 'N/A'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">With Photos</span>
                  <span className="font-semibold">
                    {segments.filter(s => s.photos && s.photos.length > 0).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Segments */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Segments</h3>
              <div className="space-y-3">
                {segments
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((segment) => (
                    <div
                      key={segment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => setSelectedSegment(segment)}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-sm">{segment.street}</p>
                          <p className="text-xs text-gray-500">{segment.contractor}, {segment.year}</p>
                        </div>
                      </div>
                      {segment.photos && segment.photos.length > 0 && (
                        <Camera className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Top Contractors */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Contractors</h3>
              <div className="space-y-2">
                {contractors
                  .sort((a, b) => b.totalSegments - a.totalSegments)
                  .slice(0, 5)
                  .map((contractor) => (
                    <div key={contractor.id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">{contractor.name}</span>
                      <span className="text-sm font-semibold">{contractor.totalSegments}</span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segment Form Modal */}
      {showForm && (
        <SegmentForm
          segment={editingSegment}
          onSave={handleSaveSegment}
          onCancel={() => {
            setShowForm(false)
            setEditingSegment(undefined)
          }}
        />
      )}
    </div>
  )
}