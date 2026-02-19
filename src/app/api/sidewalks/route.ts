import { NextResponse } from 'next/server'
import { getAllReferenceSidewalks } from '@/lib/database'
import { logPerf } from '@/lib/perf-logger'

export const dynamic = 'force-dynamic'

export async function GET() {
  const apiStart = performance.now()
  try {
    // Fetch from our PostGIS reference_sidewalks table (much faster and more complete!)
    const dbStart = performance.now()
    const referenceSidewalks = await getAllReferenceSidewalks()
    logPerf('api.sidewalks.dbQuery', performance.now() - dbStart, { count: referenceSidewalks.length })

    // Return LineStrings instead of flattening to individual points
    const processStart = performance.now()
    const lineStrings: [number, number][][] = []

    for (const sidewalk of referenceSidewalks) {
      // Only process valid LineString geometries
      if (
        sidewalk.geometry &&
        sidewalk.geometry.type === 'LineString' &&
        Array.isArray(sidewalk.geometry.coordinates) &&
        sidewalk.geometry.coordinates.length > 1
      ) {
        // GeoJSON LineString coordinates are [lng, lat], we need [lat, lng]
        const line = sidewalk.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
        lineStrings.push(line)
      }
    }
    logPerf('api.sidewalks.processing', performance.now() - processStart, { lineStrings: lineStrings.length })

    // Calculate total coordinate count for backwards compatibility
    const totalCoordinates = lineStrings.reduce((sum, line) => sum + line.length, 0)

    logPerf('api.GET./api/sidewalks', performance.now() - apiStart, {
      totalSidewalks: referenceSidewalks.length,
      totalCoordinates
    })

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