// Storage service that switches between local and Google Cloud Storage
import { Storage } from '@google-cloud/storage'
import { NextRequest } from 'next/server'
import path from 'path'
import fs from 'fs'

const useGCS = process.env.NODE_ENV === 'production' && process.env.GCS_BUCKET_NAME

// Google Cloud Storage setup
const storage = useGCS ? new Storage({
  projectId: process.env.GCS_PROJECT_ID,
}) : null

const bucketName = process.env.GCS_BUCKET_NAME || ''
const bucket = storage ? storage.bucket(bucketName) : null

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
  const fileExtension = path.extname(originalName)
  const filename = `segments/${segmentId}/${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  
  if (useGCS && bucket) {
    // Upload to Google Cloud Storage
    const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
    const blob = bucket.file(filename)
    
    await blob.save(fileBuffer, {
      metadata: {
        contentType: file instanceof File ? file.type : 'application/octet-stream',
      },
    })
    
    // Make file publicly readable (optional)
    await blob.makePublic()
    
    return {
      filename,
      url: `https://storage.googleapis.com/${bucketName}/${filename}`,
      size: fileBuffer.byteLength,
    }
  } else {
    // Local file storage for development
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'segments', segmentId)
    
    // Ensure directory exists
    fs.mkdirSync(uploadsDir, { recursive: true })
    
    const filePath = path.join(uploadsDir, `${timestamp}-${originalName}`)
    const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file
    
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
    if (useGCS && bucket) {
      // Delete from Google Cloud Storage
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
  if (useGCS && bucket) {
    return `https://storage.googleapis.com/${bucketName}/${filename}`
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

export { useGCS }