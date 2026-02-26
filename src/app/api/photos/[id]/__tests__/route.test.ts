import { DELETE, PUT } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('@/lib/database', () => ({
  deletePhoto: jest.fn(),
  getPhotosBySegmentId: jest.fn(),
  getSegmentById: jest.fn(),
}))

jest.mock('@/lib/storage', () => ({
  deleteFile: jest.fn(),
}))

import { deletePhoto } from '@/lib/database'

describe('/api/photos/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/photos/p1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'p1' } })
      expect(response.status).toBe(401)
    })

    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const request = new NextRequest('http://localhost/api/photos/p1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'p1' } })
      expect(response.status).toBe(403)
    })

    it('should return 404 when photo not found', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(deletePhoto as jest.Mock).mockResolvedValue(false)

      const request = new NextRequest('http://localhost/api/photos/p1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'p1' } })
      expect(response.status).toBe(404)
    })

    it('should delete photo successfully', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(deletePhoto as jest.Mock).mockResolvedValue(true)

      const request = new NextRequest('http://localhost/api/photos/p1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'p1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('deleted')
    })

    it('should return 500 on error', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(deletePhoto as jest.Mock).mockRejectedValue(new Error('DB error'))

      const request = new NextRequest('http://localhost/api/photos/p1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'p1' } })
      expect(response.status).toBe(500)
    })
  })

  describe('PUT', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/photos/p1', {
        method: 'PUT',
        body: JSON.stringify({ type: 'stamp' }),
      })
      const response = await PUT(request, { params: { id: 'p1' } })
      expect(response.status).toBe(401)
    })

    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const request = new NextRequest('http://localhost/api/photos/p1', {
        method: 'PUT',
        body: JSON.stringify({ type: 'stamp' }),
      })
      const response = await PUT(request, { params: { id: 'p1' } })
      expect(response.status).toBe(403)
    })

    it('should return 400 when type is missing', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      const request = new NextRequest('http://localhost/api/photos/p1', {
        method: 'PUT',
        body: JSON.stringify({ caption: 'test' }),
      })
      const response = await PUT(request, { params: { id: 'p1' } })
      expect(response.status).toBe(400)
    })

    it('should return 501 for not implemented', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      const request = new NextRequest('http://localhost/api/photos/p1', {
        method: 'PUT',
        body: JSON.stringify({ type: 'stamp', caption: 'test' }),
      })
      const response = await PUT(request, { params: { id: 'p1' } })
      expect(response.status).toBe(501)
    })
  })
})
