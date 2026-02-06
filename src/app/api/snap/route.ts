import { NextRequest, NextResponse } from 'next/server'
import { snapToNearestSidewalk, snapToNearestApprovedSegment } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * POST /api/snap
 *
 * Snaps coordinates to the nearest sidewalk using PostGIS ST_ClosestPoint.
 * Priority order:
 *   1. Approved segments (10m radius) - for extending existing segments
 *   2. Reference sidewalks (50m radius) - for new segments
 *
 * Request Body:
 *   {
 *     coordinates: [[lat, lng], ...],
 *     snapRadius?: number  // Optional, defaults to 50 meters for reference sidewalks
 *   }
 *
 * Response:
 *   {
 *     snappedCoordinates: [[lat, lng], ...],
 *     metadata: [
 *       {
 *         original: [lat, lng],
 *         snapped: [lat, lng] | null,
 *         source: 'approved_segment' | 'reference_sidewalk',
 *         segmentId?: string,
 *         referenceId?: string,
 *         street: string | null,
 *         distance: number
 *       }
 *     ]
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coordinates, approvedSnapRadius = 10, referenceSnapRadius = 50 } = body

    if (!coordinates || !Array.isArray(coordinates)) {
      return NextResponse.json(
        { error: 'Invalid coordinates array' },
        { status: 400 }
      )
    }

    const snappedCoordinates: [number, number][] = []
    const metadata: any[] = []

    for (const coord of coordinates) {
      if (!Array.isArray(coord) || coord.length !== 2) {
        return NextResponse.json(
          { error: 'Invalid coordinate format. Expected [lat, lng]' },
          { status: 400 }
        )
      }

      // First, try to snap to approved segments (higher priority, tighter radius)
      const approvedResult = await snapToNearestApprovedSegment(
        coord as [number, number],
        approvedSnapRadius
      )

      if (approvedResult) {
        // Successfully snapped to an approved segment
        snappedCoordinates.push(approvedResult.snapped)
        metadata.push({
          original: coord,
          snapped: approvedResult.snapped,
          source: 'approved_segment',
          segmentId: approvedResult.segmentId,
          street: approvedResult.street,
          distance: Math.round(approvedResult.distance * 100) / 100
        })
        continue
      }

      // Fall back to reference sidewalks
      const referenceResult = await snapToNearestSidewalk(coord as [number, number])

      if (referenceResult) {
        // Successfully snapped to a reference sidewalk
        snappedCoordinates.push(referenceResult.snapped)
        metadata.push({
          original: coord,
          snapped: referenceResult.snapped,
          source: 'reference_sidewalk',
          referenceId: referenceResult.referenceId,
          street: referenceResult.street,
          distance: Math.round(referenceResult.distance * 100) / 100
        })
      } else {
        // No nearby sidewalk found within snap radius
        snappedCoordinates.push(coord as [number, number])
        metadata.push({
          original: coord,
          snapped: null,
          error: 'No nearby sidewalk within snap radius'
        })
      }
    }

    return NextResponse.json({
      snappedCoordinates,
      metadata
    })
  } catch (error) {
    console.error('Error snapping coordinates:', error)
    return NextResponse.json(
      { error: 'Failed to snap coordinates' },
      { status: 500 }
    )
  }
}
