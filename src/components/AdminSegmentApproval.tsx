'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, User, MapPin, Calendar, AlertTriangle, Eye } from 'lucide-react'
import { SidewalkSegment } from '@/types/sidewalk'
import { authenticatedFetch, handleApiError } from '@/lib/api'

interface AdminSegment extends SidewalkSegment {
  status: 'pending' | 'approved' | 'rejected'
  createdByUsername?: string
  approvedByUsername?: string
  approvedAt?: Date
}

interface AdminSegmentApprovalProps {
  onPreviewSegment?: (segment: AdminSegment) => void
}

export default function AdminSegmentApproval({ onPreviewSegment }: AdminSegmentApprovalProps) {
  const [pendingSegments, setPendingSegments] = useState<AdminSegment[]>([])
  const [allSegments, setAllSegments] = useState<AdminSegment[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending')
  const [loading, setLoading] = useState(true)
  const [processingSegments, setProcessingSegments] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadSegments()
  }, [])

  const loadSegments = async () => {
    try {
      const [pendingRes, allRes] = await Promise.all([
        authenticatedFetch('/api/admin/segments?status=pending'),
        authenticatedFetch('/api/admin/segments')
      ])

      if (!pendingRes.ok) {
        handleApiError(pendingRes)
        throw new Error('Failed to fetch pending segments')
      }
      
      if (!allRes.ok) {
        handleApiError(allRes)
        throw new Error('Failed to fetch all segments')
      }

      const pending = await pendingRes.json()
      const all = await allRes.json()

      setPendingSegments(pending)
      setAllSegments(all)
    } catch (error) {
      console.error('Error loading segments:', error)
      alert('Failed to load segments for approval')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveReject = async (segmentId: string, action: 'approve' | 'reject') => {
    if (processingSegments.has(segmentId)) return

    setProcessingSegments(prev => new Set(prev).add(segmentId))

    try {
      const response = await authenticatedFetch('/api/admin/segments', {
        method: 'PATCH',
        body: JSON.stringify({ segmentId, action })
      })

      if (!response.ok) {
        handleApiError(response)
        throw new Error(`Failed to ${action} segment`)
      }

      // Reload data
      await loadSegments()
      
      const actionText = action === 'approve' ? 'approved' : 'rejected'
      alert(`Segment ${actionText} successfully!`)
    } catch (error) {
      console.error(`Error ${action}ing segment:`, error)
      alert(`Failed to ${action} segment`)
    } finally {
      setProcessingSegments(prev => {
        const newSet = new Set(prev)
        newSet.delete(segmentId)
        return newSet
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        )
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
            <XCircle className="h-3 w-3" />
            Rejected
          </span>
        )
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center">
          <span>Loading segments for approval...</span>
        </div>
      </div>
    )
  }

  const displaySegments = activeTab === 'pending' ? pendingSegments : allSegments

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Segment Approval</h2>
          {pendingSegments.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-700">{pendingSegments.length} pending approval</span>
            </div>
          )}
        </div>

        <div className="flex">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending ({pendingSegments.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Segments ({allSegments.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {displaySegments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {activeTab === 'pending' 
              ? 'No segments pending approval' 
              : 'No segments found'
            }
          </div>
        ) : (
          <div className="space-y-4">
            {displaySegments.map((segment) => (
              <div key={segment.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{segment.street}</h3>
                      <p className="text-sm text-gray-600">
                        Block {segment.block} • {segment.contractor} • {segment.year}
                      </p>
                      {segment.createdByUsername && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <User className="h-3 w-3" />
                          Created by {segment.createdByUsername}
                        </div>
                      )}
                      {segment.approvedByUsername && segment.approvedAt && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          {segment.status === 'approved' ? 'Approved' : 'Rejected'} by {segment.approvedByUsername} on {new Date(segment.approvedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(segment.status)}
                  </div>
                </div>

                {segment.notes && (
                  <div className="mb-3 text-sm text-gray-600">
                    <strong>Notes:</strong> {segment.notes}
                  </div>
                )}

                {segment.specialMarks && segment.specialMarks.length > 0 && (
                  <div className="mb-3 text-sm text-gray-600">
                    <strong>Special Marks:</strong> {segment.specialMarks.join(', ')}
                  </div>
                )}

                <div className="mb-3 text-xs text-gray-500">
                  {segment.coordinates.length} coordinate points • Created {new Date(segment.createdAt).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  {onPreviewSegment && (
                    <button
                      onClick={() => onPreviewSegment(segment)}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      Preview on Map
                    </button>
                  )}
                  
                  {segment.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApproveReject(segment.id, 'approve')}
                        disabled={processingSegments.has(segment.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {processingSegments.has(segment.id) ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleApproveReject(segment.id, 'reject')}
                        disabled={processingSegments.has(segment.id)}
                        className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        <XCircle className="h-4 w-4" />
                        {processingSegments.has(segment.id) ? 'Processing...' : 'Reject'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}