import { authenticatedFetch, handleApiError } from '../api'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock window.location
delete (window as any).location
window.location = { href: '' } as any

// Mock alert
global.alert = jest.fn()

describe('api utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.location.href = ''
  })

  describe('authenticatedFetch', () => {
    it('should make fetch request with credentials include', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      } as any)

      const response = await authenticatedFetch('/test')

      expect(fetch).toHaveBeenCalledWith('/test', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      expect(response).toBeDefined()
    })

    it('should merge custom headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      } as any)

      await authenticatedFetch('/test', {
        method: 'POST',
        headers: {
          'Custom-Header': 'custom-value'
        },
        body: JSON.stringify({ data: 'test' })
      })

      expect(fetch).toHaveBeenCalledWith('/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'custom-value'
        },
        body: JSON.stringify({ data: 'test' }),
        credentials: 'include'
      })
    })
  })

  describe('handleApiError', () => {
    it('should handle 401 unauthorized', () => {
      const response = { status: 401 } as Response

      handleApiError(response)

      expect(window.location.href).toBe('/?auth=required')
    })

    it('should handle 403 forbidden', () => {
      const response = { status: 403 } as Response

      handleApiError(response)

      expect(global.alert).toHaveBeenCalledWith('You do not have permission to perform this action.')
    })

    it('should throw error for other status codes', () => {
      const response = { status: 500 } as Response

      expect(() => handleApiError(response)).toThrow('API Error: 500')
    })

    it('should handle 404 not found', () => {
      const response = { status: 404 } as Response

      expect(() => handleApiError(response)).toThrow('API Error: 404')
    })
  })

  describe('authenticatedFetch dev mode', () => {
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
    })

    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true })
      localStorage.clear()
    })

    it('should add x-dev-user header when dev user exists in localStorage', async () => {
      localStorage.setItem('dev-auth-user', JSON.stringify({ role: 'admin' }))
      mockFetch.mockResolvedValueOnce({ ok: true } as any)

      await authenticatedFetch('/test')

      expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
        headers: expect.objectContaining({
          'x-dev-user': 'admin',
        }),
      }))
    })

    it('should not add header when dev user is not in localStorage', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true } as any)

      await authenticatedFetch('/test')

      expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
        headers: expect.not.objectContaining({
          'x-dev-user': expect.anything(),
        }),
      }))
    })

    it('should handle invalid JSON in localStorage gracefully', async () => {
      localStorage.setItem('dev-auth-user', 'not-json')
      mockFetch.mockResolvedValueOnce({ ok: true } as any)

      await authenticatedFetch('/test')

      // Should not throw, just skip the header
      expect(fetch).toHaveBeenCalledWith('/test', expect.objectContaining({
        headers: expect.not.objectContaining({
          'x-dev-user': expect.anything(),
        }),
      }))
    })
  })
})
