import { NextRequest, NextResponse } from 'next/server'

// Mock rate-limiter
jest.mock('@/lib/rate-limiter', () => ({
  withRateLimit: jest.fn(),
  generalLimiter: { id: 'general' },
  authLimiter: { id: 'auth' },
  uploadLimiter: { id: 'upload' },
  contributionLimiter: { id: 'contribution' },
}))

// Mock captcha
jest.mock('@/lib/captcha', () => ({
  detectBotBehavior: jest.fn(),
}))

import { middleware } from '../middleware'
import { withRateLimit } from '@/lib/rate-limiter'
import { detectBotBehavior } from '@/lib/captcha'

describe('middleware', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset default mocks
    ;(detectBotBehavior as jest.Mock).mockReturnValue({ isBot: false })
    ;(withRateLimit as jest.Mock).mockResolvedValue(null)
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
  })

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true })
  })

  it('should add security headers to all responses', async () => {
    const request = new NextRequest('http://localhost/api/segments')
    const response = await middleware(request)

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=()')
  })

  it('should block bots in production', async () => {
    ;(detectBotBehavior as jest.Mock).mockReturnValue({ isBot: true, reason: 'automated request' })

    const request = new NextRequest('http://localhost/api/segments')
    const response = await middleware(request)

    expect(response.status).toBe(403)
  })

  it('should skip bot detection in development', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
    ;(detectBotBehavior as jest.Mock).mockReturnValue({ isBot: true, reason: 'automated request' })

    const request = new NextRequest('http://localhost/api/segments')
    const response = await middleware(request)

    expect(response.status).not.toBe(403)
  })

  it('should apply auth rate limiter to auth endpoints', async () => {
    const request = new NextRequest('http://localhost/api/auth/signin')
    await middleware(request)

    expect(withRateLimit).toHaveBeenCalled()
  })

  it('should apply upload rate limiter to photo endpoints', async () => {
    const request = new NextRequest('http://localhost/api/photos')
    await middleware(request)

    expect(withRateLimit).toHaveBeenCalled()
  })

  it('should apply contribution limiter to non-GET segment requests', async () => {
    const request = new NextRequest('http://localhost/api/segments', { method: 'POST' })
    await middleware(request)

    expect(withRateLimit).toHaveBeenCalled()
  })

  it('should return rate limit response when rate limited', async () => {
    ;(withRateLimit as jest.Mock).mockResolvedValue(
      new Response('Too many requests', { status: 429 })
    )

    const request = new NextRequest('http://localhost/api/auth/signin')
    const response = await middleware(request)

    expect(response.status).toBe(429)
  })

  it('should redirect to home when accessing admin without session cookie', async () => {
    const request = new NextRequest('http://localhost/admin')
    const response = await middleware(request)

    expect(response.status).toBe(307) // redirect
  })

  it('should allow admin access in development mode', async () => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })

    const request = new NextRequest('http://localhost/admin')
    const response = await middleware(request)

    expect(response.status).not.toBe(307)
  })
})
