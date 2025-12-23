import { NextResponse } from 'next/server'
import { getAllReferenceSidewalks } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch from our PostGIS reference_sidewalks table (much faster and more complete!)
    const referenceSidewalks = await getAllReferenceSidewalks()

    // Extract all coordinates from the geometries
    const coordinates: [number, number][] = []

    for (const sidewalk of referenceSidewalks) {
      if (sidewalk.geometry && sidewalk.geometry.coordinates) {
        // GeoJSON LineString coordinates are [lng, lat], we need [lat, lng]
        sidewalk.geometry.coordinates.forEach(([lng, lat]: [number, number]) => {
          coordinates.push([lat, lng])
        })
      }
    }

    return NextResponse.json({
      coordinates,
      count: coordinates.length,
      source: 'reference_sidewalks',
      totalSidewalks: referenceSidewalks.length
    })
  } catch (error) {
    console.error('Error fetching sidewalk data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sidewalk data', coordinates: [] },
      { status: 500 }
    )
  }
}