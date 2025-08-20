import { NextRequest } from 'next/server'

interface RateLimitOptions {
  windowMs: number // time window in milliseconds
  maxRequests: number // max requests per window
  keyGenerator?: (req: NextRequest) => string
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>()
  private options: RateLimitOptions

  constructor(options: RateLimitOptions) {
    this.options = options
    
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key)
      }
    }
  }

  private getKey(req: NextRequest): string {
    if (this.options.keyGenerator) {
      return this.options.keyGenerator(req)
    }

    // Get IP from various headers (accounting for proxies)
    const forwarded = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0] || realIp || req.ip || 'unknown'
    
    return `rate_limit:${ip}`
  }

  async isAllowed(req: NextRequest): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = this.getKey(req)
    const now = Date.now()
    const resetTime = now + this.options.windowMs

    let entry = this.store.get(key)

    if (!entry || now > entry.resetTime) {
      // New window or expired entry
      entry = { count: 1, resetTime }
      this.store.set(key, entry)
      return { allowed: true, remaining: this.options.maxRequests - 1, resetTime }
    }

    entry.count++
    const remaining = Math.max(0, this.options.maxRequests - entry.count)
    const allowed = entry.count <= this.options.maxRequests

    return { allowed, remaining, resetTime: entry.resetTime }
  }
}

// Different rate limiters for different endpoints
export const generalLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100 // 100 requests per 15 minutes per IP
})

export const authLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  maxRequests: 5 // 5 auth attempts per 15 minutes per IP
})

export const uploadLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10 // 10 uploads per hour per IP
})

export const contributionLimiter = new RateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 20 // 20 contributions per hour per IP
})

export async function withRateLimit(
  req: NextRequest, 
  limiter: RateLimiter
): Promise<Response | null> {
  const { allowed, remaining, resetTime } = await limiter.isAllowed(req)

  if (!allowed) {
    return new Response(
      JSON.stringify({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
      }),
      { 
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': remaining.toString()
        }
      }
    )
  }

  return null
}