import { NextRequest, NextResponse } from 'next/server'
import { deletePhoto, getPhotosBySegmentId, getSegmentById } from '@/lib/database'
import { deleteFile } from '@/lib/storage'
import { auth } from '@/auth'

export const dynamic = 'force-dynamic'

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

    // Only admins can delete photos (or we could check segment ownership)
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to delete photos' }, { status: 403 })
    }

    // Delete from database (this will also handle file deletion via storage service)
    const success = await deletePhoto(params.id)

    if (!success) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Photo deleted successfully' })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
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

    // Only admins can update photos
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required to update photos' }, { status: 403 })
    }

    const body = await request.json()
    const { caption, type } = body

    if (!type) {
      return NextResponse.json({ error: 'Type is required' }, { status: 400 })
    }

    // For now, return not implemented since photo update isn't in our database abstraction
    return NextResponse.json({ error: 'Photo update not implemented' }, { status: 501 })
  } catch (error) {
    console.error('Error updating photo:', error)
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 })
  }
}