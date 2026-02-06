import { NextRequest, NextResponse } from 'next/server'
import { getSegmentsForCorrection } from '@/lib/database'
import { batchAnalyzeSegments } from '@/lib/batch-correction'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/batch-correct/preview
 *
 * Previews batch correction without making changes.
 * Shows what segments would be corrected and how.
 *
 * Query Parameters:
 *   - threshold: Distance threshold in meters (default: 5)
 *   - street: Filter by street name (optional)
 *   - yearMin: Filter by minimum year (optional)
 *   - yearMax: Filter by maximum year (optional)
 *   - limit: Maximum segments to analyze (default: 100)
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
    const threshold = parseFloat(searchParams.get('threshold') || '5')
    const street = searchParams.get('street') || undefined
    const yearMin = searchParams.get('yearMin') ? parseInt(searchParams.get('yearMin')!) : undefined
    const yearMax = searchParams.get('yearMax') ? parseInt(searchParams.get('yearMax')!) : undefined
    const limit = parseInt(searchParams.get('limit') || '100')

    // Validate threshold
    if (isNaN(threshold) || threshold < 0 || threshold > 100) {
      return NextResponse.json(
        { error: 'Invalid threshold. Must be between 0 and 100 meters.' },
        { status: 400 }
      )
    }

    // Get segments to analyze
    const segments = await getSegmentsForCorrection({
      street,
      yearMin,
      yearMax
    })

    // Limit the number of segments to analyze
    const limitedSegments = segments.slice(0, limit)

    // Analyze segments
    const corrections = await batchAnalyzeSegments(limitedSegments, threshold)

    // Calculate summary statistics
    const totalSegments = limitedSegments.length
    const segmentsNeedingCorrection = corrections.length
    const totalPoints = corrections.reduce((sum, c) => sum + c.corrections.length, 0)
    const maxDistanceOverall = corrections.reduce((max, c) => Math.max(max, c.maxDistance), 0)
    const avgDistance = totalPoints > 0
      ? corrections.reduce((sum, c) =>
          sum + c.corrections.reduce((s, p) => s + p.distance, 0), 0) / totalPoints
      : 0

    return NextResponse.json({
      summary: {
        totalSegmentsAnalyzed: totalSegments,
        segmentsNeedingCorrection,
        totalPointsToCorrect: totalPoints,
        maxDistanceMeters: Math.round(maxDistanceOverall * 100) / 100,
        avgDistanceMeters: Math.round(avgDistance * 100) / 100,
        thresholdMeters: threshold,
        filters: { street, yearMin, yearMax }
      },
      corrections: corrections.map(c => ({
        segmentId: c.segmentId,
        street: c.street,
        block: c.block,
        pointsToCorrect: c.corrections.length,
        maxDistance: Math.round(c.maxDistance * 100) / 100,
        corrections: c.corrections.map(p => ({
          pointIndex: p.pointIndex,
          distanceMeters: Math.round(p.distance * 100) / 100,
          detectedStreet: p.street
        }))
      }))
    })
  } catch (error) {
    console.error('Error previewing batch correction:', error)
    return NextResponse.json(
      { error: 'Failed to preview batch correction' },
      { status: 500 }
    )
  }
}
