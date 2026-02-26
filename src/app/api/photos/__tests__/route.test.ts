import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('@/lib/database', () => ({
  createPhoto: jest.fn(),
  getPhotosBySegmentId: jest.fn(),
}))

jest.mock('@/lib/storage', () => ({
  uploadFile: jest.fn(),
}))

import { createPhoto, getPhotosBySegmentId } from '@/lib/database'
import { uploadFile } from '@/lib/storage'

function createMockPhotoRequest(overrides: {
  file?: { type: string; size: number; name: string } | null;
  sidewalkSegmentId?: string | null;
  type?: string | null;
  caption?: string | null;
  coordinates?: string | null;
} = {}) {
  const file = overrides.file !== undefined ? overrides.file : { type: 'image/jpeg', size: 1024, name: 'test.jpg' }
  const formDataEntries: Record<string, any> = {}
  if (file) formDataEntries.file = file
  if (overrides.sidewalkSegmentId !== undefined) formDataEntries.sidewalkSegmentId = overrides.sidewalkSegmentId
  else formDataEntries.sidewalkSegmentId = 'seg-1'
  if (overrides.type !== undefined) formDataEntries.type = overrides.type
  else formDataEntries.type = 'stamp'
  if (overrides.caption) formDataEntries.caption = overrides.caption
  if (overrides.coordinates) formDataEntries.coordinates = overrides.coordinates

  const request = new NextRequest('http://localhost/api/photos', { method: 'POST' })
  // Mock formData since jsdom doesn't fully support it
  ;(request as any).formData = jest.fn().mockResolvedValue({
    get: (key: string) => formDataEntries[key] ?? null,
  })
  return request
}

describe('/api/photos', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = createMockPhotoRequest()
      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 400 when missing required fields', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1' } })
      const request = createMockPhotoRequest({ file: null, sidewalkSegmentId: null, type: null })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid file type', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1' } })
      const request = createMockPhotoRequest({ file: { type: 'application/pdf', size: 1024, name: 'test.pdf' } })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid file type')
    })

    it('should return 400 for file too large', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1' } })
      const request = createMockPhotoRequest({
        file: { type: 'image/jpeg', size: 11 * 1024 * 1024, name: 'large.jpg' }
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('File too large')
    })

    it('should upload photo successfully', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
      ;(uploadFile as jest.Mock).mockResolvedValue({ filename: 'uploaded.jpg', url: 'https://example.com/uploaded.jpg' })
      ;(createPhoto as jest.Mock).mockResolvedValue({ id: 'photo-1' })

      const request = createMockPhotoRequest({ caption: 'A stamp photo' })
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.id).toBe('photo-1')
      expect(data.url).toBe('https://example.com/uploaded.jpg')
      expect(uploadFile).toHaveBeenCalled()
      expect(createPhoto).toHaveBeenCalled()
    })

    it('should return 500 on upload error', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
      ;(uploadFile as jest.Mock).mockRejectedValue(new Error('Upload failed'))

      const request = createMockPhotoRequest()
      const response = await POST(request)
      expect(response.status).toBe(500)
    })

    it('should accept webp images', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
      ;(uploadFile as jest.Mock).mockResolvedValue({ filename: 'test.webp', url: 'https://example.com/test.webp' })
      ;(createPhoto as jest.Mock).mockResolvedValue({ id: 'photo-1' })

      const request = createMockPhotoRequest({
        file: { type: 'image/webp', size: 1024, name: 'test.webp' }
      })
      const response = await POST(request)
      expect(response.status).toBe(201)
    })
  })

  describe('GET', () => {
    it('should return 400 when sidewalkSegmentId missing', async () => {
      const request = new NextRequest('http://localhost/api/photos')
      const response = await GET(request)
      expect(response.status).toBe(400)
    })

    it('should return photos for segment', async () => {
      const mockPhotos = [{ id: 'p1', filename: 'test.jpg' }]
      ;(getPhotosBySegmentId as jest.Mock).mockResolvedValue(mockPhotos)

      const request = new NextRequest('http://localhost/api/photos?sidewalkSegmentId=seg-1')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveLength(1)
    })

    it('should return 500 on database error', async () => {
      ;(getPhotosBySegmentId as jest.Mock).mockRejectedValue(new Error('DB error'))
      const request = new NextRequest('http://localhost/api/photos?sidewalkSegmentId=seg-1')
      const response = await GET(request)
      expect(response.status).toBe(500)
    })
  })
})
