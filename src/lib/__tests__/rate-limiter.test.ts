import { rateLimiter } from '../rate-limiter'

describe('rate-limiter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('contributions rate limiter', () => {
    it('should allow requests within limit', () => {
      const result1 = rateLimiter.contributions.check('user1', '192.168.1.1')
      const result2 = rateLimiter.contributions.check('user1', '192.168.1.1')
      const result3 = rateLimiter.contributions.check('user1', '192.168.1.1')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result3.success).toBe(true)
    })

    it('should block requests exceeding limit', () => {
      const userId = 'user1'
      const ip = '192.168.1.1'

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        const result = rateLimiter.contributions.check(userId, ip)
        expect(result.success).toBe(true)
      }

      // 11th request should be blocked
      const blockedResult = rateLimiter.contributions.check(userId, ip)
      expect(blockedResult.success).toBe(false)
      expect(blockedResult.retryAfter).toBeDefined()
    })

    it('should reset after time window', () => {
      const userId = 'user1'
      const ip = '192.168.1.1'

      // Exhaust the limit
      for (let i = 0; i < 10; i++) {
        rateLimiter.contributions.check(userId, ip)
      }

      // Should be blocked
      const blockedResult = rateLimiter.contributions.check(userId, ip)
      expect(blockedResult.success).toBe(false)

      // Advance time by 1 hour (past the window)
      jest.advanceTimersByTime(60 * 60 * 1000 + 1000)

      // Should now be allowed again
      const allowedResult = rateLimiter.contributions.check(userId, ip)
      expect(allowedResult.success).toBe(true)
    })

    it('should handle different users separately', () => {
      const ip = '192.168.1.1'

      // Exhaust limit for user1
      for (let i = 0; i < 10; i++) {
        rateLimiter.contributions.check('user1', ip)
      }

      // user1 should be blocked
      const user1Result = rateLimiter.contributions.check('user1', ip)
      expect(user1Result.success).toBe(false)

      // user2 should still be allowed
      const user2Result = rateLimiter.contributions.check('user2', ip)
      expect(user2Result.success).toBe(true)
    })

    it('should handle different IPs separately', () => {
      const userId = 'user1'

      // Exhaust limit for first IP
      for (let i = 0; i < 10; i++) {
        rateLimiter.contributions.check(userId, '192.168.1.1')
      }

      // First IP should be blocked
      const ip1Result = rateLimiter.contributions.check(userId, '192.168.1.1')
      expect(ip1Result.success).toBe(false)

      // Second IP should still be allowed
      const ip2Result = rateLimiter.contributions.check(userId, '192.168.1.2')
      expect(ip2Result.success).toBe(true)
    })

    it('should clean up old entries', () => {
      const userId = 'user1'
      const ip = '192.168.1.1'

      // Make some requests
      rateLimiter.contributions.check(userId, ip)

      // Advance time past cleanup threshold
      jest.advanceTimersByTime(2 * 60 * 60 * 1000) // 2 hours

      // Make another request, which should trigger cleanup
      const result = rateLimiter.contributions.check(userId, ip)
      expect(result.success).toBe(true)
    })
  })

  describe('auth rate limiter', () => {
    it('should allow auth requests within limit', () => {
      const result1 = rateLimiter.auth.check('192.168.1.1')
      const result2 = rateLimiter.auth.check('192.168.1.1')
      const result3 = rateLimiter.auth.check('192.168.1.1')

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result3.success).toBe(true)
    })

    it('should block auth requests exceeding limit', () => {
      const ip = '192.168.1.1'

      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        const result = rateLimiter.auth.check(ip)
        expect(result.success).toBe(true)
      }

      // 6th request should be blocked
      const blockedResult = rateLimiter.auth.check(ip)
      expect(blockedResult.success).toBe(false)
      expect(blockedResult.retryAfter).toBeDefined()
    })

    it('should reset auth limits after time window', () => {
      const ip = '192.168.1.1'

      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        rateLimiter.auth.check(ip)
      }

      // Should be blocked
      const blockedResult = rateLimiter.auth.check(ip)
      expect(blockedResult.success).toBe(false)

      // Advance time by 15 minutes (past the window)
      jest.advanceTimersByTime(15 * 60 * 1000 + 1000)

      // Should now be allowed again
      const allowedResult = rateLimiter.auth.check(ip)
      expect(allowedResult.success).toBe(true)
    })
  })
})