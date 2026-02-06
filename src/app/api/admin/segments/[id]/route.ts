import { NextRequest, NextResponse } from 'next/server'
import { getSegmentById, adminUpdateSegment, deleteSegment } from '@/lib/database'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    // Authenticate using Auth.js session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check if segment exists
    const existingSegment = await getSegmentById(params.id)
    if (!existingSegment) {
      return NextResponse.json({ error: 'Segment not found' }, { status: 404 })
    }

    const body = await request.json()
    const { coordinates, contractor, year, street, block, notes, specialMarks, status } = body

    // Validate required fields if updating
    if (coordinates !== undefined && (!Array.isArray(coordinates) || coordinates.length < 2)) {
      return NextResponse.json({ error: 'At least 2 coordinates are required' }, { status: 400 })
    }

    if (year !== undefined && (typeof year !== 'number' || year < 1850 || year > new Date().getFullYear())) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }

    // Build updates object with only provided fields
    const updates: any = {}
    if (coordinates !== undefined) updates.coordinates = coordinates
    if (contractor !== undefined) updates.contractor = contractor
    if (year !== undefined) updates.year = year
    if (street !== undefined) updates.street = street
    if (block !== undefined) updates.block = block
    if (notes !== undefined) updates.notes = notes
    if (specialMarks !== undefined) updates.specialMarks = specialMarks
    if (status !== undefined) updates.status = status

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 })
    }

    const updatedSegment = await adminUpdateSegment(
      params.id,
      updates,
      session.user.id
    )

    if (!updatedSegment) {
      return NextResponse.json({ error: 'Failed to update segment' }, { status: 500 })
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
    // Authenticate using Auth.js session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

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
