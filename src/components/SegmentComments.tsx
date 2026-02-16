'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Send, Reply, Trash2, Edit2, Clock, User } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useToast } from './Toast'

interface Comment {
  id: string
  segment_id: string
  user_id: string | null
  username: string | null
  user_username?: string
  content: string
  parent_id: string | null
  is_edited: boolean
  created_at: string
  updated_at: string
  replies?: Comment[]
}

interface SegmentCommentsProps {
  segmentId: string
  className?: string
}

export default function SegmentComments({
  segmentId,
  className = ''
}: SegmentCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { user } = useAuth()
  const { showSuccess, showError } = useToast()

  useEffect(() => {
    loadComments()
  }, [segmentId])

  const loadComments = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/segments/${segmentId}/comments`)
      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/segments/${segmentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment.trim() })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to post comment')
      }

      setNewComment('')
      showSuccess('Comment posted!')
      loadComments()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/segments/${segmentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: replyContent.trim(),
          parentId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to post reply')
      }

      setReplyContent('')
      setReplyingTo(null)
      showSuccess('Reply posted!')
      loadComments()
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? 'ml-8 border-l-2 border-gray-200 pl-4' : ''}`}
    >
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <span className="font-medium text-gray-900">
                {comment.username || comment.user_username || 'Anonymous'}
              </span>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatDate(comment.created_at)}</span>
                {comment.is_edited && <span className="italic">(edited)</span>}
              </div>
            </div>
          </div>
        </div>

        <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>

        {user && !isReply && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {replyingTo === comment.id ? (
              <div className="space-y-2">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={submitting || !replyContent.trim()}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Posting...' : 'Post Reply'}
                  </button>
                  <button
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent('')
                    }}
                    className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
              >
                <Reply className="h-4 w-4" />
                Reply
              </button>
            )}
          </div>
        )}
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  )

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="flex items-center gap-2 text-gray-500">
          <MessageSquare className="h-4 w-4 animate-pulse" />
          <span>Loading comments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-800">Comments</h3>
        <span className="text-sm text-gray-500">
          ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
        </span>
      </div>

      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" />
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center text-gray-600">
          <p>Sign in to leave a comment</p>
        </div>
      )}

      {/* Comments List */}
      {comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  )
}
