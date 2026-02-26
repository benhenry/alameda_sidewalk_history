import { POST } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('@/lib/database', () => ({
  resolveSegmentConflict: jest.fn(),
  acceptSegmentConflict: jest.fn(),
  deleteSegment: jest.fn(),
  getSegmentById: jest.fn(),
}))

import { resolveSegmentConflict, acceptSegmentConflict, deleteSegment } from '@/lib/database'

describe('/api/admin/conflicts/resolve POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ conflictId: 'c1', action: 'accept_overlap' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 403 when not admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ conflictId: 'c1', action: 'accept_overlap' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('should return 400 when conflictId or action missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 for invalid action', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ conflictId: 'c1', action: 'invalid_action' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid action')
  })

  it('should accept overlap', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
    ;(acceptSegmentConflict as jest.Mock).mockResolvedValue({ id: 'c1', status: 'accepted' })

    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ conflictId: 'c1', action: 'accept_overlap' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(acceptSegmentConflict).toHaveBeenCalledWith('c1', 'admin-1')
    const data = await response.json()
    expect(data.success).toBe(true)
  })

  it('should delete segment1', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
    ;(deleteSegment as jest.Mock).mockResolvedValue(true)
    ;(resolveSegmentConflict as jest.Mock).mockResolvedValue({ id: 'c1', status: 'resolved' })

    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ conflictId: 'c1', action: 'delete_segment1', segment1Id: 's1' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(deleteSegment).toHaveBeenCalledWith('s1')
    expect(resolveSegmentConflict).toHaveBeenCalledWith('c1', 'delete_segment1', 'admin-1')
  })

  it('should return 400 when segment1Id missing for delete_segment1', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ conflictId: 'c1', action: 'delete_segment1' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('segment1Id')
  })

  it('should delete segment2', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
    ;(deleteSegment as jest.Mock).mockResolvedValue(true)
    ;(resolveSegmentConflict as jest.Mock).mockResolvedValue({ id: 'c1', status: 'resolved' })

    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ conflictId: 'c1', action: 'delete_segment2', segment2Id: 's2' }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(deleteSegment).toHaveBeenCalledWith('s2')
  })

  it('should return 400 when segment2Id missing for delete_segment2', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } })
    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ conflictId: 'c1', action: 'delete_segment2' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 500 on error', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    ;(acceptSegmentConflict as jest.Mock).mockRejectedValue(new Error('DB error'))

    const request = new NextRequest('http://localhost/api/admin/conflicts/resolve', {
      method: 'POST',
      body: JSON.stringify({ conflictId: 'c1', action: 'accept_overlap' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(500)
  })
})
