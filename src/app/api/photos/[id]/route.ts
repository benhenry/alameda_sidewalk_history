import { NextRequest, NextResponse } from 'next/server'
import { deletePhoto } from '@/lib/database'
import { deleteFile } from '@/lib/storage'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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