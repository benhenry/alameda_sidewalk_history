import { NextRequest, NextResponse } from 'next/server'
import { getSegmentById, updateSegment, deleteSegment } from '@/lib/database'
import { SidewalkSegment } from '@/types/sidewalk'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const segment = await getSegmentById(params.id)
    
    if (!segment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    return NextResponse.json(segment)
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

    const updatedSegment = await updateSegment(params.id, {
      coordinates,
      contractor,
      year,
      street,
      block,
      notes,
      specialMarks
    })

    if (!updatedSegment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    return NextResponse.json(updatedSegment)
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
    const success = await deleteSegment(params.id)
    
    if (!success) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Segment deleted successfully' })
  } catch (error) {
    console.error('Error deleting segment:', error)
    return NextResponse.json({ error: 'Failed to delete segment' }, { status: 500 })
  }
}