import { GET, PUT, DELETE } from '../route'
import { NextRequest } from 'next/server'

// Mock @/auth before importing route
const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock the database module
jest.mock('@/lib/database', () => ({
  getSegmentById: jest.fn(),
  updateSegment: jest.fn(),
  deleteSegment: jest.fn(),
}))

import { getSegmentById, updateSegment, deleteSegment } from '@/lib/database'

const mockSegment = {
  id: 'seg-123',
  coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
  contractor: 'Smith Construction Co.',
  year: 1925,
  street: 'Park Street',
  block: '1400',
  notes: 'Well-preserved',
  specialMarks: ['P'],
  status: 'approved',
  createdBy: 'user-456',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
}

const makeParams = (id: string) => ({ params: { id } })

describe('/api/segments/[id] GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return segment by ID', async () => {
    ;(getSegmentById as jest.Mock).mockResolvedValue(mockSegment)

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123')
    const response = await GET(request, makeParams('seg-123'))

    expect(response.status).toBe(200)
    expect(getSegmentById).toHaveBeenCalledWith('seg-123')

    const data = await response.json()
    expect(data.id).toBe('seg-123')
    expect(data.contractor).toBe('Smith Construction Co.')
  })

  it('should return 404 when segment not found', async () => {
    ;(getSegmentById as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/segments/nonexistent')
    const response = await GET(request, makeParams('nonexistent'))

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Segment not found')
  })

  it('should return 500 on database error', async () => {
    ;(getSegmentById as jest.Mock).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123')
    const response = await GET(request, makeParams('seg-123'))

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch segment')
  })
})

describe('/api/segments/[id] PUT', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should update segment when user is the owner', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-456', email: 'test@example.com', role: 'user' }
    })

    ;(getSegmentById as jest.Mock).mockResolvedValue(mockSegment)

    const updatedSegment = { ...mockSegment, contractor: 'Updated Contractor' }
    ;(updateSegment as jest.Mock).mockResolvedValue(updatedSegment)

    const body = {
      coordinates: mockSegment.coordinates,
      contractor: 'Updated Contractor',
      year: 1925,
      street: 'Park Street',
      block: '1400',
    }

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'PUT',
      body: JSON.stringify(body),
    })

    const response = await PUT(request, makeParams('seg-123'))

    expect(response.status).toBe(200)
    expect(updateSegment).toHaveBeenCalledWith('seg-123', expect.objectContaining({
      contractor: 'Updated Contractor',
    }))
  })

  it('should update segment when user is admin (not owner)', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'admin-789', email: 'admin@example.com', role: 'admin' }
    })

    ;(getSegmentById as jest.Mock).mockResolvedValue(mockSegment)
    ;(updateSegment as jest.Mock).mockResolvedValue(mockSegment)

    const body = {
      coordinates: mockSegment.coordinates,
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400',
    }

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'PUT',
      body: JSON.stringify(body),
    })

    const response = await PUT(request, makeParams('seg-123'))

    expect(response.status).toBe(200)
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'PUT',
      body: JSON.stringify({}),
    })

    const response = await PUT(request, makeParams('seg-123'))

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Authentication required')
  })

  it('should return 403 when user is neither owner nor admin', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'other-user', email: 'other@example.com', role: 'user' }
    })

    ;(getSegmentById as jest.Mock).mockResolvedValue(mockSegment)

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'PUT',
      body: JSON.stringify({
        coordinates: [[37.7652, -122.2416]],
        contractor: 'Test',
        year: 2020,
        street: 'Test St',
        block: '100',
      }),
    })

    const response = await PUT(request, makeParams('seg-123'))

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Not authorized to update this segment')
  })

  it('should return 404 when segment does not exist', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-456', email: 'test@example.com', role: 'user' }
    })

    ;(getSegmentById as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/segments/nonexistent', {
      method: 'PUT',
      body: JSON.stringify({
        coordinates: [[37.7652, -122.2416]],
        contractor: 'Test',
        year: 2020,
        street: 'Test St',
        block: '100',
      }),
    })

    const response = await PUT(request, makeParams('nonexistent'))

    expect(response.status).toBe(404)
  })

  it('should return 400 when missing required fields', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-456', email: 'test@example.com', role: 'user' }
    })

    ;(getSegmentById as jest.Mock).mockResolvedValue(mockSegment)

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'PUT',
      body: JSON.stringify({
        coordinates: [[37.7652, -122.2416]],
        // Missing contractor, year, street, block
      }),
    })

    const response = await PUT(request, makeParams('seg-123'))

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Missing required fields')
  })

  it('should return 404 when updateSegment returns null', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-456', email: 'test@example.com', role: 'user' }
    })

    ;(getSegmentById as jest.Mock).mockResolvedValue(mockSegment)
    ;(updateSegment as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'PUT',
      body: JSON.stringify({
        coordinates: [[37.7652, -122.2416]],
        contractor: 'Test',
        year: 2020,
        street: 'Test St',
        block: '100',
      }),
    })

    const response = await PUT(request, makeParams('seg-123'))

    expect(response.status).toBe(404)
  })

  it('should return 500 on database error', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-456', email: 'test@example.com', role: 'user' }
    })

    ;(getSegmentById as jest.Mock).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'PUT',
      body: JSON.stringify({
        coordinates: [[37.7652, -122.2416]],
        contractor: 'Test',
        year: 2020,
        street: 'Test St',
        block: '100',
      }),
    })

    const response = await PUT(request, makeParams('seg-123'))

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to update segment')
  })
})

describe('/api/segments/[id] DELETE', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should delete segment when user is admin', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'admin-789', email: 'admin@example.com', role: 'admin' }
    })

    ;(deleteSegment as jest.Mock).mockResolvedValue(true)

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'DELETE',
    })

    const response = await DELETE(request, makeParams('seg-123'))

    expect(response.status).toBe(200)
    expect(deleteSegment).toHaveBeenCalledWith('seg-123')
    const data = await response.json()
    expect(data.message).toBe('Segment deleted successfully')
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'DELETE',
    })

    const response = await DELETE(request, makeParams('seg-123'))

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Authentication required')
  })

  it('should return 403 when user is not admin', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-456', email: 'test@example.com', role: 'user' }
    })

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'DELETE',
    })

    const response = await DELETE(request, makeParams('seg-123'))

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Admin access required')
  })

  it('should return 404 when segment does not exist', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'admin-789', email: 'admin@example.com', role: 'admin' }
    })

    ;(deleteSegment as jest.Mock).mockResolvedValue(false)

    const request = new NextRequest('http://localhost:3000/api/segments/nonexistent', {
      method: 'DELETE',
    })

    const response = await DELETE(request, makeParams('nonexistent'))

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Segment not found')
  })

  it('should return 500 on database error', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'admin-789', email: 'admin@example.com', role: 'admin' }
    })

    ;(deleteSegment as jest.Mock).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost:3000/api/segments/seg-123', {
      method: 'DELETE',
    })

    const response = await DELETE(request, makeParams('seg-123'))

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to delete segment')
  })
})
