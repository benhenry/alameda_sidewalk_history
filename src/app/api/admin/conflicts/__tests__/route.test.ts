import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('@/lib/database', () => ({
  detectSegmentOverlaps: jest.fn(),
  getSegmentConflicts: jest.fn(),
  createSegmentConflict: jest.fn(),
}))

import { detectSegmentOverlaps, getSegmentConflicts, createSegmentConflict } from '@/lib/database'

describe('/api/admin/conflicts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/admin/conflicts')
      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const request = new NextRequest('http://localhost/api/admin/conflicts')
      const response = await GET(request)
      expect(response.status).toBe(403)
    })

    it('should return conflicts list', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      const mockConflicts = [{ id: 'c1', status: 'open' }]
      ;(getSegmentConflicts as jest.Mock).mockResolvedValue(mockConflicts)

      const request = new NextRequest('http://localhost/api/admin/conflicts')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.conflicts).toHaveLength(1)
      expect(data.count).toBe(1)
    })

    it('should pass status filter', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getSegmentConflicts as jest.Mock).mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/admin/conflicts?status=resolved')
      await GET(request)

      expect(getSegmentConflicts).toHaveBeenCalledWith('resolved')
    })

    it('should return 500 on error', async () => {
      mockAuth.mockRejectedValue(new Error('Auth error'))
      const request = new NextRequest('http://localhost/api/admin/conflicts')
      const response = await GET(request)
      expect(response.status).toBe(500)
    })
  })

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/admin/conflicts', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const request = new NextRequest('http://localhost/api/admin/conflicts', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      expect(response.status).toBe(403)
    })

    it('should return no overlaps message when none found', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(detectSegmentOverlaps as jest.Mock).mockResolvedValue([])

      const request = new NextRequest('http://localhost/api/admin/conflicts', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(data.detected).toBe(0)
    })

    it('should create conflict records for detected overlaps', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(detectSegmentOverlaps as jest.Mock).mockResolvedValue([
        { segment1_id: 's1', segment2_id: 's2', overlap_meters: 5.5 },
      ])
      ;(createSegmentConflict as jest.Mock).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/admin/conflicts', {
        method: 'POST',
        body: JSON.stringify({ minOverlapMeters: 2 }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.detected).toBe(1)
      expect(data.created).toBe(1)
      expect(detectSegmentOverlaps).toHaveBeenCalledWith(2)
    })

    it('should return 503 when migration is required', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(detectSegmentOverlaps as jest.Mock).mockResolvedValue([
        { segment1_id: 's1', segment2_id: 's2', overlap_meters: 5.5 },
      ])
      ;(createSegmentConflict as jest.Mock).mockRejectedValue(new Error('migration required'))

      const request = new NextRequest('http://localhost/api/admin/conflicts', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      expect(response.status).toBe(503)
    })

    it('should return 500 on unexpected error', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(detectSegmentOverlaps as jest.Mock).mockRejectedValue(new Error('Unexpected'))

      const request = new NextRequest('http://localhost/api/admin/conflicts', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })
})
