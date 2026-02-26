import { validateField, validationRules, validateCoordinates, validateSegmentData, sanitizeHtml, validateImageFile } from '../validation'

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

  describe('validateCoordinates', () => {
    it('should accept valid Alameda coordinates', () => {
      const result = validateCoordinates([[37.75, -122.25], [37.76, -122.26]])
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject empty coordinates array', () => {
      const result = validateCoordinates([])
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('At least one coordinate')
    })

    it('should reject non-array input', () => {
      const result = validateCoordinates(null as any)
      expect(result.isValid).toBe(false)
    })

    it('should reject too many coordinates', () => {
      const coords = Array.from({ length: 51 }, () => [37.75, -122.25] as [number, number])
      const result = validateCoordinates(coords)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('maximum 50')
    })

    it('should reject latitude out of Alameda bounds', () => {
      const result = validateCoordinates([[38.0, -122.25]])
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Latitude')
    })

    it('should reject longitude out of Alameda bounds', () => {
      const result = validateCoordinates([[37.75, -123.0]])
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Longitude')
    })

    it('should reject non-number coordinates', () => {
      const result = validateCoordinates([['abc', -122.25] as any])
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('Invalid coordinate format')
    })
  })

  describe('validateSegmentData', () => {
    it('should validate complete valid segment data', () => {
      const result = validateSegmentData({
        contractor: 'Smith Construction',
        year: 1925,
        street: 'Park Street',
        block: '1400',
        notes: 'Well preserved',
        coordinates: [[37.75, -122.25], [37.76, -122.26]],
        specialMarks: ['P'],
      })
      expect(result.isValid).toBe(true)
    })

    it('should fail for missing required fields', () => {
      const result = validateSegmentData({
        coordinates: [[37.75, -122.25], [37.76, -122.26]],
      })
      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should allow optional notes to be empty', () => {
      const result = validateSegmentData({
        contractor: 'Smith Construction',
        year: 1925,
        street: 'Park Street',
        block: '1400',
        notes: '',
        coordinates: [[37.75, -122.25], [37.76, -122.26]],
      })
      expect(result.isValid).toBe(true)
    })

    it('should validate special marks if provided', () => {
      const result = validateSegmentData({
        contractor: 'Smith Construction',
        year: 1925,
        street: 'Park Street',
        block: '1400',
        coordinates: [[37.75, -122.25], [37.76, -122.26]],
        specialMarks: ['P', 'Star'],
      })
      expect(result.isValid).toBe(true)
      expect(result.sanitizedValue.specialMarks).toEqual(expect.arrayContaining(['P', 'Star']))
    })

    it('should reject invalid year in segment data', () => {
      const result = validateSegmentData({
        contractor: 'Smith Construction',
        year: 1800,
        street: 'Park Street',
        block: '1400',
        coordinates: [[37.75, -122.25], [37.76, -122.26]],
      })
      expect(result.isValid).toBe(false)
    })
  })

  describe('sanitizeHtml', () => {
    it('should remove dangerous HTML tags', () => {
      const result = sanitizeHtml('<script>alert("xss")</script>')
      expect(result).not.toContain('<script>')
    })

    it('should trim whitespace', () => {
      const result = sanitizeHtml('  hello  ')
      expect(result).toBe('hello')
    })

    it('should preserve safe text content', () => {
      const result = sanitizeHtml('Tom & Jerry')
      expect(result).toContain('Tom')
      expect(result).toContain('Jerry')
    })

    it('should handle empty string', () => {
      const result = sanitizeHtml('')
      expect(result).toBe('')
    })
  })

  describe('validateImageFile', () => {
    it('should accept valid JPEG file', () => {
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
      const result = validateImageFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should accept valid PNG file', () => {
      const file = new File(['test'], 'photo.png', { type: 'image/png' })
      const result = validateImageFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should accept valid WebP file', () => {
      const file = new File(['test'], 'photo.webp', { type: 'image/webp' })
      const result = validateImageFile(file)
      expect(result.isValid).toBe(true)
    })

    it('should reject PDF file', () => {
      const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' })
      const result = validateImageFile(file)
      expect(result.isValid).toBe(false)
      expect(result.errors[0]).toContain('JPEG, PNG, or WebP')
    })

    it('should reject file with too long filename', () => {
      const longName = 'a'.repeat(101) + '.jpg'
      const file = new File(['test'], longName, { type: 'image/jpeg' })
      const result = validateImageFile(file)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Filename too long')
    })

    it('should reject file with invalid filename characters', () => {
      const file = new File(['test'], 'photo@#$.jpg', { type: 'image/jpeg' })
      const result = validateImageFile(file)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Filename contains invalid characters')
    })
  })
})