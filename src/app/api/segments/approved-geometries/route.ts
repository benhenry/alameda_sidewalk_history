import { NextRequest, NextResponse } from 'next/server'
import { getApprovedSegmentGeometries } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * GET /api/segments/approved-geometries
 *
 * Returns approved segment geometries for map display.
 * Optionally filters by viewport bounds.
 *
 * Query Parameters:
 *   - north, south, east, west: Bounding box coordinates (optional)
 *
 * Response:
 *   {
 *     segments: [
 *       {
 *         id: string,
 *         street: string,
 *         block: string,
 *         contractor: string,
 *         year: number,
 *         geometry: GeoJSON LineString
 *       }
 *     ]
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse optional bounding box parameters
    const north = searchParams.get('north')
    const south = searchParams.get('south')
    const east = searchParams.get('east')
    const west = searchParams.get('west')

    let bounds: { north: number; south: number; east: number; west: number } | undefined

    if (north && south && east && west) {
      bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west)
      }

      // Validate bounds
      if (isNaN(bounds.north) || isNaN(bounds.south) || isNaN(bounds.east) || isNaN(bounds.west)) {
        return NextResponse.json(
          { error: 'Invalid bounding box coordinates' },
          { status: 400 }
        )
      }
    }

    const segments = await getApprovedSegmentGeometries(bounds)

    // Transform to GeoJSON-like format for the frontend
    const formattedSegments = segments.map(seg => ({
      id: seg.id,
      street: seg.street,
      block: seg.block,
      contractor: seg.contractor,
      year: seg.year,
      geometry: seg.geometry // Already GeoJSON from ST_AsGeoJSON
    }))

    return NextResponse.json({
      segments: formattedSegments,
      count: formattedSegments.length
    })
  } catch (error) {
    console.error('Error fetching approved geometries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approved segment geometries' },
      { status: 500 }
    )
  }
}
