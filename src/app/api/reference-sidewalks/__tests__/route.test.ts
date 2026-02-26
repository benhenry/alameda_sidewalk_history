import { GET } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/database', () => ({
  getAllReferenceSidewalks: jest.fn(),
}))

import { getAllReferenceSidewalks } from '@/lib/database'

describe('/api/reference-sidewalks GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return GeoJSON FeatureCollection', async () => {
    const mockSidewalks = [
      { id: 1, osm_id: '123', street: 'Park Street', geometry: { type: 'LineString', coordinates: [[1, 2]] }, tags: { surface: 'concrete' } },
    ]
    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue(mockSidewalks)

    const request = new NextRequest('http://localhost/api/reference-sidewalks')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.type).toBe('FeatureCollection')
    expect(data.features).toHaveLength(1)
    expect(data.features[0].type).toBe('Feature')
    expect(data.features[0].properties.osmId).toBe('123')
    expect(data.features[0].properties.street).toBe('Park Street')
  })

  it('should pass bounds to database', async () => {
    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue([])
    const request = new NextRequest('http://localhost/api/reference-sidewalks?north=37.8&south=37.7&east=-122.2&west=-122.3')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getAllReferenceSidewalks).toHaveBeenCalledWith({
      north: 37.8, south: 37.7, east: -122.2, west: -122.3
    })
  })

  it('should call without bounds when params missing', async () => {
    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue([])
    const request = new NextRequest('http://localhost/api/reference-sidewalks')
    const response = await GET(request)

    expect(getAllReferenceSidewalks).toHaveBeenCalledWith(undefined)
  })

  it('should return 500 on error', async () => {
    ;(getAllReferenceSidewalks as jest.Mock).mockRejectedValue(new Error('DB error'))
    const request = new NextRequest('http://localhost/api/reference-sidewalks')
    const response = await GET(request)
    expect(response.status).toBe(500)
  })
})
