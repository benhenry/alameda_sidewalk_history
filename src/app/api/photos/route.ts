import { NextRequest, NextResponse } from 'next/server'
import { createPhoto, getPhotosBySegmentId } from '@/lib/database'
import { uploadFile as storageUploadFile } from '@/lib/storage'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

export const dynamic = 'force-dynamic'

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

    // Upload file using storage service (handles local vs cloud storage)
    const uploadResult = await storageUploadFile(file, file.name, sidewalkSegmentId)

    // Get user ID from middleware-set header
    const userId = request.headers.get('x-user-id')

    // Save to database
    const photo = await createPhoto({
      sidewalkSegmentId,
      filename: uploadResult.filename,
      originalName: file.name,
      mimetype: file.type,
      size: file.size,
      storageUrl: uploadResult.url,
      uploadedBy: userId || undefined
    })

    return NextResponse.json({
      id: photo.id,
      filename: uploadResult.filename,
      caption,
      type,
      sidewalkSegmentId,
      coordinates: coordinates ? JSON.parse(coordinates) : null,
      url: uploadResult.url
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

    const photos = await getPhotosBySegmentId(sidewalkSegmentId)
    return NextResponse.json(photos)
  } catch (error) {
    console.error('Error fetching photos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch photos' },
      { status: 500 }
    )
  }
}