import { NextRequest, NextResponse } from 'next/server'
import { segmentQueries, parseCoordinates, stringifyCoordinates, parseSpecialMarks, stringifySpecialMarks } from '@/lib/database'
import { SidewalkSegment } from '@/types/sidewalk'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segment = segmentQueries.getById.get(params.id)
    
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    const formattedSegment: SidewalkSegment = {
      id: segment.id,
      coordinates: parseCoordinates(segment.coordinates),
      contractor: segment.contractor,
      year: segment.year,
      street: segment.street,
      block: segment.block,
      notes: segment.notes,
      specialMarks: parseSpecialMarks(segment.special_marks),
      photos: segment.photo_ids ? segment.photo_ids.split(',').map((id: string, index: number) => ({
        id,
        sidewalkSegmentId: segment.id,
        filename: segment.photo_filenames.split(',')[index],
        type: segment.photo_types.split(',')[index],
        uploadedAt: new Date()
      })) : [],
      createdAt: new Date(segment.created_at),
      updatedAt: new Date(segment.updated_at)
    }

    return NextResponse.json(formattedSegment)
  } catch (error) {
    console.error('Error fetching segment:', error)
    return NextResponse.json({ error: 'Failed to fetch segment' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { coordinates, contractor, year, street, block, notes, specialMarks } = body

    if (!coordinates || !contractor || !year || !street || !block) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const changes = segmentQueries.update.run(
      stringifyCoordinates(coordinates),
      contractor,
      year,
      street,
      block,
      notes || null,
      specialMarks ? stringifySpecialMarks(specialMarks) : null,
      params.id
    )

    if (changes.changes === 0) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    const updatedSegment = segmentQueries.getById.get(params.id)
    const formattedSegment: SidewalkSegment = {
      id: updatedSegment.id,
      coordinates: parseCoordinates(updatedSegment.coordinates),
      contractor: updatedSegment.contractor,
      year: updatedSegment.year,
      street: updatedSegment.street,
      block: updatedSegment.block,
      notes: updatedSegment.notes,
      specialMarks: parseSpecialMarks(updatedSegment.special_marks),
      photos: updatedSegment.photo_ids ? updatedSegment.photo_ids.split(',').map((id: string, index: number) => ({
        id,
        sidewalkSegmentId: updatedSegment.id,
        filename: updatedSegment.photo_filenames.split(',')[index],
        type: updatedSegment.photo_types.split(',')[index],
        uploadedAt: new Date()
      })) : [],
      createdAt: new Date(updatedSegment.created_at),
      updatedAt: new Date(updatedSegment.updated_at)
    }

    return NextResponse.json(formattedSegment)
  } catch (error) {
    console.error('Error updating segment:', error)
    return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const changes = segmentQueries.delete.run(params.id)
    
    if (changes.changes === 0) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Segment deleted successfully' })
  } catch (error) {
    console.error('Error deleting segment:', error)
    return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 })
  }
}