import { NextRequest, NextResponse } from 'next/server'
import {
  resolveSegmentConflict,
  acceptSegmentConflict,
  deleteSegment,
  getSegmentById
} from '@/lib/database'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/conflicts/resolve
 *
 * Resolves a segment conflict with the specified action.
 *
 * Request Body:
 *   {
 *     conflictId: string,
 *     action: 'accept_overlap' | 'delete_segment1' | 'delete_segment2'
 *   }
 *
 * Actions:
 *   - accept_overlap: Mark as intentional, suppress future warnings
 *   - delete_segment1: Delete the first segment
 *   - delete_segment2: Delete the second segment
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate using Auth.js session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { conflictId, action, segment1Id, segment2Id } = body

    if (!conflictId || !action) {
      return NextResponse.json(
        { error: 'Missing conflictId or action' },
        { status: 400 }
      )
    }

    const validActions = ['accept_overlap', 'delete_segment1', 'delete_segment2']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    let result
    const userId = session.user.id

    switch (action) {
      case 'accept_overlap':
        result = await acceptSegmentConflict(conflictId, userId)
        break

      case 'delete_segment1':
        if (!segment1Id) {
          return NextResponse.json(
            { error: 'segment1Id required for delete_segment1 action' },
            { status: 400 }
          )
        }
        await deleteSegment(segment1Id)
        result = await resolveSegmentConflict(conflictId, action, userId)
        break

      case 'delete_segment2':
        if (!segment2Id) {
          return NextResponse.json(
            { error: 'segment2Id required for delete_segment2 action' },
            { status: 400 }
          )
        }
        await deleteSegment(segment2Id)
        result = await resolveSegmentConflict(conflictId, action, userId)
        break

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      conflict: result,
      message: `Conflict resolved with action: ${action}`
    })
  } catch (error) {
    console.error('Error resolving conflict:', error)
    return NextResponse.json(
      { error: 'Failed to resolve conflict' },
      { status: 500 }
    )
  }
}
