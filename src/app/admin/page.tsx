'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Plus, Edit, Trash2, MapPin, Camera, Upload } from 'lucide-react'
import SegmentForm from '@/components/SegmentForm'
import PhotoUpload from '@/components/PhotoUpload'
import AdminSegmentApproval from '@/components/AdminSegmentApproval'
import AdminConflictResolution from '@/components/AdminConflictResolution'
import { SidewalkSegment, Contractor } from '@/types/sidewalk'
import { authenticatedFetch } from '@/lib/api'
import { useToast } from '@/components/Toast'

const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="w-full h-96 bg-gray-200 flex items-center justify-center">Loading map...</div>
})

type AdminTab = 'map' | 'approval' | 'conflicts' | 'stats'

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
  const [activeTab, setActiveTab] = useState<AdminTab>('map')
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const { showSuccess, showError } = useToast()

  // Cleanup preview timeout on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current)
      }
    }
  }, [])

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
      showError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSegment = async (segmentData: Partial<SidewalkSegment>) => {
    try {
      const url = editingSegment ? `/api/segments/${editingSegment.id}` : '/api/segments'
      const method = editingSegment ? 'PUT' : 'POST'

      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(segmentData)
      })

      if (!response.ok) {
        throw new Error('Failed to save segment')
      }

      await loadData()
      setShowForm(false)
      setEditingSegment(undefined)
      showSuccess(editingSegment ? 'Segment updated successfully!' : 'Segment created successfully!')
    } catch (error) {
      console.error('Error saving segment:', error)
      showError('Failed to save segment')
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
      showSuccess('Segment deleted successfully!')
    } catch (error) {
      console.error('Error deleting segment:', error)
      showError('Failed to delete segment')
    }
  }

  const handleEditSegment = (segment: SidewalkSegment) => {
    setEditingSegment(segment)
    setShowForm(true)
  }

  const handlePreviewSegment = (segment: SidewalkSegment) => {
    // Clear any existing preview timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current)
    }

    setHighlightedSegmentId(segment.id)
    setZoomToSegmentId(segment.id)
    setSelectedSegment(segment)
    setAdminPreviewMode(true)

    // Clear preview mode and zoom after 10 seconds
    previewTimeoutRef.current = setTimeout(() => {
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
              aria-label="Add new segment"
            >
              <Plus className="h-5 w-5" />
              Add Segment
            </button>
          </div>

          {/* Admin Navigation Tabs */}
          <nav className="flex border-t border-gray-200" role="tablist" aria-label="Admin sections">
            <button
              onClick={() => setActiveTab('map')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'map'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeTab === 'map'}
              aria-controls="map-panel"
            >
              <MapPin className="inline h-4 w-4 mr-1" />
              Map & Segments
            </button>
            <button
              onClick={() => setActiveTab('approval')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'approval'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeTab === 'approval'}
              aria-controls="approval-panel"
            >
              Segment Approval
            </button>
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'conflicts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeTab === 'conflicts'}
              aria-controls="conflicts-panel"
            >
              Overlap Conflicts
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              role="tab"
              aria-selected={activeTab === 'stats'}
              aria-controls="stats-panel"
            >
              Statistics
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Map & Segments Tab */}
        {activeTab === 'map' && (
          <div id="map-panel" role="tabpanel" aria-labelledby="map-tab">
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
                            aria-label="Edit segment"
                          >
                            <Edit className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSegment(selectedSegment)}
                            className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                            aria-label="Delete segment"
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

              {/* Recent Segments sidebar */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Segments</h3>
                  <div className="space-y-3">
                    {segments
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 10)
                      .map((segment) => (
                        <div
                          key={segment.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => setSelectedSegment(segment)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedSegment(segment)}
                          aria-label={`Select segment on ${segment.street}`}
                        >
                          <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="font-medium text-sm">{segment.street}</p>
                              <p className="text-xs text-gray-500">{segment.contractor}, {segment.year}</p>
                            </div>
                          </div>
                          {segment.photos && segment.photos.length > 0 && (
                            <Camera className="h-4 w-4 text-blue-500" aria-label="Has photos" />
                          )}
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Segment Approval Tab */}
        {activeTab === 'approval' && (
          <div id="approval-panel" role="tabpanel" aria-labelledby="approval-tab">
            <AdminSegmentApproval onPreviewSegment={handlePreviewSegment} />
          </div>
        )}

        {/* Overlap Conflicts Tab */}
        {activeTab === 'conflicts' && (
          <div id="conflicts-panel" role="tabpanel" aria-labelledby="conflicts-tab">
            <AdminConflictResolution />
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div id="stats-panel" role="tabpanel" aria-labelledby="stats-tab">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Overview Stats */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Overview</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Segments</span>
                    <span className="font-semibold text-2xl">{segments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Contractors</span>
                    <span className="font-semibold text-2xl">{contractors.length}</span>
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
                    <span className="font-semibold text-2xl">
                      {segments.filter(s => s.photos && s.photos.length > 0).length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Top Contractors */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Contractors</h3>
                <div className="space-y-2">
                  {contractors
                    .sort((a, b) => b.totalSegments - a.totalSegments)
                    .slice(0, 10)
                    .map((contractor, index) => (
                      <div key={contractor.id} className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">
                          <span className="text-gray-400 mr-2">{index + 1}.</span>
                          {contractor.name}
                        </span>
                        <span className="text-sm font-semibold">{contractor.totalSegments}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* Segments by Decade */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Segments by Decade</h3>
                <div className="space-y-2">
                  {Array.from(new Set(segments.map(s => Math.floor(s.year / 10) * 10)))
                    .sort()
                    .map(decade => {
                      const count = segments.filter(s => Math.floor(s.year / 10) * 10 === decade).length
                      const percentage = segments.length > 0 ? (count / segments.length * 100).toFixed(1) : 0
                      return (
                        <div key={decade} className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 w-16">{decade}s</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-4">
                            <div
                              className="bg-blue-500 rounded-full h-4"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-12 text-right">{count}</span>
                        </div>
                      )
                    })
                  }
                </div>
              </div>
            </div>
          </div>
        )}
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