import { NextResponse } from 'next/server'
import { getAllReferenceSidewalks } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch from our PostGIS reference_sidewalks table (much faster and more complete!)
    const referenceSidewalks = await getAllReferenceSidewalks()

    // Return LineStrings instead of flattening to individual points
    const lineStrings: [number, number][][] = []

    for (const sidewalk of referenceSidewalks) {
      if (sidewalk.geometry && sidewalk.geometry.coordinates && sidewalk.geometry.coordinates.length > 1) {
        // GeoJSON LineString coordinates are [lng, lat], we need [lat, lng]
        const line = sidewalk.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
        lineStrings.push(line)
      }
    }

    // Calculate total coordinate count for backwards compatibility
    const totalCoordinates = lineStrings.reduce((sum, line) => sum + line.length, 0)

    return NextResponse.json({
      lineStrings,
      coordinates: totalCoordinates,  // For backwards compatibility
      count: totalCoordinates,
      source: 'reference_sidewalks',
      totalSidewalks: referenceSidewalks.length
    })
  } catch (error) {
    console.error('Error fetching sidewalk data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sidewalk data', lineStrings: [], coordinates: 0 },
      { status: 500 }
    )
  }
}