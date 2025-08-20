import { NextRequest, NextResponse } from 'next/server'
import { photoQueries } from '@/lib/database'
import { unlink } from 'fs/promises'
import path from 'path'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get photo details first
    const photo = photoQueries.getBySegmentId.get(params.id)
    
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Delete from database
    const changes = photoQueries.delete.run(params.id)
    
    if (changes.changes === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    // Delete file from disk
    try {
      const filepath = path.join(process.cwd(), 'public', 'uploads', photo.filename)
      await unlink(filepath)
    } catch (fileError) {
      console.error('Error deleting file:', fileError)
      // Continue even if file deletion fails - database record is already removed
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

    const changes = photoQueries.update.run(caption, type, params.id)
    
    if (changes.changes === 0) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Photo updated successfully' })
  } catch (error) {
    console.error('Error updating photo:', error)
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 })
  }
}