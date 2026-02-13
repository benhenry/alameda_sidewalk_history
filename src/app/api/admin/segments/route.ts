import { NextRequest, NextResponse } from 'next/server'
import { getAdminSegments, updateSegmentStatus } from '@/lib/database'
import { getAuthUser, AuthError } from '@/lib/get-auth-user'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user (works with both Auth.js and dev auth)
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    if (user.role !== 'admin') {
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
    // Authenticate user (works with both Auth.js and dev auth)
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const userId = user.id

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