import { NextRequest, NextResponse } from 'next/server'
import { getSegmentEditHistory } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segmentId = params.id

    if (!segmentId) {
      return NextResponse.json({ error: 'Segment ID required' }, { status: 400 })
    }

    const history = await getSegmentEditHistory(segmentId)

    return NextResponse.json({
      history,
      count: history.length
    })
  } catch (error) {
    console.error('Error fetching segment history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch segment history' },
      { status: 500 }
    )
  }
}
