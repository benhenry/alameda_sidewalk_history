import { NextRequest, NextResponse } from 'next/server'
import { segmentQueries, contractorQueries, parseCoordinates, stringifyCoordinates, parseSpecialMarks, stringifySpecialMarks } from '@/lib/database'
import { SidewalkSegment } from '@/types/sidewalk'
import { validateSidewalkCoordinates, getSidewalkSuggestions } from '@/lib/sidewalk-validation'
import { v4 as uuidv4 } from 'uuid'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contractor = searchParams.get('contractor')
    const year = searchParams.get('year')
    const street = searchParams.get('street')

    let segments: any[]

    if (contractor || year || street) {
      segments = segmentQueries.getByFilters.all(
        contractor, contractor,
        year ? parseInt(year) : null, year ? parseInt(year) : null,
        street, street
      )
    } else {
      segments = segmentQueries.getAll.all()
    }

    const formattedSegments: SidewalkSegment[] = segments.map(segment => ({
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
    }))

    return NextResponse.json(formattedSegments)
  } catch (error) {
    console.error('Error fetching segments:', error)
    return NextResponse.json({ error: 'Failed to fetch segments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { coordinates, contractor, year, street, block, notes, specialMarks } = body

    if (!coordinates || !contractor || !year || !street || !block) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate coordinates against sidewalk data
    const validation = await validateSidewalkCoordinates(coordinates)
    if (!validation.isValid) {
      // Get suggestions for invalid coordinates
      const suggestions = await Promise.all(
        validation.invalidCoordinates.map(coord => getSidewalkSuggestions(coord, 25))
      )
      
      return NextResponse.json({ 
        error: 'Some coordinates are not near known sidewalk locations',
        invalidCoordinates: validation.invalidCoordinates,
        suggestions: suggestions.flat()
      }, { status: 422 })
    }

    // Get user ID from middleware-set header
    const userId = request.headers.get('x-user-id')

    const id = uuidv4()

    segmentQueries.insert.run(
      id,
      stringifyCoordinates(coordinates),
      contractor,
      year,
      street,
      block,
      notes || null,
      specialMarks ? stringifySpecialMarks(specialMarks) : null,
      userId
    )

    // Update or create contractor
    contractorQueries.upsert.run(
      uuidv4(),
      contractor,
      JSON.stringify([year])
    )
    contractorQueries.updateSegmentCount.run(contractor)

    const newSegment = segmentQueries.getById.get(id)
    const formattedSegment: SidewalkSegment = {
      id: newSegment.id,
      coordinates: parseCoordinates(newSegment.coordinates),
      contractor: newSegment.contractor,
      year: newSegment.year,
      street: newSegment.street,
      block: newSegment.block,
      notes: newSegment.notes,
      specialMarks: parseSpecialMarks(newSegment.special_marks),
      photos: [],
      createdAt: new Date(newSegment.created_at),
      updatedAt: new Date(newSegment.updated_at)
    }

    return NextResponse.json(formattedSegment, { status: 201 })
  } catch (error) {
    console.error('Error creating segment:', error)
    return NextResponse.json({ error: 'Failed to create segment' }, { status: 500 })
  }
}