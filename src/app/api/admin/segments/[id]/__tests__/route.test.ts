import { GET, PUT, DELETE } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('@/lib/database', () => ({
  getSegmentById: jest.fn(),
  adminUpdateSegment: jest.fn(),
  deleteSegment: jest.fn(),
}))

import { getSegmentById, adminUpdateSegment, deleteSegment } from '@/lib/database'

describe('/api/admin/segments/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/admin/segments/seg-1')
      const response = await GET(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(401)
    })

    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const request = new NextRequest('http://localhost/api/admin/segments/seg-1')
      const response = await GET(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(403)
    })

    it('should return 404 when segment not found', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getSegmentById as jest.Mock).mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/admin/segments/seg-1')
      const response = await GET(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(404)
    })

    it('should return segment', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      const mockSegment = { id: 'seg-1', street: 'Park Street' }
      ;(getSegmentById as jest.Mock).mockResolvedValue(mockSegment)

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1')
      const response = await GET(request, { params: { id: 'seg-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe('seg-1')
    })

    it('should return 500 on error', async () => {
      mockAuth.mockRejectedValue(new Error('Error'))
      const request = new NextRequest('http://localhost/api/admin/segments/seg-1')
      const response = await GET(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(500)
    })
  })

  describe('PUT', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ contractor: 'Test' }),
      })
      const response = await PUT(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(401)
    })

    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ contractor: 'Test' }),
      })
      const response = await PUT(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(403)
    })

    it('should return 404 when segment not found', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getSegmentById as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ contractor: 'Test' }),
      })
      const response = await PUT(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(404)
    })

    it('should return 400 for invalid coordinates', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getSegmentById as jest.Mock).mockResolvedValue({ id: 'seg-1' })

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ coordinates: [[37.76, -122.24]] }), // Only 1 coordinate
      })
      const response = await PUT(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid year', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getSegmentById as jest.Mock).mockResolvedValue({ id: 'seg-1' })

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ year: 1800 }),
      })
      const response = await PUT(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(400)
    })

    it('should return 400 when no updates provided', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getSegmentById as jest.Mock).mockResolvedValue({ id: 'seg-1' })

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({}),
      })
      const response = await PUT(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(400)
    })

    it('should update segment successfully', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
      ;(getSegmentById as jest.Mock).mockResolvedValue({ id: 'seg-1' })
      const updatedSegment = { id: 'seg-1', contractor: 'Updated Co' }
      ;(adminUpdateSegment as jest.Mock).mockResolvedValue(updatedSegment)

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ contractor: 'Updated Co', year: 1925 }),
      })
      const response = await PUT(request, { params: { id: 'seg-1' } })

      expect(response.status).toBe(200)
      expect(adminUpdateSegment).toHaveBeenCalledWith(
        'seg-1',
        { contractor: 'Updated Co', year: 1925 },
        'admin-1'
      )
    })

    it('should return 500 when adminUpdateSegment returns null', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getSegmentById as jest.Mock).mockResolvedValue({ id: 'seg-1' })
      ;(adminUpdateSegment as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', {
        method: 'PUT',
        body: JSON.stringify({ contractor: 'Test' }),
      })
      const response = await PUT(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(500)
    })
  })

  describe('DELETE', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(401)
    })

    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(403)
    })

    it('should return 404 when segment not found', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(deleteSegment as jest.Mock).mockResolvedValue(false)

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(404)
    })

    it('should delete segment successfully', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(deleteSegment as jest.Mock).mockResolvedValue(true)

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'seg-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.message).toContain('deleted')
    })

    it('should return 500 on error', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(deleteSegment as jest.Mock).mockRejectedValue(new Error('DB error'))

      const request = new NextRequest('http://localhost/api/admin/segments/seg-1', { method: 'DELETE' })
      const response = await DELETE(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(500)
    })
  })
})
