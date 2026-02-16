import { NextRequest, NextResponse } from 'next/server'
import { getSegmentComments, createSegmentComment } from '@/lib/database'
import { getAuthUser } from '@/lib/get-auth-user'
import { sanitizeHtml } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// GET - Fetch comments for a segment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segmentId = params.id

    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID required' }, { status: 400 })
    }

    const comments = await getSegmentComments(segmentId)

    // Organize into threads (top-level and replies)
    const topLevel = comments.filter(c => !c.parent_id)
    const replies = comments.filter(c => c.parent_id)

    const threads = topLevel.map(comment => ({
      ...comment,
      replies: replies.filter(r => r.parent_id === comment.id)
    }))

    return NextResponse.json({
      comments: threads,
      count: comments.length
    })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    )
  }
}

// POST - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authenticated user
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const segmentId = params.id
    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { content, parentId } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content required' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 })
    }

    // Sanitize the content
    const sanitizedContent = sanitizeHtml(content.trim())

    const comment = await createSegmentComment({
      segmentId,
      userId: user.id,
      username: user.username || undefined,
      content: sanitizedContent,
      parentId: parentId || null
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
