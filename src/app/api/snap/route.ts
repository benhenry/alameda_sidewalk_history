import { NextRequest, NextResponse } from 'next/server'
import { snapToNearestSidewalk } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * POST /api/snap
 *
 * Snaps coordinates to the nearest reference sidewalk using PostGIS ST_ClosestPoint.
 * This provides precise snapping to actual sidewalk geometries.
 *
 * Request Body:
 *   {
 *     coordinates: [[lat, lng], ...],
 *     snapRadius?: number  // Optional, defaults to 50 meters
 *   }
 *
 * Response:
 *   {
 *     snappedCoordinates: [[lat, lng], ...],
 *     metadata: [
 *       {
 *         original: [lat, lng],
 *         snapped: [lat, lng] | null,
 *         referenceId: string,
 *         street: string | null,
 *         distance: number
 *       }
 *     ]
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coordinates } = body

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

      const result = await snapToNearestSidewalk(coord as [number, number])

      if (result) {
        // Successfully snapped to a nearby sidewalk
        snappedCoordinates.push(result.snapped)
        metadata.push({
          original: coord,
          snapped: result.snapped,
          referenceId: result.referenceId,
          street: result.street,
          distance: Math.round(result.distance * 100) / 100 // Round to 2 decimals
        })
      } else {
        // No nearby sidewalk found within snap radius
        snappedCoordinates.push(coord as [number, number])
        metadata.push({
          original: coord,
          snapped: null,
          error: 'No nearby sidewalk within 50m'
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
