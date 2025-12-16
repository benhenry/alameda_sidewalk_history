import { POST } from '../route'
import { NextRequest } from 'next/server'
import * as database from '@/lib/database'

jest.mock('@/lib/database')

describe('POST /api/snap', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should snap coordinates to nearest sidewalk', async () => {
    const mockSnap = jest.fn().mockResolvedValue({
      snapped: [37.7652, -122.2416],
      referenceId: 'ref-123',
      distance: 15.5
    })
    ;(database.snapToNearestSidewalk as jest.Mock) = mockSnap

    const request = new NextRequest('http://localhost/api/snap', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [[37.7651, -122.2415]]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.snappedCoordinates).toHaveLength(1)
    expect(data.snappedCoordinates[0]).toEqual([37.7652, -122.2416])
    expect(data.metadata[0]).toEqual({
      original: [37.7651, -122.2415],
      snapped: [37.7652, -122.2416],
      referenceId: 'ref-123',
      distance: 15.5
    })
    expect(mockSnap).toHaveBeenCalledWith([37.7651, -122.2415])
  })

  it('should handle multiple coordinates', async () => {
    const mockSnap = jest.fn()
      .mockResolvedValueOnce({
        snapped: [37.7652, -122.2416],
        referenceId: 'ref-1',
        distance: 10.2
      })
      .mockResolvedValueOnce({
        snapped: [37.7660, -122.2420],
        referenceId: 'ref-2',
        distance: 8.7
      })
    ;(database.snapToNearestSidewalk as jest.Mock) = mockSnap

    const request = new NextRequest('http://localhost/api/snap', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [
          [37.7651, -122.2415],
          [37.7659, -122.2419]
        ]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.snappedCoordinates).toHaveLength(2)
    expect(data.metadata).toHaveLength(2)
    expect(mockSnap).toHaveBeenCalledTimes(2)
  })

  it('should handle coordinates with no nearby sidewalk', async () => {
    ;(database.snapToNearestSidewalk as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/snap', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [[37.9, -122.5]]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.snappedCoordinates[0]).toEqual([37.9, -122.5])
    expect(data.metadata[0].snapped).toBeNull()
    expect(data.metadata[0].error).toBe('No nearby sidewalk within 50m')
  })

  it('should return 400 for missing coordinates', async () => {
    const request = new NextRequest('http://localhost/api/snap', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid coordinates array')
  })

  it('should return 400 for non-array coordinates', async () => {
    const request = new NextRequest('http://localhost/api/snap', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: 'not an array'
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid coordinates array')
  })

  it('should return 400 for invalid coordinate format', async () => {
    const request = new NextRequest('http://localhost/api/snap', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [[37.7651]]  // Missing lng
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid coordinate format')
  })

  it('should round distance to 2 decimal places', async () => {
    const mockSnap = jest.fn().mockResolvedValue({
      snapped: [37.7652, -122.2416],
      referenceId: 'ref-123',
      distance: 15.666666
    })
    ;(database.snapToNearestSidewalk as jest.Mock) = mockSnap

    const request = new NextRequest('http://localhost/api/snap', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [[37.7651, -122.2415]]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(data.metadata[0].distance).toBe(15.67)
  })

  it('should handle database errors gracefully', async () => {
    ;(database.snapToNearestSidewalk as jest.Mock).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = new NextRequest('http://localhost/api/snap', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [[37.7651, -122.2415]]
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to snap coordinates')
  })
})
