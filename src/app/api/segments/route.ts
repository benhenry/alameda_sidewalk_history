import { NextRequest, NextResponse } from 'next/server'
import { getAllSegments, createSegment, updateContractorStats } from '@/lib/database'
import { getAuthUser } from '@/lib/get-auth-user'
import { logPerf } from '@/lib/perf-logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const apiStart = performance.now()
  try {
    const { searchParams } = new URL(request.url)
    const contractor = searchParams.get('contractor')
    const year = searchParams.get('year')
    const street = searchParams.get('street')

    // For now, get all segments and filter in memory
    // TODO: Add filtering support to database abstraction
    let segments = await getAllSegments()

    // Apply filters
    if (contractor) {
      segments = segments.filter(s => s.contractor === contractor)
    }
    if (year) {
      segments = segments.filter(s => s.year === parseInt(year))
    }
    if (street) {
      segments = segments.filter(s => s.street === street)
    }

    logPerf('api.GET./api/segments', performance.now() - apiStart, { count: segments.length })

    // Segments are already formatted from the database abstraction
    return NextResponse.json(segments)
  } catch (error) {
    console.error('Error fetching segments:', error)
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user (works with both Auth.js and dev auth)
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { coordinates, contractor, year, street, block, notes, specialMarks } = body

    if (!coordinates || !contractor || !year || !street || !block) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Coordinates are pre-validated via /api/snap endpoint before submission
    // The InteractiveSegmentDrawer ensures all coordinates are snapped to reference sidewalks
    // No additional validation needed here

    // Create the segment using the database abstraction
    const newSegment = await createSegment({
      coordinates,
      contractor,
      year,
      street,
      block,
      notes: notes || undefined,
      specialMarks,
      createdBy: user.id,
      status: 'pending'
    })

    // Update contractor stats
    await updateContractorStats()

    return NextResponse.json(newSegment, { status: 201 })
  } catch (error) {
    console.error('Error creating segment:', error)
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
  }
}