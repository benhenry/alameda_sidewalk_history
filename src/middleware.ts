import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit, generalLimiter, authLimiter, uploadLimiter, contributionLimiter } from '@/lib/rate-limiter'
import { detectBotBehavior } from '@/lib/captcha'

// Helper to add security headers to a response
function addSecurityHeaders(response: NextResponse) {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bot detection
  const botCheck = detectBotBehavior(request)
  if (botCheck.isBot) {
    console.log(`Bot detected: ${botCheck.reason} - IP: ${request.ip}`)
    return new NextResponse('Access denied', { status: 403 })
  }

  // Apply rate limiting based on endpoint
  let rateLimitResponse: Response | null = null

  if (pathname.startsWith('/api/auth/')) {
    rateLimitResponse = await withRateLimit(request, authLimiter)
  } else if (pathname.startsWith('/api/photos')) {
    rateLimitResponse = await withRateLimit(request, uploadLimiter)
  } else if (pathname.startsWith('/api/segments') && request.method !== 'GET') {
    rateLimitResponse = await withRateLimit(request, contributionLimiter)
  } else if (pathname.startsWith('/api/')) {
    rateLimitResponse = await withRateLimit(request, generalLimiter)
  }

  if (rateLimitResponse) {
    return rateLimitResponse
  }

  // Protect admin pages - check for Auth.js session cookie
  // Note: Actual session validation happens in the page/API route via auth()
  if (pathname.startsWith('/admin')) {
    // Check for Auth.js session cookie (authjs.session-token or __Secure-authjs.session-token)
    const sessionToken = request.cookies.get('authjs.session-token')?.value ||
                         request.cookies.get('__Secure-authjs.session-token')?.value

    if (!sessionToken) {
      // Redirect to main page with auth modal
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth', 'required')
      return addSecurityHeaders(NextResponse.redirect(url))
    }
    // Note: Role check (admin) is done in the admin page itself via auth()
  }

  // For API routes, just pass through with security headers
  // Authentication is handled by each route calling auth() directly
  // This allows Auth.js database sessions to work properly
  const response = NextResponse.next()
  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/segments/:path*',
    '/api/segments',
    '/api/segments/:path*',
    '/api/photos',
    '/api/photos/:path*',
    '/api/contractors',
    '/api/contractors/:path*'
  ]
}