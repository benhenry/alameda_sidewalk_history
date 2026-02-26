import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('@/lib/database', () => ({
  getSegmentsForCorrection: jest.fn(),
  adminUpdateSegment: jest.fn(),
  createSegmentCorrection: jest.fn(),
  getSegmentCorrections: jest.fn(),
}))

jest.mock('@/lib/batch-correction', () => ({
  batchAnalyzeSegments: jest.fn(),
}))

import { getSegmentsForCorrection, adminUpdateSegment, createSegmentCorrection, getSegmentCorrections } from '@/lib/database'
import { batchAnalyzeSegments } from '@/lib/batch-correction'

describe('/api/admin/batch-correct', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/admin/batch-correct', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const request = new NextRequest('http://localhost/api/admin/batch-correct', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      expect(response.status).toBe(403)
    })

    it('should return 400 for invalid threshold', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      const request = new NextRequest('http://localhost/api/admin/batch-correct', {
        method: 'POST',
        body: JSON.stringify({ threshold: 150 }),
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should execute corrections', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
      ;(getSegmentsForCorrection as jest.Mock).mockResolvedValue([
        { id: 's1', coordinates: [[37.76, -122.24]], street: 'Park', block: '1400' },
      ])
      ;(batchAnalyzeSegments as jest.Mock).mockResolvedValue([{
        segmentId: 's1',
        street: 'Park',
        block: '1400',
        originalCoordinates: [[37.76, -122.24]],
        correctedCoordinates: [[37.761, -122.241]],
        corrections: [{ pointIndex: 0, distance: 10, street: 'Park' }],
        maxDistance: 10,
        needsCorrection: true,
      }])
      ;(adminUpdateSegment as jest.Mock).mockResolvedValue({ id: 's1' })
      ;(createSegmentCorrection as jest.Mock).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost/api/admin/batch-correct', {
        method: 'POST',
        body: JSON.stringify({ threshold: 5 }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.summary.corrected).toBe(1)
      expect(data.dryRun).toBe(false)
    })

    it('should support dry run mode', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
      ;(getSegmentsForCorrection as jest.Mock).mockResolvedValue([
        { id: 's1', coordinates: [[37.76, -122.24]], street: 'Park', block: '1400' },
      ])
      ;(batchAnalyzeSegments as jest.Mock).mockResolvedValue([{
        segmentId: 's1',
        street: 'Park',
        block: '1400',
        corrections: [{ pointIndex: 0, distance: 10, street: 'Park' }],
        maxDistance: 10,
        needsCorrection: true,
      }])

      const request = new NextRequest('http://localhost/api/admin/batch-correct', {
        method: 'POST',
        body: JSON.stringify({ dryRun: true }),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.dryRun).toBe(true)
      // adminUpdateSegment should NOT be called in dry run
      expect(adminUpdateSegment).not.toHaveBeenCalled()
    })

    it('should handle failed update', async () => {
      mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
      ;(getSegmentsForCorrection as jest.Mock).mockResolvedValue([
        { id: 's1', coordinates: [[37.76, -122.24]], street: 'Park', block: '1400' },
      ])
      ;(batchAnalyzeSegments as jest.Mock).mockResolvedValue([{
        segmentId: 's1',
        street: 'Park',
        block: '1400',
        originalCoordinates: [[37.76, -122.24]],
        correctedCoordinates: [[37.761, -122.241]],
        corrections: [{ pointIndex: 0, distance: 10, street: 'Park' }],
        maxDistance: 10,
        needsCorrection: true,
      }])
      ;(adminUpdateSegment as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/admin/batch-correct', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      const data = await response.json()
      expect(data.summary.failed).toBe(1)
    })

    it('should return 500 on error', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getSegmentsForCorrection as jest.Mock).mockRejectedValue(new Error('DB error'))

      const request = new NextRequest('http://localhost/api/admin/batch-correct', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  describe('GET', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/admin/batch-correct')
      const response = await GET(request)
      expect(response.status).toBe(401)
    })

    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const request = new NextRequest('http://localhost/api/admin/batch-correct')
      const response = await GET(request)
      expect(response.status).toBe(403)
    })

    it('should return correction history', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getSegmentCorrections as jest.Mock).mockResolvedValue([{ id: 'c1' }])

      const request = new NextRequest('http://localhost/api/admin/batch-correct')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.corrections).toHaveLength(1)
      expect(data.count).toBe(1)
    })
  })
})
