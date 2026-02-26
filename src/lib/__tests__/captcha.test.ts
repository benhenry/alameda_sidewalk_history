import { captchaManager, checkHoneypot, detectBotBehavior } from '../captcha'

describe('captcha', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('captchaManager.generateChallenge', () => {
    it('should generate captcha challenge with question and answer', () => {
      const result = captchaManager.generateChallenge()

      expect(result).toHaveProperty('id')
      expect(result).toHaveProperty('question')
      expect(result).toHaveProperty('answer')
      expect(result).toHaveProperty('expiresAt')
      expect(typeof result.id).toBe('string')
      expect(typeof result.question).toBe('string')
      expect(typeof result.answer).toBe('number')
      expect(typeof result.expiresAt).toBe('number')
      expect(result.question).toMatch(/What is \d+/) // Should contain math question
    })

    it('should generate different captchas each time', () => {
      const result1 = captchaManager.generateChallenge()
      const result2 = captchaManager.generateChallenge()

      expect(result1.id).not.toBe(result2.id)
      expect(result1.question).not.toBe(result2.question)
    })
  })

  describe('captchaManager.verifyCaptcha', () => {
    it('should validate correct captcha', () => {
      const challenge = captchaManager.generateChallenge()
      const isValid = captchaManager.verifyCaptcha(challenge.id, challenge.answer)

      expect(isValid).toBe(true)
    })

    it('should reject incorrect captcha answer', () => {
      const challenge = captchaManager.generateChallenge()
      const isValid = captchaManager.verifyCaptcha(challenge.id, 999)

      expect(isValid).toBe(false)
    })

    it('should reject invalid captcha ID', () => {
      const isValid = captchaManager.verifyCaptcha('invalid-id', 123)

      expect(isValid).toBe(false)
    })

    it('should handle empty/invalid inputs', () => {
      expect(captchaManager.verifyCaptcha('', 0)).toBe(false)
      expect(captchaManager.verifyCaptcha('id', NaN)).toBe(false)
    })

    it('should expire captcha after validation', () => {
      const challenge = captchaManager.generateChallenge()
      
      // First validation should work
      const isValid1 = captchaManager.verifyCaptcha(challenge.id, challenge.answer)
      expect(isValid1).toBe(true)

      // Second validation should fail (captcha is consumed)
      const isValid2 = captchaManager.verifyCaptcha(challenge.id, challenge.answer)
      expect(isValid2).toBe(false)
    })
  })

  describe('captcha expiration', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
    })

    it('should expire captcha after timeout', () => {
      const challenge = captchaManager.generateChallenge()

      // Advance time by 5 minutes (past expiration)
      jest.advanceTimersByTime(5 * 60 * 1000 + 1000)

      const isValid = captchaManager.verifyCaptcha(challenge.id, challenge.answer)
      expect(isValid).toBe(false)
    })

    it('should work before timeout', () => {
      const challenge = captchaManager.generateChallenge()

      // Advance time by 2 minutes (before expiration)
      jest.advanceTimersByTime(2 * 60 * 1000)

      const isValid = captchaManager.verifyCaptcha(challenge.id, challenge.answer)
      expect(isValid).toBe(true)
    })
  })

  describe('checkHoneypot', () => {
    it('should pass when no honeypot fields are filled', () => {
      const formData = { name: 'John', email: 'john@example.com' }
      expect(checkHoneypot(formData)).toBe(true)
    })

    it('should fail when honeypot field is filled', () => {
      const formData = { name: 'John', email: 'john@example.com', website: 'spam.com' }
      expect(checkHoneypot(formData)).toBe(false)
    })
  })

  describe('detectBotBehavior', () => {
    const createRequest = (ua: string, headers: Record<string, string | null> = {}) => ({
      headers: {
        get: (name: string) => {
          if (name === 'user-agent') return ua
          if (name in headers) return headers[name]
          if (name === 'accept') return 'text/html'
          if (name === 'accept-language') return 'en-US'
          return null
        }
      }
    })

    it('should detect bot user agents', () => {
      const request = createRequest('curl/7.68.0')
      const result = detectBotBehavior(request)
      expect(result.isBot).toBe(true)
      expect(result.reason).toBe('Bot user agent detected')
    })

    it('should pass legitimate requests', () => {
      const request = createRequest('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      const result = detectBotBehavior(request)
      expect(result.isBot).toBe(false)
    })

    it('should detect missing accept header', () => {
      const request = createRequest('Mozilla/5.0', { 'accept': null })
      const result = detectBotBehavior(request)
      expect(result.isBot).toBe(true)
      expect(result.reason).toBe('Missing accept header')
    })

    it('should detect missing accept-language header', () => {
      const request = createRequest('Mozilla/5.0', { 'accept-language': null })
      const result = detectBotBehavior(request)
      expect(result.isBot).toBe(true)
      expect(result.reason).toBe('Missing accept-language header')
    })

    it('should detect suspicious referer containing bot', () => {
      const request = createRequest('Mozilla/5.0', { 'referer': 'https://botfarm.example.com' })
      const result = detectBotBehavior(request)
      expect(result.isBot).toBe(true)
      expect(result.reason).toBe('Suspicious referer')
    })

    it('should allow normal referer', () => {
      const request = createRequest('Mozilla/5.0', { 'referer': 'https://google.com' })
      const result = detectBotBehavior(request)
      expect(result.isBot).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should remove expired entries from store', () => {
      const challenge = captchaManager.generateChallenge()
      const store = (captchaManager as any).challenges

      // Manually expire the challenge
      const entry = store.get(challenge.id)
      entry.expiresAt = Date.now() - 1000

      // Trigger cleanup
      ;(captchaManager as any).cleanup()

      expect(store.has(challenge.id)).toBe(false)
    })

    it('should keep non-expired entries', () => {
      const challenge = captchaManager.generateChallenge()
      const store = (captchaManager as any).challenges

      ;(captchaManager as any).cleanup()

      expect(store.has(challenge.id)).toBe(true)

      // Clean up
      store.delete(challenge.id)
    })
  })
})