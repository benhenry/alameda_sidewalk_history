import { GET } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('@/lib/database', () => ({
  getSegmentsForCorrection: jest.fn(),
}))

jest.mock('@/lib/batch-correction', () => ({
  batchAnalyzeSegments: jest.fn(),
}))

import { getSegmentsForCorrection } from '@/lib/database'
import { batchAnalyzeSegments } from '@/lib/batch-correction'

describe('/api/admin/batch-correct/preview GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admin/batch-correct/preview')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('should return 403 when not admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
    const request = new NextRequest('http://localhost/api/admin/batch-correct/preview')
    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('should return 400 for invalid threshold', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    const request = new NextRequest('http://localhost/api/admin/batch-correct/preview?threshold=150')
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('should return preview results', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    ;(getSegmentsForCorrection as jest.Mock).mockResolvedValue([
      { id: 's1', coordinates: [[37.76, -122.24]], street: 'Park Street', block: '1400' },
    ])
    ;(batchAnalyzeSegments as jest.Mock).mockResolvedValue([
      {
        segmentId: 's1',
        street: 'Park Street',
        block: '1400',
        corrections: [{ pointIndex: 0, distance: 8, street: 'Park Street' }],
        maxDistance: 8,
        needsCorrection: true,
      },
    ])

    const request = new NextRequest('http://localhost/api/admin/batch-correct/preview?threshold=5')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.summary.totalSegmentsAnalyzed).toBe(1)
    expect(data.summary.segmentsNeedingCorrection).toBe(1)
    expect(data.corrections).toHaveLength(1)
  })

  it('should pass filters to getSegmentsForCorrection', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    ;(getSegmentsForCorrection as jest.Mock).mockResolvedValue([])
    ;(batchAnalyzeSegments as jest.Mock).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost/api/admin/batch-correct/preview?street=Park&yearMin=1920&yearMax=1930'
    )
    await GET(request)

    expect(getSegmentsForCorrection).toHaveBeenCalledWith({
      street: 'Park',
      yearMin: 1920,
      yearMax: 1930,
    })
  })

  it('should return 500 on error', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    ;(getSegmentsForCorrection as jest.Mock).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/admin/batch-correct/preview')
    const response = await GET(request)
    expect(response.status).toBe(500)
  })
})
