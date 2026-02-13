'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'
import { Photo } from '@/types/sidewalk'
import { useToast } from './Toast'

interface PhotoUploadProps {
  sidewalkSegmentId: string
  existingPhotos: Photo[]
  onPhotosUpdated: () => void
}

export default function PhotoUpload({
  sidewalkSegmentId,
  existingPhotos,
  onPhotosUpdated
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<File | null>(null)
  const [newPhoto, setNewPhoto] = useState({
    caption: '',
    type: 'contractor_stamp' as const,
    coordinates: null as [number, number] | null
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { showSuccess, showError } = useToast()

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showError('Please select an image file')
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showError('File size must be less than 10MB')
      return
    }

    // Create preview
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setPreviewFile(file)
  }

  const clearPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    setPreviewFile(null)
  }

  const uploadPhoto = async () => {
    if (!previewFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', previewFile)
      formData.append('sidewalkSegmentId', sidewalkSegmentId)
      formData.append('caption', newPhoto.caption)
      formData.append('type', newPhoto.type)
      if (newPhoto.coordinates) {
        formData.append('coordinates', JSON.stringify(newPhoto.coordinates))
      }

      // Simulate progress (real progress would require XMLHttpRequest)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/photos', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload photo')
      }

      setNewPhoto({ caption: '', type: 'contractor_stamp', coordinates: null })
      clearPreview()
      onPhotosUpdated()
      showSuccess('Photo uploaded successfully!')
    } catch (error) {
      console.error('Error uploading photo:', error)
      showError(error instanceof Error ? error.message : 'Failed to upload photo')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return

    try {
      const response = await fetch(`/api/photos/${photoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete photo')
      }

      onPhotosUpdated()
      showSuccess('Photo deleted successfully!')
    } catch (error) {
      console.error('Error deleting photo:', error)
      showError('Failed to delete photo')
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = e.dataTransfer.files
    handleFileSelect(files)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Camera className="h-5 w-5" />
        Photos ({existingPhotos.length})
      </h3>

      {/* Upload Area */}
      <div className="mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caption
            </label>
            <input
              type="text"
              value={newPhoto.caption}
              onChange={(e) => setNewPhoto(prev => ({ ...prev, caption: e.target.value }))}
              placeholder="Describe this photo..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={newPhoto.type}
              onChange={(e) => setNewPhoto(prev => ({ ...prev, type: e.target.value as any }))}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="contractor_stamp">Contractor Stamp</option>
              <option value="special_mark">Special Mark</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>

        {/* Preview Area */}
        {previewUrl && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-700 mb-2">Ready to upload</p>
                <p className="text-sm text-gray-500 mb-3">
                  {previewFile?.name} ({((previewFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={uploadPhoto}
                    disabled={uploading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                  <button
                    onClick={clearPreview}
                    disabled={uploading}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
            {/* Progress bar */}
            {uploading && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1 text-center">{uploadProgress}%</p>
              </div>
            )}
          </div>
        )}

        {/* Drop Zone */}
        {!previewUrl && (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop photos here or click to upload
              </p>
              <p className="text-gray-500 text-sm">
                Supports JPEG, PNG, WebP up to 10MB
              </p>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Existing Photos */}
      {existingPhotos.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-700 mb-3">Existing Photos</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {existingPhotos.map((photo) => (
              <div key={photo.id} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/uploads/${photo.filename}`}
                    alt={photo.caption || 'Sidewalk photo'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                      const parent = target.parentElement
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center">
                            <div class="text-center">
                              <svg class="h-12 w-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                              </svg>
                              <p class="text-xs text-gray-500">Image not found</p>
                            </div>
                          </div>
                        `
                      }
                    }}
                  />
                </div>
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700 capitalize">
                    {photo.type.replace('_', ' ')}
                  </p>
                  {photo.caption && (
                    <p className="text-xs text-gray-500 truncate">
                      {photo.caption}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}