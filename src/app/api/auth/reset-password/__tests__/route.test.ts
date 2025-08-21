/**
 * @jest-environment node
 */

import { POST, GET } from '../route'
import { userQueries, passwordResetQueries } from '@/lib/database'
import bcrypt from 'bcryptjs'

// Mock the database queries
jest.mock('@/lib/database', () => ({
  userQueries: {
    updatePassword: {
      run: jest.fn()
    }
  },
  passwordResetQueries: {
    getByToken: {
      get: jest.fn()
    },
    markAsUsed: {
      run: jest.fn()
    },
    deleteByUserId: {
      run: jest.fn()
    }
  }
}))

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password')
}))

const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>
const mockPasswordResetQueries = passwordResetQueries as jest.Mocked<typeof passwordResetQueries>
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>

describe('/api/auth/reset-password', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST', () => {
    it('should return 400 if token is missing', async () => {
      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'newpassword123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Reset token is required')
    })

    it('should return 400 if password is missing', async () => {
      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be at least 6 characters long')
    })

    it('should return 400 if password is too short', async () => {
      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token', password: '12345' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Password must be at least 6 characters long')
    })

    it('should return 400 if token is invalid or expired', async () => {
      mockPasswordResetQueries.getByToken.get.mockReturnValue(null)

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'invalid-token', password: 'newpassword123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid or expired reset token')
    })

    it('should successfully reset password with valid token', async () => {
      const mockResetToken = {
        id: 'reset-123',
        user_id: 'user-456',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        used_at: null,
        created_at: new Date().toISOString(),
        email: 'test@example.com',
        username: 'testuser'
      }
      mockPasswordResetQueries.getByToken.get.mockReturnValue(mockResetToken)

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token', password: 'newpassword123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Password has been successfully reset. You can now log in with your new password.')

      // Verify bcrypt was called with correct parameters
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 12)

      // Verify database operations
      expect(mockUserQueries.updatePassword.run).toHaveBeenCalledWith('hashed-password', 'user-456')
      expect(mockPasswordResetQueries.markAsUsed.run).toHaveBeenCalledWith('valid-token')
      expect(mockPasswordResetQueries.deleteByUserId.run).toHaveBeenCalledWith('user-456')
    })

    it('should handle bcrypt errors gracefully', async () => {
      const mockResetToken = {
        id: 'reset-123',
        user_id: 'user-456',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
        email: 'test@example.com',
        username: 'testuser'
      }
      mockPasswordResetQueries.getByToken.get.mockReturnValue(mockResetToken)
      mockBcrypt.hash.mockRejectedValue(new Error('Bcrypt error'))

      // Mock console.error to avoid test output pollution
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token', password: 'newpassword123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')

      jest.restoreAllMocks()
    })

    it('should handle database errors gracefully', async () => {
      mockPasswordResetQueries.getByToken.get.mockImplementation(() => {
        throw new Error('Database error')
      })

      // Mock console.error to avoid test output pollution
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const request = new Request('http://localhost/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: 'valid-token', password: 'newpassword123' })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')

      jest.restoreAllMocks()
    })
  })

  describe('GET', () => {
    it('should return 400 if token is missing', async () => {
      const request = new Request('http://localhost/api/auth/reset-password')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Reset token is required')
    })

    it('should return 400 if token is invalid or expired', async () => {
      mockPasswordResetQueries.getByToken.get.mockReturnValue(null)

      const request = new Request('http://localhost/api/auth/reset-password?token=invalid-token')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid or expired reset token')
    })

    it('should return token validity and email for valid token', async () => {
      const mockResetToken = {
        id: 'reset-123',
        user_id: 'user-456',
        token: 'valid-token',
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        used_at: null,
        created_at: new Date().toISOString(),
        email: 'test@example.com',
        username: 'testuser'
      }
      mockPasswordResetQueries.getByToken.get.mockReturnValue(mockResetToken)

      const request = new Request('http://localhost/api/auth/reset-password?token=valid-token')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.email).toBe('test@example.com')
    })

    it('should handle database errors gracefully in GET', async () => {
      mockPasswordResetQueries.getByToken.get.mockImplementation(() => {
        throw new Error('Database error')
      })

      // Mock console.error to avoid test output pollution
      jest.spyOn(console, 'error').mockImplementation(() => {})

      const request = new Request('http://localhost/api/auth/reset-password?token=valid-token')

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')

      jest.restoreAllMocks()
    })
  })
})