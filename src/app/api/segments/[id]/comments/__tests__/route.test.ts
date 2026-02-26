import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/database', () => ({
  getSegmentComments: jest.fn(),
  createSegmentComment: jest.fn(),
}))

jest.mock('@/lib/get-auth-user', () => ({
  getAuthUser: jest.fn(),
}))

jest.mock('@/lib/validation', () => ({
  sanitizeHtml: jest.fn((html: string) => html),
}))

import { getSegmentComments, createSegmentComment } from '@/lib/database'
import { getAuthUser } from '@/lib/get-auth-user'

describe('/api/segments/[id]/comments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return comments organized into threads', async () => {
      const mockComments = [
        { id: 'c1', content: 'Main comment', parent_id: null, userId: 'u1' },
        { id: 'c2', content: 'Reply to c1', parent_id: 'c1', userId: 'u2' },
        { id: 'c3', content: 'Another main', parent_id: null, userId: 'u1' },
      ]
      ;(getSegmentComments as jest.Mock).mockResolvedValue(mockComments)

      const request = new NextRequest('http://localhost/api/segments/seg-1/comments')
      const response = await GET(request, { params: { id: 'seg-1' } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.count).toBe(3)
      expect(data.comments).toHaveLength(2) // 2 top-level threads
      expect(data.comments[0].replies).toHaveLength(1)
      expect(data.comments[1].replies).toHaveLength(0)
    })

    it('should return empty comments', async () => {
      ;(getSegmentComments as jest.Mock).mockResolvedValue([])
      const request = new NextRequest('http://localhost/api/segments/seg-1/comments')
      const response = await GET(request, { params: { id: 'seg-1' } })

      const data = await response.json()
      expect(data.comments).toHaveLength(0)
      expect(data.count).toBe(0)
    })

    it('should return 500 on database error', async () => {
      ;(getSegmentComments as jest.Mock).mockRejectedValue(new Error('DB error'))
      const request = new NextRequest('http://localhost/api/segments/seg-1/comments')
      const response = await GET(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(500)
    })
  })

  describe('POST', () => {
    it('should return 401 when not authenticated', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue(null)
      const request = new NextRequest('http://localhost/api/segments/seg-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'A comment' }),
      })
      const response = await POST(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(401)
    })

    it('should return 400 when content is empty', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue({ id: 'u1', username: 'user1' })
      const request = new NextRequest('http://localhost/api/segments/seg-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: '' }),
      })
      const response = await POST(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(400)
    })

    it('should return 400 when content exceeds 2000 characters', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue({ id: 'u1', username: 'user1' })
      const request = new NextRequest('http://localhost/api/segments/seg-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'x'.repeat(2001) }),
      })
      const response = await POST(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('2000')
    })

    it('should create comment successfully', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue({ id: 'u1', username: 'user1' })
      const mockComment = { id: 'c1', content: 'A comment', userId: 'u1' }
      ;(createSegmentComment as jest.Mock).mockResolvedValue(mockComment)

      const request = new NextRequest('http://localhost/api/segments/seg-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'A comment' }),
      })
      const response = await POST(request, { params: { id: 'seg-1' } })

      expect(response.status).toBe(201)
      expect(createSegmentComment).toHaveBeenCalledWith({
        segmentId: 'seg-1',
        userId: 'u1',
        username: 'user1',
        content: 'A comment',
        parentId: null,
      })
    })

    it('should create reply comment with parentId', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue({ id: 'u1', username: 'user1' })
      ;(createSegmentComment as jest.Mock).mockResolvedValue({ id: 'c2' })

      const request = new NextRequest('http://localhost/api/segments/seg-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'A reply', parentId: 'c1' }),
      })
      const response = await POST(request, { params: { id: 'seg-1' } })

      expect(response.status).toBe(201)
      expect(createSegmentComment).toHaveBeenCalledWith(
        expect.objectContaining({ parentId: 'c1' })
      )
    })

    it('should return 500 on database error', async () => {
      ;(getAuthUser as jest.Mock).mockResolvedValue({ id: 'u1', username: 'user1' })
      ;(createSegmentComment as jest.Mock).mockRejectedValue(new Error('DB error'))

      const request = new NextRequest('http://localhost/api/segments/seg-1/comments', {
        method: 'POST',
        body: JSON.stringify({ content: 'A comment' }),
      })
      const response = await POST(request, { params: { id: 'seg-1' } })
      expect(response.status).toBe(500)
    })
  })
})
