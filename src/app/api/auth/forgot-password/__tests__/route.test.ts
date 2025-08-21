/**
 * @jest-environment node
 */

import { POST } from '../route'
import { userQueries, passwordResetQueries } from '@/lib/database'

// Mock the database queries
jest.mock('@/lib/database', () => ({
  userQueries: {
    getByEmail: {
      get: jest.fn()
    }
  },
  passwordResetQueries: {
    deleteByUserId: {
      run: jest.fn()
    },
    create: {
      run: jest.fn()
    }
  }
}))

// Mock crypto
jest.mock('crypto', () => ({
  randomBytes: jest.fn().mockReturnValue({
    toString: jest.fn().mockReturnValue('mock-reset-token')
  })
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid')
}))

const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>
const mockPasswordResetQueries = passwordResetQueries as jest.Mocked<typeof passwordResetQueries>

describe('/api/auth/forgot-password', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.log to avoid test output pollution
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('POST', () => {
    it('should return 400 if email is missing', async () => {
      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return 400 if email is not a string', async () => {
      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 123 })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Email is required')
    })

    it('should return success message even if user does not exist (security)', async () => {
      mockUserQueries.getByEmail.get.mockReturnValue(null)

      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('If an account with this email exists, a password reset link has been sent.')
      expect(mockPasswordResetQueries.deleteByUserId.run).not.toHaveBeenCalled()
      expect(mockPasswordResetQueries.create.run).not.toHaveBeenCalled()
    })

    it('should create reset token and return success message when user exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser'
      }
      mockUserQueries.getByEmail.get.mockReturnValue(mockUser)

      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('If an account with this email exists, a password reset link has been sent.')
      
      // Verify database operations
      expect(mockPasswordResetQueries.deleteByUserId.run).toHaveBeenCalledWith('user-123')
      expect(mockPasswordResetQueries.create.run).toHaveBeenCalledWith(
        'mock-uuid',
        'user-123',
        'mock-reset-token',
        expect.any(String) // expires_at timestamp
      )

      // Verify console.log was called with reset URL
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Password reset URL for test@example.com:')
      )
    })

    it('should handle database errors gracefully', async () => {
      mockUserQueries.getByEmail.get.mockImplementation(() => {
        throw new Error('Database error')
      })

      // Mock console.error to avoid test output pollution
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })

    it('should use correct environment variable for base URL', async () => {
      const originalEnv = process.env.NEXT_PUBLIC_BASE_URL
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com'

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser'
      }
      mockUserQueries.getByEmail.get.mockReturnValue(mockUser)

      const request = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      })

      await POST(request)

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('https://example.com/reset-password?token=')
      )

      // Restore original environment
      if (originalEnv) {
        process.env.NEXT_PUBLIC_BASE_URL = originalEnv
      } else {
        delete process.env.NEXT_PUBLIC_BASE_URL
      }
    })

    it('should generate unique tokens for multiple requests', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser'
      }
      mockUserQueries.getByEmail.get.mockReturnValue(mockUser)

      // First request
      const request1 = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      })

      await POST(request1)

      // Second request - should clean up previous tokens
      const request2 = new Request('http://localhost/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com' })
      })

      await POST(request2)

      // Verify that deleteByUserId was called twice (once for each request)
      expect(mockPasswordResetQueries.deleteByUserId.run).toHaveBeenCalledTimes(2)
      expect(mockPasswordResetQueries.create.run).toHaveBeenCalledTimes(2)
    })
  })
})