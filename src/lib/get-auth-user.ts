/**
 * Unified auth helper for API routes.
 * Works with both Auth.js (production) and dev auth (development).
 */

import { auth } from '@/auth'
import { getDevUser } from './dev-auth-api'

interface AuthUser {
  id: string
  email: string
  name?: string | null
  role: 'admin' | 'user'
}

/**
 * Get the authenticated user from the request.
 * In development, checks for dev auth header first.
 * In production, uses Auth.js session.
 */
export async function getAuthUser(request: Request): Promise<AuthUser | null> {
  // In development, check for dev auth header first
  if (process.env.NODE_ENV === 'development') {
    const devUser = getDevUser(request)
    if (devUser) {
      return devUser
    }
  }

  // Use Auth.js session
  const session = await auth()
  if (!session?.user) {
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email || '',
    name: session.user.name,
    role: session.user.role || 'user',
  }
}

/**
 * Check if user is authenticated.
 */
export async function requireAuth(request: Request): Promise<AuthUser> {
  const user = await getAuthUser(request)
  if (!user) {
    throw new AuthError('Authentication required', 401)
  }
  return user
}

/**
 * Check if user is an admin.
 */
export async function requireAdmin(request: Request): Promise<AuthUser> {
  const user = await requireAuth(request)
  if (user.role !== 'admin') {
    throw new AuthError('Admin access required', 403)
  }
  return user
}

/**
 * Custom error class for auth errors.
 */
export class AuthError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message)
    this.name = 'AuthError'
  }
}
