import { NextRequest, NextResponse } from 'next/server'
import { getAdminSegments, updateSegmentStatus } from '@/lib/database'
import { SidewalkSegment } from '@/types/sidewalk'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin (this should be done by middleware)
    const userRole = request.headers.get('x-user-role')
    
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const segments = await getAdminSegments(status || undefined)

    return NextResponse.json(segments)
  } catch (error) {
    console.error('Error fetching admin segments:', error)
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Check if user is admin
    const userRole = request.headers.get('x-user-role')
    const userId = request.headers.get('x-user-id')
    
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const body = await request.json()
    const { segmentId, action } = body

    if (!segmentId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const updatedSegment = await updateSegmentStatus(
      segmentId, 
      action === 'approve' ? 'approved' : 'rejected',
      userId
    )

    if (!updatedSegment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    return NextResponse.json(updatedSegment)
  } catch (error) {
    console.error('Error updating segment status:', error)
    return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 })
  }
}