import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { withRateLimit, generalLimiter, authLimiter, uploadLimiter, contributionLimiter } from '@/lib/rate-limiter'
import { detectBotBehavior } from '@/lib/captcha'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Security headers for all responses
  const response = NextResponse.next()
  
  // Set security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

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

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('auth-token')?.value
    
    if (!token) {
      // Redirect to main page with auth modal
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('auth', 'required')
      const redirectResponse = NextResponse.redirect(url)
      // Apply security headers to redirect response
      redirectResponse.headers.set('X-Content-Type-Options', 'nosniff')
      redirectResponse.headers.set('X-Frame-Options', 'DENY')
      return redirectResponse
    }

    const user = verifyToken(token)
    if (!user || user.role !== 'admin') {
      // Redirect unauthorized users
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('error', 'unauthorized')
      const redirectResponse = NextResponse.redirect(url)
      // Apply security headers to redirect response
      redirectResponse.headers.set('X-Content-Type-Options', 'nosniff')
      redirectResponse.headers.set('X-Frame-Options', 'DENY')
      return redirectResponse
    }
  }

  // Protect API routes that require authentication (POST, PUT, DELETE only)
  if (pathname.startsWith('/api/') && 
      !pathname.startsWith('/api/auth/') &&
      request.method !== 'GET') {
    
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      const errorResponse = NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      )
      // Apply security headers
      errorResponse.headers.set('X-Content-Type-Options', 'nosniff')
      errorResponse.headers.set('X-Frame-Options', 'DENY')
      return errorResponse
    }

    const token = authHeader.substring(7)
    const user = verifyToken(token)
    if (!user) {
      const errorResponse = NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
      // Apply security headers
      errorResponse.headers.set('X-Content-Type-Options', 'nosniff')
      errorResponse.headers.set('X-Frame-Options', 'DENY')
      return errorResponse
    }

    // Add user info to headers for API routes to use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.id)
    requestHeaders.set('x-user-role', user.role)

    const nextResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
    
    // Apply security headers
    nextResponse.headers.set('X-Content-Type-Options', 'nosniff')
    nextResponse.headers.set('X-Frame-Options', 'DENY')
    nextResponse.headers.set('X-XSS-Protection', '1; mode=block')
    nextResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    nextResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    
    return nextResponse
  }

  // Apply security headers to all responses
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/((?!auth).)*'
  ]
}