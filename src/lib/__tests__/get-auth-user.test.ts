// Mock @/auth before importing
const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

// Mock dev-auth-api
const mockGetDevUser = jest.fn()
jest.mock('../dev-auth-api', () => ({
  getDevUser: (...args: any[]) => mockGetDevUser(...args),
}))

import { getAuthUser, requireAuth, requireAdmin, AuthError } from '../get-auth-user'

describe('get-auth-user', () => {
  const originalNodeEnv = process.env.NODE_ENV

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset NODE_ENV to test (non-development)
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true })
  })

  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true })
  })

  describe('getAuthUser', () => {
    it('should return user from Auth.js session', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
        }
      })

      const request = new Request('http://localhost:3000/api/test')
      const user = await getAuthUser(request)

      expect(user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        username: 'Test User',
        role: 'user',
      })
    })

    it('should return null when no session exists', async () => {
      mockAuth.mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/test')
      const user = await getAuthUser(request)

      expect(user).toBeNull()
    })

    it('should return null when session has no user', async () => {
      mockAuth.mockResolvedValue({ user: null })

      const request = new Request('http://localhost:3000/api/test')
      const user = await getAuthUser(request)

      expect(user).toBeNull()
    })

    it('should derive username from email when name is missing', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: null,
          role: 'user',
        }
      })

      const request = new Request('http://localhost:3000/api/test')
      const user = await getAuthUser(request)

      expect(user?.username).toBe('test')
    })

    it('should default role to user when not specified', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test',
        }
      })

      const request = new Request('http://localhost:3000/api/test')
      const user = await getAuthUser(request)

      expect(user?.role).toBe('user')
    })

    it('should handle admin role from session', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
        }
      })

      const request = new Request('http://localhost:3000/api/test')
      const user = await getAuthUser(request)

      expect(user?.role).toBe('admin')
    })

    it('should check dev user in development mode', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })

      const devUser = {
        id: 'dev-admin-001',
        email: 'admin@dev.local',
        name: 'DevAdmin',
        role: 'admin' as const,
      }
      mockGetDevUser.mockReturnValue(devUser)

      const request = new Request('http://localhost:3000/api/test')
      const user = await getAuthUser(request)

      expect(user).toEqual(devUser)
      expect(mockAuth).not.toHaveBeenCalled()
    })

    it('should fall back to Auth.js when dev user returns null in development', async () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
      mockGetDevUser.mockReturnValue(null)
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test',
          role: 'user',
        }
      })

      const request = new Request('http://localhost:3000/api/test')
      const user = await getAuthUser(request)

      expect(user?.id).toBe('user-123')
    })
  })

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test',
          role: 'user',
        }
      })

      const request = new Request('http://localhost:3000/api/test')
      const user = await requireAuth(request)

      expect(user.id).toBe('user-123')
    })

    it('should throw AuthError with 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/test')

      await expect(requireAuth(request)).rejects.toThrow('Authentication required')
      await expect(requireAuth(request)).rejects.toMatchObject({
        statusCode: 401,
        name: 'AuthError',
      })
    })
  })

  describe('requireAdmin', () => {
    it('should return user when admin', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          name: 'Admin',
          role: 'admin',
        }
      })

      const request = new Request('http://localhost:3000/api/test')
      const user = await requireAdmin(request)

      expect(user.role).toBe('admin')
    })

    it('should throw AuthError with 403 when not admin', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test',
          role: 'user',
        }
      })

      const request = new Request('http://localhost:3000/api/test')

      await expect(requireAdmin(request)).rejects.toThrow('Admin access required')
      await expect(requireAdmin(request)).rejects.toMatchObject({
        statusCode: 403,
        name: 'AuthError',
      })
    })

    it('should throw AuthError with 401 when not authenticated at all', async () => {
      mockAuth.mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/test')

      await expect(requireAdmin(request)).rejects.toThrow('Authentication required')
      await expect(requireAdmin(request)).rejects.toMatchObject({
        statusCode: 401,
      })
    })
  })

  describe('AuthError', () => {
    it('should have correct name and statusCode', () => {
      const error = new AuthError('test error', 403)

      expect(error.name).toBe('AuthError')
      expect(error.message).toBe('test error')
      expect(error.statusCode).toBe(403)
      expect(error instanceof Error).toBe(true)
    })
  })
})
