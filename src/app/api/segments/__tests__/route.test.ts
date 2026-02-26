import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

// Mock @/auth before importing route (to avoid next-auth ESM issues)
const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock the database and validation modules
jest.mock('@/lib/database', () => ({
  getFilteredSegments: jest.fn(),
  createSegment: jest.fn(),
  updateContractorStats: jest.fn(),
  parseCoordinates: (str: string) => JSON.parse(str),
  stringifyCoordinates: (coords: [number, number][]) => JSON.stringify(coords),
  parseSpecialMarks: (str: string) => str ? JSON.parse(str) : [],
  stringifySpecialMarks: (marks: string[]) => JSON.stringify(marks),
}))

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-123',
}))

import { getFilteredSegments, createSegment, updateContractorStats } from '@/lib/database'

describe('/api/segments GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return approved segments successfully', async () => {
    const mockSegments = [
      {
        id: '1',
        coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
        contractor: 'Smith Construction Co.',
        year: 1925,
        street: 'Park Street',
        block: '1400',
        specialMarks: ['P'],
        notes: 'Well-preserved contractor stamp',
        status: 'approved',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      }
    ]

    ;(getFilteredSegments as jest.Mock).mockResolvedValue(mockSegments)

    const request = new NextRequest('http://localhost:3000/api/segments')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getFilteredSegments).toHaveBeenCalled()

    const data = await response.json()
    expect(data[0]).toMatchObject({
      id: '1',
      coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400',
      specialMarks: ['P'],
      notes: 'Well-preserved contractor stamp',
    })
  })

  it('should return filtered segments when query params provided', async () => {
    const mockSegments = [
      {
        id: '1',
        coordinates: [[37.7652, -122.2416]],
        contractor: 'Smith Construction Co.',
        year: 1925,
        street: 'Park Street',
        block: '1400',
        specialMarks: [],
        status: 'approved',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      },
      {
        id: '2',
        coordinates: [[37.7652, -122.2416]],
        contractor: 'Jones Construction',
        year: 1930,
        street: 'Main Street',
        block: '1500',
        specialMarks: [],
        status: 'approved',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      }
    ]

    ;(getFilteredSegments as jest.Mock).mockResolvedValue([mockSegments[0]])

    const request = new NextRequest('http://localhost:3000/api/segments?contractor=Smith%20Construction%20Co.')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getFilteredSegments).toHaveBeenCalledWith({ contractor: 'Smith Construction Co.' })

    const data = await response.json()
    expect(data).toHaveLength(1)
    expect(data[0].contractor).toBe('Smith Construction Co.')
  })

  it('should pass year filter as integer to getFilteredSegments', async () => {
    ;(getFilteredSegments as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/segments?year=1925')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getFilteredSegments).toHaveBeenCalledWith({ year: 1925 })
  })

  it('should pass street filter to getFilteredSegments', async () => {
    ;(getFilteredSegments as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/segments?street=Park%20Street')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getFilteredSegments).toHaveBeenCalledWith({ street: 'Park Street' })
  })

  it('should pass combined filters to getFilteredSegments', async () => {
    ;(getFilteredSegments as jest.Mock).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3000/api/segments?contractor=Smith&year=1925&street=Park%20Street'
    )
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getFilteredSegments).toHaveBeenCalledWith({
      contractor: 'Smith',
      year: 1925,
      street: 'Park Street',
    })
  })

  it('should call getFilteredSegments with undefined when no filters', async () => {
    ;(getFilteredSegments as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/segments')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getFilteredSegments).toHaveBeenCalledWith(undefined)
  })

  it('should return 500 when database throws', async () => {
    ;(getFilteredSegments as jest.Mock).mockRejectedValue(new Error('DB connection failed'))

    const request = new NextRequest('http://localhost:3000/api/segments')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch segments')
  })

  it('should return empty array when no segments exist', async () => {
    ;(getFilteredSegments as jest.Mock).mockResolvedValue([])

    const request = new NextRequest('http://localhost:3000/api/segments')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual([])
  })
})

describe('/api/segments POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create segment successfully with valid data and coordinates', async () => {
    // Mock authenticated session
    mockAuth.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' }
    })

    const mockSegmentData = {
      coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400',
      notes: 'Well-preserved',
      specialMarks: ['P'],
    }

    const mockCreatedSegment = {
      id: 'mock-uuid-123',
      ...mockSegmentData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(createSegment as jest.Mock).mockResolvedValue(mockCreatedSegment)
    ;(updateContractorStats as jest.Mock).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/segments', {
      method: 'POST',
      body: JSON.stringify(mockSegmentData),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(createSegment).toHaveBeenCalledWith({
      coordinates: mockSegmentData.coordinates,
      contractor: mockSegmentData.contractor,
      year: mockSegmentData.year,
      street: mockSegmentData.street,
      block: mockSegmentData.block,
      notes: mockSegmentData.notes,
      specialMarks: mockSegmentData.specialMarks,
      createdBy: 'test-user-id',
      status: 'pending',
    })
    expect(updateContractorStats).toHaveBeenCalled()

    const data = await response.json()
    expect(data).toMatchObject({
      id: 'mock-uuid-123',
      contractor: 'Smith Construction Co.',
    })
  })

  it('should return 401 if not authenticated', async () => {
    // Mock no session
    mockAuth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/segments', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [[37.7652, -122.2416]],
        contractor: 'Test',
        year: 2020,
        street: 'Test St',
        block: '100',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Authentication required')
  })

  it('should return 400 if missing required fields', async () => {
    // Mock authenticated session
    mockAuth.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' }
    })

    const request = new NextRequest('http://localhost:3000/api/segments', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [[37.7652, -122.2416]],
        // Missing other required fields
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Missing required fields')
  })

  it('should return 500 when createSegment throws', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' }
    })

    ;(createSegment as jest.Mock).mockRejectedValue(new Error('DB write failed'))

    const request = new NextRequest('http://localhost:3000/api/segments', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [[37.7652, -122.2416]],
        contractor: 'Test',
        year: 2020,
        street: 'Test St',
        block: '100',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to create segment')
  })

  it('should set notes to undefined when not provided', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'test-user-id', email: 'test@example.com' }
    })

    ;(createSegment as jest.Mock).mockResolvedValue({
      id: 'mock-uuid-123',
      coordinates: [[37.7652, -122.2416]],
      contractor: 'Test',
      year: 2020,
      street: 'Test St',
      block: '100',
      status: 'pending',
    })
    ;(updateContractorStats as jest.Mock).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/segments', {
      method: 'POST',
      body: JSON.stringify({
        coordinates: [[37.7652, -122.2416]],
        contractor: 'Test',
        year: 2020,
        street: 'Test St',
        block: '100',
        // notes intentionally omitted
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(createSegment).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: undefined,
      })
    )
  })
})
