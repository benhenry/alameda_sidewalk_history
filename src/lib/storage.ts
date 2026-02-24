// Storage service that switches between local, Google Cloud Storage, and Supabase
import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'

// Determine which storage backend to use
const useSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_KEY
const useGCS = !useSupabase && process.env.NODE_ENV === 'production' && !!process.env.GCS_BUCKET_NAME

// Lazy-load storage clients to avoid import errors when not configured
let supabaseClient: any = null
let gcsStorage: any = null
let gcsBucket: any = null

async function getSupabaseClient() {
  if (!supabaseClient && useSupabase) {
    const { createClient } = await import('@supabase/supabase-js')
    supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    )
  }
  return supabaseClient
}

async function getGCSBucket() {
  if (!gcsBucket && useGCS) {
    const { Storage } = await import('@google-cloud/storage')
    gcsStorage = new Storage({ projectId: process.env.GCS_PROJECT_ID })
    gcsBucket = gcsStorage.bucket(process.env.GCS_BUCKET_NAME!)
  }
  return gcsBucket
}

export interface UploadResult {
  filename: string
  url: string
  size: number
}

export async function uploadFile(
  file: File | Buffer,
  originalName: string,
  segmentId: string
): Promise<UploadResult> {
  const timestamp = Date.now()
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_')
  const filename = `segments/${segmentId}/${timestamp}-${safeName}`
  const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file

  if (useSupabase) {
    // Upload to Supabase Storage
    const supabase = await getSupabaseClient()
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(filename, fileBuffer, {
        contentType: file instanceof File ? file.type : 'application/octet-stream',
        upsert: false
      })

    if (error) {
      throw new Error(`Supabase upload error: ${error.message}`)
    }

    const { data: urlData } = supabase.storage
      .from('photos')
      .getPublicUrl(filename)

    return {
      filename,
      url: urlData.publicUrl,
      size: fileBuffer.byteLength,
    }
  } else if (useGCS) {
    // Upload to Google Cloud Storage
    const bucket = await getGCSBucket()
    const blob = bucket.file(filename)

    await blob.save(fileBuffer, {
      metadata: {
        contentType: file instanceof File ? file.type : 'application/octet-stream',
      },
    })

    await blob.makePublic()

    return {
      filename,
      url: `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`,
      size: fileBuffer.byteLength,
    }
  } else {
    // Local file storage for development
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'segments', segmentId)
    fs.mkdirSync(uploadsDir, { recursive: true })

    const filePath = path.join(uploadsDir, `${timestamp}-${safeName}`)
    fs.writeFileSync(filePath, fileBuffer)

    return {
      filename: path.basename(filePath),
      url: `/uploads/segments/${segmentId}/${path.basename(filePath)}`,
      size: fileBuffer.byteLength,
    }
  }
}

export async function deleteFile(filename: string): Promise<boolean> {
  try {
    if (useSupabase) {
      // Delete from Supabase Storage
      const supabase = await getSupabaseClient()
      const { error } = await supabase.storage
        .from('photos')
        .remove([filename])

      if (error) {
        console.error('Supabase delete error:', error)
        return false
      }
      return true
    } else if (useGCS) {
      // Delete from Google Cloud Storage
      const bucket = await getGCSBucket()
      await bucket.file(filename).delete()
      return true
    } else {
      // Delete local file
      const filePath = path.join(process.cwd(), 'public', filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        return true
      }
      return false
    }
  } catch (error) {
    console.error('Error deleting file:', error)
    return false
  }
}

export async function getFileUrl(filename: string): Promise<string> {
  if (useSupabase) {
    const supabase = await getSupabaseClient()
    const { data } = supabase.storage
      .from('photos')
      .getPublicUrl(filename)
    return data.publicUrl
  } else if (useGCS) {
    return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${filename}`
  } else {
    return `/${filename}`
  }
}

// Helper function to handle multipart form data from Next.js API routes
export async function parseMultipartForm(request: NextRequest): Promise<{
  fields: Record<string, string>
  files: Array<{ name: string; file: File }>
}> {
  const formData = await request.formData()
  const fields: Record<string, string> = {}
  const files: Array<{ name: string; file: File }> = []

  const entries = Array.from(formData.entries())
  for (const [key, value] of entries) {
    if (value instanceof File) {
      files.push({ name: key, file: value })
    } else {
      fields[key] = value.toString()
    }
  }

  return { fields, files }
}

// Export which storage backend is in use
export { useSupabase, useGCS }
