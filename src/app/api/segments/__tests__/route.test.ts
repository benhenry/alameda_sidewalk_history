import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

// Mock the database and validation modules  
jest.mock('@/lib/database', () => ({
  segmentQueries: {
    getAll: {
      all: jest.fn(),
    },
    getByFilters: {
      all: jest.fn(),
    },
    insert: {
      run: jest.fn(),
    },
    getById: {
      get: jest.fn(),
    },
  },
  contractorQueries: {
    upsert: {
      run: jest.fn(),
    },
    updateSegmentCount: {
      run: jest.fn(),
    },
  },
  parseCoordinates: (str: string) => JSON.parse(str),
  stringifyCoordinates: (coords: [number, number][]) => JSON.stringify(coords),
  parseSpecialMarks: (str: string) => str ? JSON.parse(str) : [],
  stringifySpecialMarks: (marks: string[]) => JSON.stringify(marks),
}))

jest.mock('@/lib/sidewalk-validation', () => ({
  validateSidewalkCoordinates: jest.fn(),
  getSidewalkSuggestions: jest.fn(),
}))

jest.mock('uuid', () => ({
  v4: () => 'mock-uuid-123',
}))

import { segmentQueries, contractorQueries } from '@/lib/database'
import { validateSidewalkCoordinates } from '@/lib/sidewalk-validation'

describe('/api/segments GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return approved segments successfully', async () => {
    const mockDbSegments = [
      {
        id: '1',
        coordinates: '[[37.7652,-122.2416],[37.7660,-122.2420]]',
        contractor: 'Smith Construction Co.',
        year: 1925,
        street: 'Park Street',
        block: '1400',
        special_marks: '["P"]',
        notes: 'Well-preserved contractor stamp',
        photo_ids: 'photo1,photo2',
        photo_filenames: 'stamp1.jpg,stamp2.jpg',
        photo_types: 'contractor_stamp,contractor_stamp',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      }
    ]

    ;(segmentQueries.getAll.all as jest.Mock).mockReturnValue(mockDbSegments)

    const request = new NextRequest('http://localhost:3000/api/segments')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(segmentQueries.getAll.all).toHaveBeenCalled()

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
    const mockDbSegments = [
      {
        id: '1',
        coordinates: '[[37.7652,-122.2416]]',
        contractor: 'Smith Construction Co.',
        year: 1925,
        street: 'Park Street',
        block: '1400',
        special_marks: null,
        notes: null,
        photo_ids: null,
        photo_filenames: null,
        photo_types: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      }
    ]

    ;(segmentQueries.getByFilters.all as jest.Mock).mockReturnValue(mockDbSegments)

    const request = new NextRequest('http://localhost:3000/api/segments?contractor=Smith%20Construction%20Co.')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(segmentQueries.getByFilters.all).toHaveBeenCalledWith(
      'Smith Construction Co.', 'Smith Construction Co.',
      null, null,
      null, null
    )
  })

  it('should handle database errors', async () => {
    ;(segmentQueries.getAll.all as jest.Mock).mockImplementation(() => {
      throw new Error('Database error')
    })

    const request = new NextRequest('http://localhost:3000/api/segments')
    const response = await GET(request)

    expect(response.status).toBe(500)
    
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch segments')
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
      notes: 'Well-preserved contractor stamp',
      specialMarks: ['P']
    }

    const mockCreatedDbSegment = {
      id: 'mock-uuid-123',
      coordinates: '[[37.7652,-122.2416],[37.7660,-122.2420]]',
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400',
      notes: 'Well-preserved contractor stamp',
      special_marks: '["P"]',
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    }

    ;(validateSidewalkCoordinates as jest.Mock).mockResolvedValue({ isValid: true, invalidCoordinates: [] })
    ;(segmentQueries.getById.get as jest.Mock).mockReturnValue(mockCreatedDbSegment)

    const request = new NextRequest('http://localhost:3000/api/segments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user1'
      },
      body: JSON.stringify(mockSegmentData)
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    expect(validateSidewalkCoordinates).toHaveBeenCalledWith(mockSegmentData.coordinates)
    expect(segmentQueries.insert.run).toHaveBeenCalledWith(
      'mock-uuid-123',
      '[[37.7652,-122.2416],[37.7660,-122.2420]]',
      'Smith Construction Co.',
      1925,
      'Park Street',
      '1400',
      'Well-preserved contractor stamp',
      '["P"]',
      'user1'
    )

    const data = await response.json()
    expect(data).toMatchObject({
      id: 'mock-uuid-123',
      coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400',
    })
  })

  it('should reject invalid coordinates with suggestions', async () => {
    const mockSegmentData = {
      coordinates: [[37.8000, -122.1000]], // Invalid coordinates
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400'
    }

    ;(validateSidewalkCoordinates as jest.Mock).mockResolvedValue({ 
      isValid: false, 
      invalidCoordinates: [[37.8000, -122.1000]]
    })

    const request = new NextRequest('http://localhost:3000/api/segments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user1'
      },
      body: JSON.stringify(mockSegmentData)
    })

    const response = await POST(request)

    expect(response.status).toBe(422)
    
    const data = await response.json()
    expect(data.error).toBe('Some coordinates are not near known sidewalk locations')
    expect(data.invalidCoordinates).toEqual([[37.8000, -122.1000]])
  })

  it('should return 400 for missing required fields', async () => {
    const incompleteSegmentData = {
      coordinates: [[37.7652, -122.2416]],
      // Missing required fields
    }

    const request = new NextRequest('http://localhost:3000/api/segments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user1'
      },
      body: JSON.stringify(incompleteSegmentData)
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    
    const data = await response.json()
    expect(data.error).toBe('Missing required fields')
  })

  it('should handle database errors', async () => {
    const mockSegmentData = {
      coordinates: [[37.7652, -122.2416]],
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400'
    }

    ;(validateSidewalkCoordinates as jest.Mock).mockResolvedValue({ isValid: true, invalidCoordinates: [] })
    ;(segmentQueries.insert.run as jest.Mock).mockImplementation(() => {
      throw new Error('Database error')
    })

    const request = new NextRequest('http://localhost:3000/api/segments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'user1'
      },
      body: JSON.stringify(mockSegmentData)
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    
    const data = await response.json()
    expect(data.error).toBe('Failed to create segment')
  })
})