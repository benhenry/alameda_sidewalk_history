import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock the sidewalk validation module
jest.mock('@/lib/sidewalk-validation', () => ({
  fetchSidewalkData: jest.fn(),
}))

import { fetchSidewalkData } from '@/lib/sidewalk-validation'

describe('/api/sidewalks GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return sidewalk coordinates successfully', async () => {
    const mockSidewalkData = [
      [37.7652, -122.2416],
      [37.7653, -122.2417],
      [37.7654, -122.2418]
    ]

    ;(fetchSidewalkData as jest.Mock).mockResolvedValue(mockSidewalkData)

    const response = await GET()

    expect(response.status).toBe(200)
    expect(fetchSidewalkData).toHaveBeenCalled()

    const data = await response.json()
    expect(data).toEqual({
      coordinates: mockSidewalkData,
      count: 3
    })
  })

  it('should return empty coordinates when fetch fails', async () => {
    ;(fetchSidewalkData as jest.Mock).mockRejectedValue(new Error('Fetch failed'))

    const response = await GET()

    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data).toEqual({
      error: 'Failed to fetch sidewalk data',
      coordinates: []
    })
  })

  it('should handle empty sidewalk data', async () => {
    ;(fetchSidewalkData as jest.Mock).mockResolvedValue([])

    const response = await GET()

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({
      coordinates: [],
      count: 0
    })
  })

  it('should handle null/undefined sidewalk data', async () => {
    ;(fetchSidewalkData as jest.Mock).mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({
      coordinates: null,
      count: 0
    })
  })
})