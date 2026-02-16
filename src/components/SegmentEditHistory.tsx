'use client'

import { useState, useEffect } from 'react'
import { History, User, Clock, FileEdit, CheckCircle, XCircle, Plus } from 'lucide-react'

interface EditHistoryEntry {
  id: string
  segment_id: string
  edited_by: string | null
  edited_by_username: string | null
  edit_type: 'create' | 'update' | 'approve' | 'reject'
  field_changes: string[]
  previous_values: Record<string, any>
  new_values: Record<string, any>
  notes: string | null
  created_at: string
  street?: string
  block?: string
}

interface SegmentEditHistoryProps {
  segmentId: string
  className?: string
}

const editTypeIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4 text-green-600" />,
  update: <FileEdit className="h-4 w-4 text-blue-600" />,
  approve: <CheckCircle className="h-4 w-4 text-green-600" />,
  reject: <XCircle className="h-4 w-4 text-red-600" />,
}

const editTypeLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  approve: 'Approved',
  reject: 'Rejected',
}

const editTypeColors: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  approve: 'bg-green-100 text-green-800',
  reject: 'bg-red-100 text-red-800',
}

export default function SegmentEditHistory({
  segmentId,
  className = ''
}: SegmentEditHistoryProps) {
  const [history, setHistory] = useState<EditHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadHistory()
  }, [segmentId])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/segments/${segmentId}/history`)
      if (!response.ok) {
        throw new Error('Failed to fetch history')
      }
      const data = await response.json()
      setHistory(data.history || [])
    } catch (err) {
      console.error('Error loading history:', err)
      setError('Failed to load edit history')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFieldName = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '(empty)'
    if (Array.isArray(value)) return value.join(', ') || '(empty)'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <History className="h-4 w-4 animate-spin" />
          <span>Loading history...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <History className="h-4 w-4" />
          <span>No edit history available</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-800">Edit History</h3>
        <span className="text-sm text-gray-500">({history.length} entries)</span>
      </div>

      <div className="space-y-3">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => toggleExpanded(entry.id)}
              className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {editTypeIcons[entry.edit_type]}
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${editTypeColors[entry.edit_type]}`}>
                  {editTypeLabels[entry.edit_type]}
                </span>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  <User className="h-3 w-3" />
                  <span>{entry.edited_by_username || 'System'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatDate(entry.created_at)}</span>
              </div>
            </button>

            {expanded.has(entry.id) && (
              <div className="px-4 py-3 border-t border-gray-200 bg-white">
                {entry.field_changes && entry.field_changes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Changes:</h4>
                    <div className="space-y-1">
                      {entry.field_changes.map((field: string) => (
                        <div key={field} className="text-sm">
                          <span className="font-medium text-gray-600">{formatFieldName(field)}:</span>
                          {entry.previous_values?.[field] !== undefined && (
                            <span className="ml-2 text-red-600 line-through">
                              {formatValue(entry.previous_values[field])}
                            </span>
                          )}
                          {entry.new_values?.[field] !== undefined && (
                            <span className="ml-2 text-green-600">
                              {formatValue(entry.new_values[field])}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {entry.notes && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-gray-700">Notes:</h4>
                    <p className="text-sm text-gray-600 mt-1">{entry.notes}</p>
                  </div>
                )}
                {(!entry.field_changes || entry.field_changes.length === 0) && !entry.notes && (
                  <p className="text-sm text-gray-500">No details available</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
