import { POST } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('@/lib/email', () => ({
  sendTestEmail: jest.fn(),
}))

import { sendTestEmail } from '@/lib/email'

describe('/api/admin/test-email POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admin/test-email', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 403 when not admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
    const request = new NextRequest('http://localhost/api/admin/test-email', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('should return 400 when email is missing', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    const request = new NextRequest('http://localhost/api/admin/test-email', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 when email is not a string', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    const request = new NextRequest('http://localhost/api/admin/test-email', {
      method: 'POST',
      body: JSON.stringify({ email: 123 }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should send test email successfully', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    ;(sendTestEmail as jest.Mock).mockResolvedValue(undefined)
    const request = new NextRequest('http://localhost/api/admin/test-email', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(sendTestEmail).toHaveBeenCalledWith('test@example.com')
    const data = await response.json()
    expect(data.message).toContain('test@example.com')
  })

  it('should return 500 when sendTestEmail throws', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    ;(sendTestEmail as jest.Mock).mockRejectedValue(new Error('SMTP failure'))
    const request = new NextRequest('http://localhost/api/admin/test-email', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to send test email')
    expect(data.details).toBe('SMTP failure')
  })
})
