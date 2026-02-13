/**
 * Development-only auth helpers for API routes.
 * This file should never be used in production.
 */

import { cookies } from 'next/headers'

interface DevUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
}

const DEV_ADMIN: DevUser = {
  id: 'dev-admin-001',
  email: 'admin@dev.local',
  name: 'DevAdmin',
  role: 'admin',
}

const DEV_USER: DevUser = {
  id: 'dev-user-001',
  email: 'user@dev.local',
  name: 'DevUser',
  role: 'user',
}

/**
 * Get the dev user from the request headers (set by client-side dev auth).
 * Returns null if not in dev mode or no dev user is set.
 */
export function getDevUser(request: Request): DevUser | null {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  // Check for dev auth header
  const devUserHeader = request.headers.get('x-dev-user')

  if (devUserHeader === 'admin') {
    return DEV_ADMIN
  } else if (devUserHeader === 'user') {
    return DEV_USER
  }

  return null
}

/**
 * Create a mock session object for dev users.
 */
export function createDevSession(user: DevUser) {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      image: null,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }
}
