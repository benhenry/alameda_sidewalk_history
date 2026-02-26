import { GET, DELETE } from '../route'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('@/lib/perf-logger', () => ({
  getRecentSlowOps: jest.fn(),
  clearPerfLogs: jest.fn(),
}))

import { getRecentSlowOps, clearPerfLogs } from '@/lib/perf-logger'

describe('/api/admin/perf', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const response = await GET()
      expect(response.status).toBe(403)
    })

    it('should return 403 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)
      const response = await GET()
      expect(response.status).toBe(403)
    })

    it('should return slow operations with summary', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getRecentSlowOps as jest.Mock).mockReturnValue([
        { operation: 'getSegments', duration: 200, timestamp: Date.now() },
        { operation: 'getSegments', duration: 300, timestamp: Date.now() },
      ])

      const response = await GET()
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.count).toBe(2)
      expect(data.summary.totalOps).toBe(2)
      expect(data.summary.avgDuration).toBe(250)
      expect(data.summary.maxDuration).toBe(300)
      expect(data.summary.byOperation.getSegments.count).toBe(2)
    })

    it('should handle empty slow ops', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      ;(getRecentSlowOps as jest.Mock).mockReturnValue([])

      const response = await GET()
      const data = await response.json()

      expect(data.count).toBe(0)
      expect(data.summary.avgDuration).toBe(0)
      expect(data.summary.maxDuration).toBe(0)
    })

    it('should return 500 on error', async () => {
      mockAuth.mockRejectedValue(new Error('Auth error'))
      const response = await GET()
      expect(response.status).toBe(500)
    })
  })

  describe('DELETE', () => {
    it('should return 403 when not admin', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
      const response = await DELETE()
      expect(response.status).toBe(403)
    })

    it('should clear perf logs', async () => {
      mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
      const response = await DELETE()
      expect(response.status).toBe(200)
      expect(clearPerfLogs).toHaveBeenCalled()
      const data = await response.json()
      expect(data.message).toBe('Perf logs cleared')
    })

    it('should return 500 on error', async () => {
      mockAuth.mockRejectedValue(new Error('Auth error'))
      const response = await DELETE()
      expect(response.status).toBe(500)
    })
  })
})
