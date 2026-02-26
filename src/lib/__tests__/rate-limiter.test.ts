import { contributionLimiter, authLimiter, withRateLimit } from '../rate-limiter'
import { NextRequest } from 'next/server'

// Mock NextRequest for testing
const createMockRequest = (ip: string, headers: Record<string, string> = {}): NextRequest => {
  return {
    headers: {
      get: (name: string) => {
        if (name === 'x-forwarded-for') return headers['x-forwarded-for'] || ip
        if (name === 'x-real-ip') return headers['x-real-ip'] || ip
        return headers[name] || null
      }
    },
    ip
  } as unknown as NextRequest
}

describe('rate-limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // Clear the rate limiter stores between tests
    ;(contributionLimiter as any).store.clear()
    ;(authLimiter as any).store.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('contribution rate limiter', () => {
    it('should allow requests within limit', async () => {
      const req = createMockRequest('192.168.10.1')
      
      const result1 = await contributionLimiter.isAllowed(req)
      const result2 = await contributionLimiter.isAllowed(req)
      const result3 = await contributionLimiter.isAllowed(req)

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result3.allowed).toBe(true)
    })

    it('should block requests exceeding limit', async () => {
      const req = createMockRequest('192.168.10.2')

      // Make 20 requests (the limit)
      for (let i = 0; i < 20; i++) {
        const result = await contributionLimiter.isAllowed(req)
        expect(result.allowed).toBe(true)
      }

      // 21st request should be blocked
      const blockedResult = await contributionLimiter.isAllowed(req)
      expect(blockedResult.allowed).toBe(false)
      expect(blockedResult.remaining).toBe(0)
    })

    it('should reset after time window', async () => {
      const req = createMockRequest('192.168.10.3')

      // Exhaust the limit
      for (let i = 0; i < 20; i++) {
        await contributionLimiter.isAllowed(req)
      }

      // Should be blocked
      const blockedResult = await contributionLimiter.isAllowed(req)
      expect(blockedResult.allowed).toBe(false)

      // Advance time by 1 hour (past the window)
      jest.advanceTimersByTime(60 * 60 * 1000 + 1000)

      // Should now be allowed again
      const allowedResult = await contributionLimiter.isAllowed(req)
      expect(allowedResult.allowed).toBe(true)
    })

    it('should handle different IPs separately', async () => {
      const req1 = createMockRequest('192.168.10.4')
      const req2 = createMockRequest('192.168.10.5')

      // Exhaust limit for first IP
      for (let i = 0; i < 20; i++) {
        await contributionLimiter.isAllowed(req1)
      }

      // First IP should be blocked
      const ip1Result = await contributionLimiter.isAllowed(req1)
      expect(ip1Result.allowed).toBe(false)

      // Second IP should still be allowed
      const ip2Result = await contributionLimiter.isAllowed(req2)
      expect(ip2Result.allowed).toBe(true)
    })
  })

  describe('auth rate limiter', () => {
    it('should allow auth requests within limit', async () => {
      const req = createMockRequest('192.168.20.1')
      
      const result1 = await authLimiter.isAllowed(req)
      const result2 = await authLimiter.isAllowed(req)
      const result3 = await authLimiter.isAllowed(req)

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result3.allowed).toBe(true)
    })

    it('should block auth requests exceeding limit', async () => {
      const req = createMockRequest('192.168.20.2')

      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        const result = await authLimiter.isAllowed(req)
        expect(result.allowed).toBe(true)
      }

      // 6th request should be blocked
      const blockedResult = await authLimiter.isAllowed(req)
      expect(blockedResult.allowed).toBe(false)
      expect(blockedResult.remaining).toBe(0)
    })

    it('should reset auth limits after time window', async () => {
      const req = createMockRequest('192.168.20.3')

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await authLimiter.isAllowed(req)
      }

      // Should be blocked
      const blockedResult = await authLimiter.isAllowed(req)
      expect(blockedResult.allowed).toBe(false)

      // Advance time by 15 minutes (past the window)
      jest.advanceTimersByTime(15 * 60 * 1000 + 1000)

      // Should now be allowed again
      const allowedResult = await authLimiter.isAllowed(req)
      expect(allowedResult.allowed).toBe(true)
    })
  })

  describe('withRateLimit helper', () => {
    it('should return null for allowed requests', async () => {
      const req = createMockRequest('192.168.30.1')
      const response = await withRateLimit(req, authLimiter)
      expect(response).toBeNull()
    })

    it('should return 429 response for blocked requests', async () => {
      const req = createMockRequest('192.168.30.2')

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await authLimiter.isAllowed(req)
      }

      const response = await withRateLimit(req, authLimiter)
      expect(response).not.toBeNull()
      expect(response?.status).toBe(429)

      const body = await response!.json()
      expect(body.error).toContain('Too many requests')
      expect(body.retryAfter).toBeGreaterThan(0)
    })
  })

  describe('cleanup and edge cases', () => {
    it('should cleanup expired entries', async () => {
      const req = createMockRequest('192.168.40.1')
      await contributionLimiter.isAllowed(req)

      // The store should have an entry
      expect((contributionLimiter as any).store.size).toBe(1)

      // Advance time past the window so the entry is expired
      jest.advanceTimersByTime(60 * 60 * 1000 + 1000)

      // Manually trigger cleanup (the setInterval was registered at module load
      // before fake timers, so we call cleanup directly)
      ;(contributionLimiter as any).cleanup()

      // After cleanup, the expired entry should be removed
      expect((contributionLimiter as any).store.size).toBe(0)
    })

    it('should use x-real-ip when x-forwarded-for is not set', async () => {
      const req = createMockRequest('', { 'x-real-ip': '10.0.0.1' })
      // Remove x-forwarded-for by making get() return null for it
      const origGet = req.headers.get.bind(req.headers)
      ;(req.headers as any).get = (name: string) => {
        if (name === 'x-forwarded-for') return null
        return origGet(name)
      }

      const result = await authLimiter.isAllowed(req)
      expect(result.allowed).toBe(true)
    })
  })
})