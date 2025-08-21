import { GET, PATCH } from '../route'
import { NextRequest } from 'next/server'

// Mock the database
jest.mock('@/lib/database', () => ({
  segmentQueries: {
    getPending: {
      all: jest.fn(),
    },
    getAllWithStatus: {
      all: jest.fn(),
    },
    getById: {
      get: jest.fn(),
    },
    approve: {
      run: jest.fn(),
    },
    reject: {
      run: jest.fn(),
    },
  },
  parseCoordinates: (str: string) => JSON.parse(str),
  parseSpecialMarks: (str: string) => str ? JSON.parse(str) : [],
}))

import { segmentQueries } from '@/lib/database'

describe('/api/admin/segments GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return pending segments for admin', async () => {
    const mockPendingSegments = [
      {
        id: '1',
        coordinates: '[[37.7652,-122.2416],[37.7660,-122.2420]]',
        contractor: 'Smith Construction Co.',
        year: 1925,
        street: 'Park Street',
        block: '1400',
        status: 'pending',
        special_marks: '["P"]',
        notes: 'Well-preserved contractor stamp',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        created_by_username: 'testuser',
        photo_ids: null,
        photo_filenames: null,
        photo_types: null,
      }
    ]

    ;(segmentQueries.getPending.all as jest.Mock).mockReturnValue(mockPendingSegments)

    const request = new NextRequest('http://localhost:3000/api/admin/segments?status=pending', {
      headers: {
        'x-user-role': 'admin',
      }
    })
    
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(segmentQueries.getPending.all).toHaveBeenCalled()

    const data = await response.json()
    expect(data[0]).toMatchObject({
      id: '1',
      coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
      contractor: 'Smith Construction Co.',
      status: 'pending',
      createdByUsername: 'testuser',
    })
  })

  it('should return all segments when no status filter', async () => {
    const mockAllSegments = [
      {
        id: '1',
        coordinates: '[[37.7652,-122.2416]]',
        contractor: 'Smith Construction Co.',
        year: 1925,
        street: 'Park Street',
        block: '1400',
        status: 'approved',
        special_marks: null,
        notes: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        created_by_username: 'testuser',
        approved_by_username: 'admin',
        approved_at: '2023-01-02T00:00:00.000Z',
        photo_ids: null,
        photo_filenames: null,
        photo_types: null,
      }
    ]

    ;(segmentQueries.getAllWithStatus.all as jest.Mock).mockReturnValue(mockAllSegments)

    const request = new NextRequest('http://localhost:3000/api/admin/segments', {
      headers: {
        'x-user-role': 'admin',
      }
    })
    
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(segmentQueries.getAllWithStatus.all).toHaveBeenCalled()

    const data = await response.json()
    expect(data[0]).toMatchObject({
      id: '1',
      status: 'approved',
      createdByUsername: 'testuser',
      approvedByUsername: 'admin',
    })
  })

  it('should reject non-admin requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/segments', {
      headers: {
        'x-user-role': 'user', // Not admin
      }
    })
    
    const response = await GET(request)

    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle database errors', async () => {
    ;(segmentQueries.getAllWithStatus.all as jest.Mock).mockImplementation(() => {
      throw new Error('Database error')
    })

    const request = new NextRequest('http://localhost:3000/api/admin/segments', {
      headers: {
        'x-user-role': 'admin',
      }
    })
    
    const response = await GET(request)

    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe('Failed to fetch segments')
  })
})

describe('/api/admin/segments PATCH', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should approve segment successfully', async () => {
    const mockUpdatedSegment = {
      id: 'segment-1',
      coordinates: '[[37.7652,-122.2416]]',
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400',
      status: 'approved',
      special_marks: null,
      notes: null,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-02T00:00:00.000Z',
    }

    ;(segmentQueries.getById.get as jest.Mock).mockReturnValue(mockUpdatedSegment)

    const request = new NextRequest('http://localhost:3000/api/admin/segments', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'admin',
        'x-user-id': 'admin-user-123',
      },
      body: JSON.stringify({
        segmentId: 'segment-1',
        action: 'approve'
      })
    })

    const response = await PATCH(request)

    expect(response.status).toBe(200)
    expect(segmentQueries.approve.run).toHaveBeenCalledWith('admin-user-123', 'segment-1')
    expect(segmentQueries.getById.get).toHaveBeenCalledWith('segment-1')

    const data = await response.json()
    expect(data).toMatchObject({
      id: 'segment-1',
      status: 'approved',
      contractor: 'Smith Construction Co.',
    })
  })

  it('should reject segment successfully', async () => {
    const mockUpdatedSegment = {
      id: 'segment-1',
      coordinates: '[[37.7652,-122.2416]]',
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400',
      status: 'rejected',
      special_marks: null,
      notes: null,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-02T00:00:00.000Z',
    }

    ;(segmentQueries.getById.get as jest.Mock).mockReturnValue(mockUpdatedSegment)

    const request = new NextRequest('http://localhost:3000/api/admin/segments', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'admin',
        'x-user-id': 'admin-user-123',
      },
      body: JSON.stringify({
        segmentId: 'segment-1',
        action: 'reject'
      })
    })

    const response = await PATCH(request)

    expect(response.status).toBe(200)
    expect(segmentQueries.reject.run).toHaveBeenCalledWith('admin-user-123', 'segment-1')

    const data = await response.json()
    expect(data.status).toBe('rejected')
  })

  it('should reject non-admin PATCH requests', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/segments', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'user', // Not admin
        'x-user-id': 'user-123',
      },
      body: JSON.stringify({
        segmentId: 'segment-1',
        action: 'approve'
      })
    })

    const response = await PATCH(request)

    expect(response.status).toBe(403)

    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should validate request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/segments', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'admin',
        'x-user-id': 'admin-user-123',
      },
      body: JSON.stringify({
        segmentId: 'segment-1',
        action: 'invalid-action' // Invalid action
      })
    })

    const response = await PATCH(request)

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('Invalid request')
  })

  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/admin/segments', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'admin',
        'x-user-id': 'admin-user-123',
      },
      body: JSON.stringify({
        // Missing required fields
      })
    })

    const response = await PATCH(request)

    expect(response.status).toBe(400)

    const data = await response.json()
    expect(data.error).toBe('Invalid request')
  })

  it('should handle database errors during approval', async () => {
    ;(segmentQueries.approve.run as jest.Mock).mockImplementation(() => {
      throw new Error('Database error')
    })

    const request = new NextRequest('http://localhost:3000/api/admin/segments', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-role': 'admin',
        'x-user-id': 'admin-user-123',
      },
      body: JSON.stringify({
        segmentId: 'segment-1',
        action: 'approve'
      })
    })

    const response = await PATCH(request)

    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe('Failed to update segment')
  })
})