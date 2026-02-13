import { NextRequest, NextResponse } from 'next/server'
import {
  detectSegmentOverlaps,
  getSegmentConflicts,
  createSegmentConflict
} from '@/lib/database'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/conflicts
 *
 * Lists all segment conflicts (overlaps).
 * Query params:
 *   - status: 'open' | 'resolved' | 'accepted' (optional)
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Return existing conflicts
    const conflicts = await getSegmentConflicts(status || undefined)

    return NextResponse.json({
      conflicts,
      count: conflicts.length
    })
  } catch (error) {
    console.error('Error fetching conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conflicts' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/conflicts
 *
 * Run fresh overlap detection and create conflict records.
 * Body params:
 *   - minOverlapMeters: number (optional, default 1)
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

    const body = await request.json().catch(() => ({}))
    const minOverlapMeters = body.minOverlapMeters || 1

    const overlaps = await detectSegmentOverlaps(minOverlapMeters)

    // Create or update conflict records
    for (const overlap of overlaps) {
      await createSegmentConflict({
        segment1Id: overlap.segment1_id,
        segment2Id: overlap.segment2_id,
        overlapLengthMeters: overlap.overlap_meters
      })
    }

    return NextResponse.json({
      detected: overlaps.length,
      message: `Detected ${overlaps.length} segment overlaps`
    })
  } catch (error) {
    console.error('Error detecting conflicts:', error)
    return NextResponse.json(
      { error: 'Failed to detect conflicts' },
      { status: 500 }
    )
  }
}
