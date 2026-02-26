import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock the database module
jest.mock('@/lib/database', () => ({
  getAllReferenceSidewalks: jest.fn(),
}))

import { getAllReferenceSidewalks } from '@/lib/database'

function makeRequest(url = 'http://localhost:3000/api/sidewalks') {
  return new NextRequest(url)
}

describe('/api/sidewalks GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return sidewalk line strings successfully', async () => {
    const mockSidewalks = [
      {
        id: 1,
        geometry: {
          type: 'LineString',
          coordinates: [
            [-122.2416, 37.7652],  // lng, lat (GeoJSON format)
            [-122.2420, 37.7660],
          ]
        }
      },
      {
        id: 2,
        geometry: {
          type: 'LineString',
          coordinates: [
            [-122.2430, 37.7670],
            [-122.2435, 37.7675],
          ]
        }
      }
    ]

    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue(mockSidewalks)

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    expect(getAllReferenceSidewalks).toHaveBeenCalled()

    const data = await response.json()
    expect(data.lineStrings).toHaveLength(2)
    expect(data.lineStrings[0]).toEqual([
      [37.7652, -122.2416],  // lat, lng (Leaflet format)
      [37.7660, -122.2420],
    ])
    expect(data.coordinates).toBe(4)  // Total coordinate count
    expect(data.count).toBe(4)
    expect(data.source).toBe('reference_sidewalks')
    expect(data.totalSidewalks).toBe(2)
  })

  it('should handle empty sidewalk data', async () => {
    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue([])

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toEqual({
      lineStrings: [],
      coordinates: 0,
      count: 0,
      source: 'reference_sidewalks',
      totalSidewalks: 0,
    })
  })

  it('should handle database errors', async () => {
    ;(getAllReferenceSidewalks as jest.Mock).mockRejectedValue(new Error('Database error'))

    const response = await GET(makeRequest())

    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe('Failed to fetch sidewalk data')
    expect(data.lineStrings).toEqual([])
    expect(data.coordinates).toBe(0)
  })

  it('should pass bounds parameters to getAllReferenceSidewalks', async () => {
    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue([])

    const response = await GET(makeRequest(
      'http://localhost:3000/api/sidewalks?north=37.80&south=37.76&east=-122.22&west=-122.28'
    ))

    expect(response.status).toBe(200)
    expect(getAllReferenceSidewalks).toHaveBeenCalledWith({
      north: 37.80,
      south: 37.76,
      east: -122.22,
      west: -122.28,
    })
  })

  it('should pass undefined bounds when only some params provided', async () => {
    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue([])

    // Only north and south provided, missing east and west
    const response = await GET(makeRequest(
      'http://localhost:3000/api/sidewalks?north=37.80&south=37.76'
    ))

    expect(response.status).toBe(200)
    expect(getAllReferenceSidewalks).toHaveBeenCalledWith(undefined)
  })

  it('should pass undefined bounds when no params provided', async () => {
    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue([])

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    expect(getAllReferenceSidewalks).toHaveBeenCalledWith(undefined)
  })

  it('should return correct shape for empty results', async () => {
    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue([])

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual({
      lineStrings: [],
      coordinates: 0,
      count: 0,
      source: 'reference_sidewalks',
      totalSidewalks: 0,
    })
  })

  it('should handle LineStrings with single coordinate (should be filtered)', async () => {
    const mockSidewalks = [
      {
        id: 1,
        geometry: {
          type: 'LineString',
          coordinates: [[-122.2416, 37.7652]], // Only one point - not valid
        }
      }
    ]

    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue(mockSidewalks)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.lineStrings).toHaveLength(0)
    expect(data.totalSidewalks).toBe(1)
  })

  it('should skip invalid geometries', async () => {
    const mockSidewalks = [
      {
        id: 1,
        geometry: {
          type: 'LineString',
          coordinates: [
            [-122.2416, 37.7652],
            [-122.2420, 37.7660],
          ]
        }
      },
      {
        id: 2,
        geometry: {
          type: 'Point',  // Not a LineString
          coordinates: [-122.2430, 37.7670]
        }
      },
      {
        id: 3,
        geometry: null  // No geometry
      }
    ]

    ;(getAllReferenceSidewalks as jest.Mock).mockResolvedValue(mockSidewalks)

    const response = await GET(makeRequest())

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.lineStrings).toHaveLength(1)  // Only valid LineString included
    expect(data.totalSidewalks).toBe(3)  // All sidewalks counted
  })
})
