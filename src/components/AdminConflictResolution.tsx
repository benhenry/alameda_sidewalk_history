'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, RefreshCw, Check, Trash2, Eye, Search } from 'lucide-react'
import { authenticatedFetch, handleApiError } from '@/lib/api'

interface Conflict {
  id: string
  segment1_id: string
  segment1_street: string
  segment1_block: string
  segment1_contractor: string
  segment2_id: string
  segment2_street: string
  segment2_block: string
  segment2_contractor: string
  overlap_length_meters: number
  status: 'open' | 'resolved' | 'accepted'
  resolution_action?: string
  resolved_by_username?: string
  resolved_at?: string
  created_at: string
}

interface AdminConflictResolutionProps {
  onPreviewSegments?: (segment1Id: string, segment2Id: string) => void
}

export default function AdminConflictResolution({ onPreviewSegments }: AdminConflictResolutionProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [processingConflicts, setProcessingConflicts] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'open' | 'all'>('open')

  useEffect(() => {
    loadConflicts()
  }, [])

  const loadConflicts = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/conflicts')
      if (!response.ok) {
        handleApiError(response)
        throw new Error('Failed to fetch conflicts')
      }
      const data = await response.json()
      setConflicts(data.conflicts || [])
    } catch (error) {
      console.error('Error loading conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const runDetection = async () => {
    setDetecting(true)
    try {
      const response = await authenticatedFetch('/api/admin/conflicts', {
        method: 'POST',
        body: JSON.stringify({ minOverlapMeters: 1 })
      })
      if (!response.ok) {
        handleApiError(response)
        throw new Error('Failed to run detection')
      }
      const data = await response.json()
      alert(`Detection complete: ${data.detected} overlaps found`)
      await loadConflicts()
    } catch (error) {
      console.error('Error running detection:', error)
      alert('Failed to run overlap detection')
    } finally {
      setDetecting(false)
    }
  }

  const resolveConflict = async (conflict: Conflict, action: string) => {
    if (processingConflicts.has(conflict.id)) return

    let confirmMessage = ''
    switch (action) {
      case 'accept_overlap':
        confirmMessage = 'Accept this overlap as intentional? It will be hidden from future detection.'
        break
      case 'delete_segment1':
        confirmMessage = `Delete segment at ${conflict.segment1_street} block ${conflict.segment1_block}? This cannot be undone.`
        break
      case 'delete_segment2':
        confirmMessage = `Delete segment at ${conflict.segment2_street} block ${conflict.segment2_block}? This cannot be undone.`
        break
    }

    if (!confirm(confirmMessage)) return

    setProcessingConflicts(prev => new Set(prev).add(conflict.id))

    try {
      const response = await authenticatedFetch('/api/admin/conflicts/resolve', {
        method: 'POST',
        body: JSON.stringify({
          conflictId: conflict.id,
          action,
          segment1Id: conflict.segment1_id,
          segment2Id: conflict.segment2_id
        })
      })

      if (!response.ok) {
        handleApiError(response)
        throw new Error('Failed to resolve conflict')
      }

      await loadConflicts()
      alert('Conflict resolved successfully!')
    } catch (error) {
      console.error('Error resolving conflict:', error)
      alert('Failed to resolve conflict')
    } finally {
      setProcessingConflicts(prev => {
        const newSet = new Set(prev)
        newSet.delete(conflict.id)
        return newSet
      })
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            Open
          </span>
        )
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
            <Check className="h-3 w-3" />
            Resolved
          </span>
        )
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
            <Check className="h-3 w-3" />
            Accepted
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
          <span>Loading conflicts...</span>
        </div>
      </div>
    )
  }

  const openConflicts = conflicts.filter(c => c.status === 'open')
  const displayConflicts = activeTab === 'open' ? openConflicts : conflicts

  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Overlap Conflicts</h2>
          <div className="flex items-center gap-4">
            {openConflicts.length > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-700">{openConflicts.length} open conflicts</span>
              </div>
            )}
            <button
              onClick={runDetection}
              disabled={detecting}
              className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
            >
              <Search className="h-4 w-4" />
              {detecting ? 'Detecting...' : 'Run Detection'}
            </button>
          </div>
        </div>

        <div className="flex">
          <button
            onClick={() => setActiveTab('open')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'open'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Open ({openConflicts.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Conflicts ({conflicts.length})
          </button>
        </div>
      </div>

      <div className="p-6">
        {displayConflicts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {activeTab === 'open'
              ? 'No open conflicts. Run detection to check for overlaps.'
              : 'No conflicts found.'
            }
          </div>
        ) : (
          <div className="space-y-4">
            {displayConflicts.map((conflict) => (
              <div key={conflict.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(conflict.status)}
                      <span className="text-sm text-gray-500">
                        {conflict.overlap_length_meters.toFixed(1)}m overlap
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-gray-50 rounded p-3">
                        <div className="font-medium text-gray-900">Segment 1</div>
                        <div className="text-gray-600">{conflict.segment1_street}</div>
                        <div className="text-gray-600">Block {conflict.segment1_block}</div>
                        <div className="text-gray-500 text-xs">{conflict.segment1_contractor}</div>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="font-medium text-gray-900">Segment 2</div>
                        <div className="text-gray-600">{conflict.segment2_street}</div>
                        <div className="text-gray-600">Block {conflict.segment2_block}</div>
                        <div className="text-gray-500 text-xs">{conflict.segment2_contractor}</div>
                      </div>
                    </div>

                    {conflict.resolved_by_username && (
                      <div className="mt-2 text-xs text-gray-500">
                        Resolved by {conflict.resolved_by_username} on{' '}
                        {new Date(conflict.resolved_at!).toLocaleDateString()}
                        {conflict.resolution_action && ` (${conflict.resolution_action})`}
                      </div>
                    )}
                  </div>
                </div>

                {conflict.status === 'open' && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    {onPreviewSegments && (
                      <button
                        onClick={() => onPreviewSegments(conflict.segment1_id, conflict.segment2_id)}
                        className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </button>
                    )}
                    <button
                      onClick={() => resolveConflict(conflict, 'accept_overlap')}
                      disabled={processingConflicts.has(conflict.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50 text-sm"
                    >
                      <Check className="h-4 w-4" />
                      Accept Overlap
                    </button>
                    <button
                      onClick={() => resolveConflict(conflict, 'delete_segment1')}
                      disabled={processingConflicts.has(conflict.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Seg 1
                    </button>
                    <button
                      onClick={() => resolveConflict(conflict, 'delete_segment2')}
                      disabled={processingConflicts.has(conflict.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Seg 2
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
