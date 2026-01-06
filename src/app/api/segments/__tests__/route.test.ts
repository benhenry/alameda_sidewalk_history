import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

// Mock the database and validation modules
jest.mock('@/lib/database', () => ({
  getAllSegments: jest.fn(),
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

import { getAllSegments, createSegment, updateContractorStats } from '@/lib/database'

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

    ;(getAllSegments as jest.Mock).mockResolvedValue(mockSegments)

    const request = new NextRequest('http://localhost:3000/api/segments')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(getAllSegments).toHaveBeenCalled()

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

    ;(getAllSegments as jest.Mock).mockResolvedValue(mockSegments)

    const request = new NextRequest('http://localhost:3000/api/segments?contractor=Smith%20Construction%20Co.')
    const response = await GET(request)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveLength(1)
    expect(data[0].contractor).toBe('Smith Construction Co.')
  })
})

describe('/api/segments POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should create segment successfully with valid data and coordinates', async () => {
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
      headers: {
        'x-user-id': 'test-user-id',
      },
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

  it('should return 400 if missing required fields', async () => {
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
})
