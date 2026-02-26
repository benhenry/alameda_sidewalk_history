import { GET } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/database', () => ({
  getApprovedSegmentGeometries: jest.fn(),
}))

import { getApprovedSegmentGeometries } from '@/lib/database'

describe('/api/segments/approved-geometries GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return approved geometries without bounds', async () => {
    const mockSegments = [
      { id: 'seg-1', street: 'Park Street', block: '1400', contractor: 'Smith', year: 1925, geometry: { type: 'LineString', coordinates: [[1, 2]] } },
    ]
    ;(getApprovedSegmentGeometries as jest.Mock).mockResolvedValue(mockSegments)

    const request = new NextRequest('http://localhost/api/segments/approved-geometries')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.segments).toHaveLength(1)
    expect(data.count).toBe(1)
    expect(getApprovedSegmentGeometries).toHaveBeenCalledWith(undefined)
  })

  it('should pass bounds when all params provided', async () => {
    ;(getApprovedSegmentGeometries as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost/api/segments/approved-geometries?north=37.8&south=37.7&east=-122.2&west=-122.3')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getApprovedSegmentGeometries).toHaveBeenCalledWith({
      north: 37.8, south: 37.7, east: -122.2, west: -122.3
    })
  })

  it('should return 400 for invalid bounds', async () => {
    const request = new NextRequest('http://localhost/api/segments/approved-geometries?north=abc&south=37.7&east=-122.2&west=-122.3')
    const response = await GET(request)
    expect(response.status).toBe(400)
  })

  it('should ignore partial bounds', async () => {
    ;(getApprovedSegmentGeometries as jest.Mock).mockResolvedValue([])
    const request = new NextRequest('http://localhost/api/segments/approved-geometries?north=37.8&south=37.7')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getApprovedSegmentGeometries).toHaveBeenCalledWith(undefined)
  })

  it('should return 500 on database error', async () => {
    ;(getApprovedSegmentGeometries as jest.Mock).mockRejectedValue(new Error('DB error'))
    const request = new NextRequest('http://localhost/api/segments/approved-geometries')
    const response = await GET(request)
    expect(response.status).toBe(500)
  })
})
