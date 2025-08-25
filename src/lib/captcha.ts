// Simple mathematical CAPTCHA implementation
// For production, consider using reCAPTCHA or hCaptcha

export interface CaptchaChallenge {
  id: string
  question: string
  answer: number
  expiresAt: number
}

class CaptchaManager {
  private challenges = new Map<string, CaptchaChallenge>()

  constructor() {
    // Clean expired challenges every 10 minutes
    setInterval(() => {
      this.cleanup()
    }, 10 * 60 * 1000)
  }

  private cleanup() {
    const now = Date.now()
    const entries = Array.from(this.challenges.entries())
    for (const [id, challenge] of entries) {
      if (now > challenge.expiresAt) {
        this.challenges.delete(id)
      }
    }
  }

  generateChallenge(): CaptchaChallenge {
    const id = this.generateId()
    const operations = [
      () => {
        const a = Math.floor(Math.random() * 20) + 1
        const b = Math.floor(Math.random() * 20) + 1
        return { question: `What is ${a} + ${b}?`, answer: a + b }
      },
      () => {
        const a = Math.floor(Math.random() * 20) + 10
        const b = Math.floor(Math.random() * 10) + 1
        return { question: `What is ${a} - ${b}?`, answer: a - b }
      },
      () => {
        const a = Math.floor(Math.random() * 10) + 2
        const b = Math.floor(Math.random() * 10) + 2
        return { question: `What is ${a} × ${b}?`, answer: a * b }
      }
    ]

    const operation = operations[Math.floor(Math.random() * operations.length)]()
    const challenge: CaptchaChallenge = {
      id,
      question: operation.question,
      answer: operation.answer,
      expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
    }

    this.challenges.set(id, challenge)
    return challenge
  }

  verifyCaptcha(id: string, userAnswer: number): boolean {
    const challenge = this.challenges.get(id)
    
    if (!challenge) {
      return false // Challenge not found or expired
    }

    if (Date.now() > challenge.expiresAt) {
      this.challenges.delete(id)
      return false // Expired
    }

    const isValid = challenge.answer === userAnswer
    
    // Always delete challenge after verification attempt
    this.challenges.delete(id)
    
    return isValid
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }
}

export const captchaManager = new CaptchaManager()

// Honeypot field detection
export function checkHoneypot(formData: any): boolean {
  // Check for common honeypot field names
  const honeypotFields = [
    'email_confirm', 'website', 'url', 'phone_number', 
    'fax', 'comment', 'message', 'address', 'zip'
  ]
  
  for (const field of honeypotFields) {
    if (formData[field] && formData[field].trim() !== '') {
      return false // Honeypot triggered - likely bot
    }
  }
  
  return true
}

// Simple bot detection based on behavior patterns
export function detectBotBehavior(request: any): { isBot: boolean; reason?: string } {
  // Check user agent
  const userAgent = request.headers.get('user-agent') || ''
  const botUserAgents = [
    'curl', 'wget', 'python-requests', 'bot', 'crawler', 
    'spider', 'scraper', 'postman'
  ]
  
  for (const botUA of botUserAgents) {
    if (userAgent.toLowerCase().includes(botUA)) {
      return { isBot: true, reason: 'Bot user agent detected' }
    }
  }
  
  // Check for missing common headers
  const requiredHeaders = ['accept', 'accept-language']
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      return { isBot: true, reason: `Missing ${header} header` }
    }
  }
  
  // Check for suspicious patterns
  const referer = request.headers.get('referer')
  if (referer && referer.includes('bot')) {
    return { isBot: true, reason: 'Suspicious referer' }
  }
  
  return { isBot: false }
}