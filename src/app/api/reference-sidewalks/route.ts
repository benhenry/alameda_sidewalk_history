import { NextRequest, NextResponse } from 'next/server'
import { getAllReferenceSidewalks } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reference-sidewalks
 *
 * Fetches reference sidewalk data from OpenStreetMap import.
 * Supports optional bounding box filtering.
 *
 * Query Parameters:
 *   - north, south, east, west: Bounding box coordinates (optional)
 *
 * Returns:
 *   GeoJSON FeatureCollection with sidewalk LineString geometries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const north = searchParams.get('north')
    const south = searchParams.get('south')
    const east = searchParams.get('east')
    const west = searchParams.get('west')

    let bounds = undefined
    if (north && south && east && west) {
      bounds = {
        north: parseFloat(north),
        south: parseFloat(south),
        east: parseFloat(east),
        west: parseFloat(west)
      }
    }

    const sidewalks = await getAllReferenceSidewalks(bounds)

    // Convert to GeoJSON FeatureCollection
    const features = sidewalks.map(sidewalk => ({
      type: 'Feature',
      id: sidewalk.id,
      geometry: sidewalk.geometry,
      properties: {
        osmId: sidewalk.osm_id,
        street: sidewalk.street,
        tags: sidewalk.tags
      }
    }))

    return NextResponse.json({
      type: 'FeatureCollection',
      features
    })
  } catch (error) {
    console.error('Error fetching reference sidewalks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reference sidewalks' },
      { status: 500 }
    )
  }
}
