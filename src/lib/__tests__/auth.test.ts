import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  isValidEmail,
  isValidPassword,
  isValidUsername
} from '../auth'

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}))

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
}))

describe('Auth utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash password with bcrypt', async () => {
      const bcrypt = require('bcryptjs')
      bcrypt.hash.mockResolvedValue('hashed-password')

      const result = await hashPassword('test-password')

      expect(bcrypt.hash).toHaveBeenCalledWith('test-password', 12)
      expect(result).toBe('hashed-password')
    })
  })

  describe('verifyPassword', () => {
    it('should verify password with bcrypt', async () => {
      const bcrypt = require('bcryptjs')
      bcrypt.compare.mockResolvedValue(true)

      const result = await verifyPassword('test-password', 'hashed-password')

      expect(bcrypt.compare).toHaveBeenCalledWith('test-password', 'hashed-password')
      expect(result).toBe(true)
    })

    it('should return false for incorrect password', async () => {
      const bcrypt = require('bcryptjs')
      bcrypt.compare.mockResolvedValue(false)

      const result = await verifyPassword('wrong-password', 'hashed-password')

      expect(result).toBe(false)
    })
  })

  describe('generateToken', () => {
    it('should generate JWT token', () => {
      const jwt = require('jsonwebtoken')
      jwt.sign.mockReturnValue('jwt-token')

      const user = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user' as const
      }

      const result = generateToken(user)

      expect(jwt.sign).toHaveBeenCalledWith(
        user,
        expect.any(String),
        { expiresIn: '7d' }
      )
      expect(result).toBe('jwt-token')
    })
  })

  describe('verifyToken', () => {
    it('should verify valid JWT token', () => {
      const jwt = require('jsonwebtoken')
      const mockDecoded = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user'
      }
      jwt.verify.mockReturnValue(mockDecoded)

      const result = verifyToken('valid-token')

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String))
      expect(result).toEqual(mockDecoded)
    })

    it('should return null for invalid token', () => {
      const jwt = require('jsonwebtoken')
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = verifyToken('invalid-token')

      expect(result).toBeNull()
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name+tag@domain.co.uk')).toBe(true)
      expect(isValidEmail('user123@test-domain.org')).toBe(true)
    })

    it('should reject invalid email formats', () => {
      expect(isValidEmail('invalid-email')).toBe(false)
      expect(isValidEmail('@domain.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user@domain')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('isValidPassword', () => {
    it('should validate strong passwords', () => {
      const result = isValidPassword('StrongPass123')
      expect(result.valid).toBe(true)
      expect(result.message).toBeUndefined()
    })

    it('should reject passwords that are too short', () => {
      const result = isValidPassword('Short1')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Password must be at least 8 characters long')
    })

    it('should reject passwords without lowercase letters', () => {
      const result = isValidPassword('PASSWORD123')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Password must contain at least one lowercase letter')
    })

    it('should reject passwords without uppercase letters', () => {
      const result = isValidPassword('password123')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Password must contain at least one uppercase letter')
    })

    it('should reject passwords without numbers', () => {
      const result = isValidPassword('StrongPassword')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Password must contain at least one number')
    })
  })

  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      expect(isValidUsername('testuser').valid).toBe(true)
      expect(isValidUsername('user123').valid).toBe(true)
      expect(isValidUsername('user_name').valid).toBe(true)
      expect(isValidUsername('user-name').valid).toBe(true)
    })

    it('should reject usernames that are too short', () => {
      const result = isValidUsername('ab')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Username must be at least 3 characters long')
    })

    it('should reject usernames that are too long', () => {
      const result = isValidUsername('a'.repeat(31))
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Username must be no more than 30 characters long')
    })

    it('should reject usernames with invalid characters', () => {
      const result = isValidUsername('user@name')
      expect(result.valid).toBe(false)
      expect(result.message).toBe('Username can only contain letters, numbers, underscores, and hyphens')
    })
  })
})