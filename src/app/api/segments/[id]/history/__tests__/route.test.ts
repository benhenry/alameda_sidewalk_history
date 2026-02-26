import { GET } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/database', () => ({
  getSegmentEditHistory: jest.fn(),
}))

import { getSegmentEditHistory } from '@/lib/database'

describe('/api/segments/[id]/history GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return segment edit history', async () => {
    const mockHistory = [
      { id: 'h1', segmentId: 'seg-1', editedBy: 'user-1', editedAt: '2025-01-01', changes: 'Updated coordinates' },
      { id: 'h2', segmentId: 'seg-1', editedBy: 'user-2', editedAt: '2025-01-02', changes: 'Updated contractor' },
    ]
    ;(getSegmentEditHistory as jest.Mock).mockResolvedValue(mockHistory)

    const request = new NextRequest('http://localhost/api/segments/seg-1/history')
    const response = await GET(request, { params: { id: 'seg-1' } })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.history).toHaveLength(2)
    expect(data.count).toBe(2)
    expect(getSegmentEditHistory).toHaveBeenCalledWith('seg-1')
  })

  it('should return empty history for segment with no edits', async () => {
    ;(getSegmentEditHistory as jest.Mock).mockResolvedValue([])
    const request = new NextRequest('http://localhost/api/segments/seg-1/history')
    const response = await GET(request, { params: { id: 'seg-1' } })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.history).toHaveLength(0)
    expect(data.count).toBe(0)
  })

  it('should return 500 on database error', async () => {
    ;(getSegmentEditHistory as jest.Mock).mockRejectedValue(new Error('DB error'))
    const request = new NextRequest('http://localhost/api/segments/seg-1/history')
    const response = await GET(request, { params: { id: 'seg-1' } })
    expect(response.status).toBe(500)
  })
})
