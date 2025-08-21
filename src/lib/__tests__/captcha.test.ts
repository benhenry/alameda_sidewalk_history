import { generateCaptcha, validateCaptcha } from '../captcha'

describe('captcha', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateCaptcha', () => {
    it('should generate captcha with text and image data', async () => {
      const result = await generateCaptcha()

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('image')
      expect(result).toHaveProperty('text')
      expect(typeof result.id).toBe('string')
      expect(typeof result.image).toBe('string')
      expect(typeof result.text).toBe('string')
      expect(result.text).toMatch(/^[A-Z0-9]{6}$/) // 6 alphanumeric characters
      expect(result.image).toMatch(/^data:image\/png;base64,/) // Base64 PNG
    })

    it('should generate different captchas each time', async () => {
      const result1 = await generateCaptcha()
      const result2 = await generateCaptcha()

      expect(result1.id).not.toBe(result2.id)
      expect(result1.text).not.toBe(result2.text)
      expect(result1.image).not.toBe(result2.image)
    })

    it('should generate captcha text of correct length', async () => {
      const result = await generateCaptcha()
      expect(result.text).toHaveLength(6)
    })

    it('should generate valid base64 image data', async () => {
      const result = await generateCaptcha()
      
      // Should be valid base64
      const base64Data = result.image.split(',')[1]
      expect(() => Buffer.from(base64Data, 'base64')).not.toThrow()
    })
  })

  describe('validateCaptcha', () => {
    it('should validate correct captcha', async () => {
      const captcha = await generateCaptcha()
      const isValid = validateCaptcha(captcha.id, captcha.text)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect captcha text', async () => {
      const captcha = await generateCaptcha()
      const isValid = validateCaptcha(captcha.id, 'WRONG')

      expect(isValid).toBe(false)
    })

    it('should reject invalid captcha ID', () => {
      const isValid = validateCaptcha('invalid-id', 'TEST123')

      expect(isValid).toBe(false)
    })

    it('should be case insensitive', async () => {
      const captcha = await generateCaptcha()
      const isValid = validateCaptcha(captcha.id, captcha.text.toLowerCase())

      expect(isValid).toBe(true)
    })

    it('should handle empty inputs', () => {
      expect(validateCaptcha('', '')).toBe(false)
      expect(validateCaptcha('id', '')).toBe(false)
      expect(validateCaptcha('', 'text')).toBe(false)
    })

    it('should expire captcha after validation', async () => {
      const captcha = await generateCaptcha()
      
      // First validation should work
      const isValid1 = validateCaptcha(captcha.id, captcha.text)
      expect(isValid1).toBe(true)

      // Second validation should fail (captcha is consumed)
      const isValid2 = validateCaptcha(captcha.id, captcha.text)
      expect(isValid2).toBe(false)
    })

    it('should handle whitespace in text', async () => {
      const captcha = await generateCaptcha()
      const isValid = validateCaptcha(captcha.id, ` ${captcha.text} `)

      expect(isValid).toBe(true)
    })
  })

  describe('captcha expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should expire captcha after timeout', async () => {
      const captcha = await generateCaptcha()

      // Advance time by 5 minutes (past expiration)
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000)

      const isValid = validateCaptcha(captcha.id, captcha.text)
      expect(isValid).toBe(false)
    })

    it('should work before timeout', async () => {
      const captcha = await generateCaptcha()

      // Advance time by 2 minutes (before expiration)
      jest.advanceTimersByTime(2 * 60 * 1000)

      const isValid = validateCaptcha(captcha.id, captcha.text)
      expect(isValid).toBe(true)
    })
  })
})