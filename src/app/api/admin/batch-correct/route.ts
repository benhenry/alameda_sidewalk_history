import { NextRequest, NextResponse } from 'next/server'
import {
  getSegmentsForCorrection,
  adminUpdateSegment,
  createSegmentCorrection
} from '@/lib/database'
import { batchAnalyzeSegments } from '@/lib/batch-correction'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/batch-correct
 *
 * Executes batch correction on segments.
 * Corrects misaligned segment coordinates by snapping to reference sidewalks.
 *
 * Request Body:
 *   {
 *     threshold?: number,    // Distance threshold in meters (default: 5)
 *     street?: string,       // Filter by street name (optional)
 *     yearMin?: number,      // Filter by minimum year (optional)
 *     yearMax?: number,      // Filter by maximum year (optional)
 *     limit?: number,        // Maximum segments to correct (default: 50)
 *     dryRun?: boolean       // If true, don't save changes (default: false)
 *   }
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
    const {
      threshold = 5,
      street,
      yearMin,
      yearMax,
      limit = 50,
      dryRun = false
    } = body

    // Validate threshold
    if (threshold < 0 || threshold > 100) {
      return NextResponse.json(
        { error: 'Invalid threshold. Must be between 0 and 100 meters.' },
        { status: 400 }
      )
    }

    // Get segments to correct
    const segments = await getSegmentsForCorrection({
      street,
      yearMin,
      yearMax
    })

    // Limit the number of segments to correct
    const limitedSegments = segments.slice(0, limit)

    // Analyze segments
    const corrections = await batchAnalyzeSegments(limitedSegments, threshold)

    const results = {
      corrected: 0,
      failed: 0,
      skipped: 0,
      details: [] as any[]
    }

    // Apply corrections
    for (const correction of corrections) {
      try {
        if (!dryRun) {
          // Update segment coordinates
          const updated = await adminUpdateSegment(
            correction.segmentId,
            { coordinates: correction.correctedCoordinates },
            session.user.id
          )

          if (updated) {
            // Record the correction for audit trail
            await createSegmentCorrection({
              segmentId: correction.segmentId,
              originalCoordinates: correction.originalCoordinates,
              correctedCoordinates: correction.correctedCoordinates,
              maxDistanceMeters: correction.maxDistance,
              correctedBy: session.user.id,
              correctionType: 'batch'
            })

            results.corrected++
            results.details.push({
              segmentId: correction.segmentId,
              street: correction.street,
              block: correction.block,
              status: 'corrected',
              pointsCorrected: correction.corrections.length,
              maxDistance: Math.round(correction.maxDistance * 100) / 100
            })
          } else {
            results.failed++
            results.details.push({
              segmentId: correction.segmentId,
              street: correction.street,
              block: correction.block,
              status: 'failed',
              error: 'Update returned null'
            })
          }
        } else {
          // Dry run - just report what would be done
          results.corrected++
          results.details.push({
            segmentId: correction.segmentId,
            street: correction.street,
            block: correction.block,
            status: 'would_correct',
            pointsCorrected: correction.corrections.length,
            maxDistance: Math.round(correction.maxDistance * 100) / 100
          })
        }
      } catch (error) {
        console.error(`Error correcting segment ${correction.segmentId}:`, error)
        results.failed++
        results.details.push({
          segmentId: correction.segmentId,
          street: correction.street,
          block: correction.block,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      dryRun,
      summary: {
        totalAnalyzed: limitedSegments.length,
        needingCorrection: corrections.length,
        corrected: results.corrected,
        failed: results.failed,
        threshold,
        filters: { street, yearMin, yearMax }
      },
      results: results.details
    })
  } catch (error) {
    console.error('Error executing batch correction:', error)
    return NextResponse.json(
      { error: 'Failed to execute batch correction' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/batch-correct
 *
 * Returns correction history.
 *
 * Query Parameters:
 *   - segmentId: Filter by segment ID (optional)
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
    const segmentId = searchParams.get('segmentId') || undefined

    // Import dynamically to avoid issues in SQLite environment
    const { getSegmentCorrections } = await import('@/lib/database')
    const corrections = await getSegmentCorrections(segmentId)

    return NextResponse.json({
      corrections,
      count: corrections.length
    })
  } catch (error) {
    console.error('Error fetching correction history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch correction history' },
      { status: 500 }
    )
  }
}
