import { NextRequest, NextResponse } from 'next/server'
import { segmentQueries, parseCoordinates, parseSpecialMarks } from '@/lib/database'
import { SidewalkSegment } from '@/types/sidewalk'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin (this should be done by middleware)
    const userRole = request.headers.get('x-user-role')
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let segments: any[]

    if (status === 'pending') {
      segments = segmentQueries.getPending.all()
    } else {
      segments = segmentQueries.getAllWithStatus.all()
    }

    const formattedSegments: (SidewalkSegment & { 
      status: string,
      createdByUsername?: string,
      approvedByUsername?: string,
      approvedAt?: Date
    })[] = segments.map(segment => ({
      id: segment.id,
      coordinates: parseCoordinates(segment.coordinates),
      contractor: segment.contractor,
      year: segment.year,
      street: segment.street,
      block: segment.block,
      notes: segment.notes,
      specialMarks: parseSpecialMarks(segment.special_marks),
      status: segment.status,
      photos: segment.photo_ids ? segment.photo_ids.split(',').map((id: string, index: number) => ({
        id,
        sidewalkSegmentId: segment.id,
        filename: segment.photo_filenames.split(',')[index],
        type: segment.photo_types.split(',')[index],
        uploadedAt: new Date()
      })) : [],
      createdAt: new Date(segment.created_at),
      updatedAt: new Date(segment.updated_at),
      createdByUsername: segment.created_by_username,
      approvedByUsername: segment.approved_by_username,
      approvedAt: segment.approved_at ? new Date(segment.approved_at) : undefined
    }))

    return NextResponse.json(formattedSegments)
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

    const body = await request.json()
    const { segmentId, action } = body

    if (!segmentId || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    if (action === 'approve') {
      segmentQueries.approve.run(userId, segmentId)
    } else {
      segmentQueries.reject.run(userId, segmentId)
    }

    const updatedSegment = segmentQueries.getById.get(segmentId)
    const formattedSegment: SidewalkSegment & { status: string } = {
      id: updatedSegment.id,
      coordinates: parseCoordinates(updatedSegment.coordinates),
      contractor: updatedSegment.contractor,
      year: updatedSegment.year,
      street: updatedSegment.street,
      block: updatedSegment.block,
      notes: updatedSegment.notes,
      specialMarks: parseSpecialMarks(updatedSegment.special_marks),
      status: updatedSegment.status,
      photos: [],
      createdAt: new Date(updatedSegment.created_at),
      updatedAt: new Date(updatedSegment.updated_at)
    }

    return NextResponse.json(formattedSegment)
  } catch (error) {
    console.error('Error updating segment status:', error)
    return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 })
  }
}