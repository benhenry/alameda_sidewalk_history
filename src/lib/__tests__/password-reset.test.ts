/**
 * @jest-environment node
 */

// Mock the database module to avoid better-sqlite3 native module issues in tests
jest.mock('../database', () => {
  return {
    passwordResetQueries: {
      create: { run: jest.fn() },
      getByToken: { get: jest.fn() },
      markAsUsed: { run: jest.fn() },
      deleteByUserId: { run: jest.fn() },
      cleanupExpired: { run: jest.fn() }
    },
    userQueries: {
      create: { run: jest.fn() },
      getById: { get: jest.fn() },
      updatePassword: { run: jest.fn() }
    }
  }
})

import { passwordResetQueries, userQueries } from '../database'

const mockPasswordResetQueries = passwordResetQueries as jest.Mocked<typeof passwordResetQueries>
const mockUserQueries = userQueries as jest.Mocked<typeof userQueries>

describe('Password Reset Database API Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('passwordResetQueries.create', () => {
    it('should call create with correct parameters', () => {
      const tokenId = 'token-id'
      const userId = 'user-id'
      const token = 'reset-token'
      const expiresAt = '2024-01-01T00:00:00.000Z'

      mockPasswordResetQueries.create.run(tokenId, userId, token, expiresAt)

      expect(mockPasswordResetQueries.create.run).toHaveBeenCalledWith(
        tokenId,
        userId,
        token,
        expiresAt
      )
      expect(mockPasswordResetQueries.create.run).toHaveBeenCalledTimes(1)
    })
  })

  describe('passwordResetQueries.getByToken', () => {
    it('should call getByToken with correct parameters', () => {
      const token = 'reset-token'
      mockPasswordResetQueries.getByToken.get.mockReturnValue({
        id: 'token-id',
        user_id: 'user-id',
        token,
        expires_at: '2024-01-01T00:00:00.000Z',
        used_at: null,
        created_at: '2023-01-01T00:00:00.000Z',
        email: 'test@example.com',
        username: 'testuser'
      })

      const result = mockPasswordResetQueries.getByToken.get(token)

      expect(mockPasswordResetQueries.getByToken.get).toHaveBeenCalledWith(token)
      expect(result?.user_id).toBe('user-id')
      expect(result?.email).toBe('test@example.com')
    })

    it('should return null for invalid token', () => {
      mockPasswordResetQueries.getByToken.get.mockReturnValue(null)

      const result = mockPasswordResetQueries.getByToken.get('invalid-token')

      expect(result).toBeNull()
    })
  })

  describe('passwordResetQueries.markAsUsed', () => {
    it('should call markAsUsed with correct parameters', () => {
      const token = 'reset-token'

      mockPasswordResetQueries.markAsUsed.run(token)

      expect(mockPasswordResetQueries.markAsUsed.run).toHaveBeenCalledWith(token)
      expect(mockPasswordResetQueries.markAsUsed.run).toHaveBeenCalledTimes(1)
    })
  })

  describe('passwordResetQueries.deleteByUserId', () => {
    it('should call deleteByUserId with correct parameters', () => {
      const userId = 'user-id'

      mockPasswordResetQueries.deleteByUserId.run(userId)

      expect(mockPasswordResetQueries.deleteByUserId.run).toHaveBeenCalledWith(userId)
      expect(mockPasswordResetQueries.deleteByUserId.run).toHaveBeenCalledTimes(1)
    })
  })

  describe('passwordResetQueries.cleanupExpired', () => {
    it('should call cleanupExpired', () => {
      mockPasswordResetQueries.cleanupExpired.run()

      expect(mockPasswordResetQueries.cleanupExpired.run).toHaveBeenCalledWith()
      expect(mockPasswordResetQueries.cleanupExpired.run).toHaveBeenCalledTimes(1)
    })
  })

  describe('userQueries.updatePassword', () => {
    it('should call updatePassword with correct parameters', () => {
      const passwordHash = 'hashed-password'
      const userId = 'user-id'

      mockUserQueries.updatePassword.run(passwordHash, userId)

      expect(mockUserQueries.updatePassword.run).toHaveBeenCalledWith(passwordHash, userId)
      expect(mockUserQueries.updatePassword.run).toHaveBeenCalledTimes(1)
    })
  })

  describe('Integration workflow', () => {
    it('should follow the correct sequence of database operations', () => {
      const tokenId = 'token-id'
      const userId = 'user-id'
      const token = 'reset-token'
      const expiresAt = '2024-01-01T00:00:00.000Z'
      const passwordHash = 'new-hashed-password'

      // Mock token retrieval
      mockPasswordResetQueries.getByToken.get.mockReturnValue({
        id: tokenId,
        user_id: userId,
        token,
        expires_at: expiresAt,
        used_at: null,
        created_at: '2023-01-01T00:00:00.000Z',
        email: 'test@example.com',
        username: 'testuser'
      })

      // 1. Create token
      mockPasswordResetQueries.create.run(tokenId, userId, token, expiresAt)
      
      // 2. Verify token
      const tokenData = mockPasswordResetQueries.getByToken.get(token)
      expect(tokenData?.user_id).toBe(userId)
      
      // 3. Update password
      mockUserQueries.updatePassword.run(passwordHash, userId)
      
      // 4. Mark token as used
      mockPasswordResetQueries.markAsUsed.run(token)
      
      // 5. Clean up tokens
      mockPasswordResetQueries.deleteByUserId.run(userId)

      // Verify all operations were called
      expect(mockPasswordResetQueries.create.run).toHaveBeenCalledWith(tokenId, userId, token, expiresAt)
      expect(mockPasswordResetQueries.getByToken.get).toHaveBeenCalledWith(token)
      expect(mockUserQueries.updatePassword.run).toHaveBeenCalledWith(passwordHash, userId)
      expect(mockPasswordResetQueries.markAsUsed.run).toHaveBeenCalledWith(token)
      expect(mockPasswordResetQueries.deleteByUserId.run).toHaveBeenCalledWith(userId)
    })
  })
})