import { validateField, validationRules } from '../validation'

describe('validation utilities', () => {
  describe('validateField', () => {
    it('should validate email field correctly', () => {
      const validResult = validateField('email', 'test@example.com')
      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      const invalidResult = validateField('email', 'invalid-email')
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors.length).toBeGreaterThan(0)
    })

    it('should validate password field correctly', () => {
      const validResult = validateField('password', 'SecurePass123')
      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      const invalidResult = validateField('password', '123')
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors).toContain('password must be at least 8 characters')
    })

    it('should validate contractor field correctly', () => {
      const validResult = validateField('contractor', 'Smith Construction Co.')
      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      const invalidResult = validateField('contractor', 'A'.repeat(101))
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors).toContain('contractor must be no more than 100 characters')
    })

    it('should validate year field correctly', () => {
      const validResult = validateField('year', 1925)
      expect(validResult.isValid).toBe(true)
      expect(validResult.errors).toHaveLength(0)

      const invalidResult = validateField('year', 1800)
      expect(invalidResult.isValid).toBe(false)
      expect(invalidResult.errors.length).toBeGreaterThan(0)
    })

    it('should handle required field validation', () => {
      const result = validateField('email', '')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('email is required')
    })

    it('should handle optional field validation', () => {
      const result = validateField('notes', '')
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should sanitize HTML input', () => {
      const result = validateField('notes', 'Hello <script>alert("xss")</script>World')
      expect(result.sanitizedValue).not.toContain('<script>')
    })

    it('should handle unknown field', () => {
      const result = validateField('unknown', 'value')
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Unknown field')
    })
  })

  describe('validationRules', () => {
    it('should have proper email pattern', () => {
      expect(validationRules.email.pattern.test('test@example.com')).toBe(true)
      expect(validationRules.email.pattern.test('invalid-email')).toBe(false)
    })

    it('should have proper password requirements', () => {
      expect(validationRules.password.pattern.test('SecurePass123')).toBe(true)
      expect(validationRules.password.pattern.test('weak')).toBe(false)
    })

    it('should have proper coordinate bounds for Alameda', () => {
      expect(validationRules.coordinates.lat.min).toBe(37.7)
      expect(validationRules.coordinates.lat.max).toBe(37.8)
      expect(validationRules.coordinates.lng.min).toBe(-122.3)
      expect(validationRules.coordinates.lng.max).toBe(-122.2)
    })
  })
})