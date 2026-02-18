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

    if (overlaps.length === 0) {
      return NextResponse.json({
        detected: 0,
        message: 'No overlapping segments found (or geometry column not available)'
      })
    }

    // Create or update conflict records
    let created = 0
    for (const overlap of overlaps) {
      try {
        await createSegmentConflict({
          segment1Id: overlap.segment1_id,
          segment2Id: overlap.segment2_id,
          overlapLengthMeters: overlap.overlap_meters
        })
        created++
      } catch (err) {
        // If table doesn't exist, return helpful error
        if (err instanceof Error && err.message.includes('migration required')) {
          return NextResponse.json(
            { error: 'Database migration required. The segment_conflicts table needs to be created. Please run the database setup script.' },
            { status: 503 }
          )
        }
        throw err
      }
    }

    return NextResponse.json({
      detected: overlaps.length,
      created,
      message: `Detected ${overlaps.length} segment overlaps`
    })
  } catch (error) {
    console.error('Error detecting conflicts:', error)
    const message = error instanceof Error ? error.message : 'Failed to detect conflicts'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
