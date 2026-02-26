import { NextRequest, NextResponse } from 'next/server'
import { getAllReferenceSidewalks } from '@/lib/database'
import { logPerf } from '@/lib/perf-logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const apiStart = performance.now()
  try {
    // Parse optional bounds params for viewport-based loading
    const { searchParams } = new URL(request.url)
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
        west: parseFloat(west),
      }
    }

    // Fetch from our PostGIS reference_sidewalks table (much faster and more complete!)
    const dbStart = performance.now()
    const referenceSidewalks = await getAllReferenceSidewalks(bounds)
    logPerf('api.sidewalks.dbQuery', performance.now() - dbStart, { count: referenceSidewalks.length, bounded: !!bounds })

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
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    })
  } catch (error) {
    console.error('Error fetching sidewalk data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sidewalk data', lineStrings: [], coordinates: 0 },
      { status: 500 }
    )
  }
}