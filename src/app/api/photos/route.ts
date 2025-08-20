import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { photoQueries } from '@/lib/database'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const sidewalkSegmentId = formData.get('sidewalkSegmentId') as string
    const caption = formData.get('caption') as string
    const type = formData.get('type') as string
    const coordinates = formData.get('coordinates') as string

    if (!file || !sidewalkSegmentId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: file, sidewalkSegmentId, type' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    // Generate unique filename
    const fileExtension = file.name.split('.').pop()
    const filename = `${uuidv4()}.${fileExtension}`
    const filepath = path.join(uploadsDir, filename)

    // Write file to disk
    await writeFile(filepath, buffer)

    // Save to database
    const photoId = uuidv4()
    photoQueries.insert.run(
      photoId,
      sidewalkSegmentId,
      filename,
      caption || null,
      type,
      coordinates || null
    )

    return NextResponse.json({
      id: photoId,
      filename,
      caption,
      type,
      sidewalkSegmentId,
      coordinates: coordinates ? JSON.parse(coordinates) : null,
      url: `/uploads/${filename}`
    }, { status: 201 })

  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sidewalkSegmentId = searchParams.get('sidewalkSegmentId')

    if (!sidewalkSegmentId) {
      return NextResponse.json(
        { error: 'sidewalkSegmentId parameter is required' },
        { status: 400 }
      )
    }

    const photos = photoQueries.getBySegmentId.all(sidewalkSegmentId)
    
    const formattedPhotos = photos.map(photo => ({
      id: photo.id,
      filename: photo.filename,
      caption: photo.caption,
      type: photo.type,
      sidewalkSegmentId: photo.sidewalk_segment_id,
      coordinates: photo.coordinates ? JSON.parse(photo.coordinates) : null,
      uploadedAt: new Date(photo.uploaded_at),
      url: `/uploads/${photo.filename}`
    }))

    return NextResponse.json(formattedPhotos)
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    )
  }
}