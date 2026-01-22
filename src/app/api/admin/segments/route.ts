import { NextRequest, NextResponse } from 'next/server'
import { getAdminSegments, updateSegmentStatus } from '@/lib/database'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

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
    // Authenticate using Auth.js session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const userId = session.user.id

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