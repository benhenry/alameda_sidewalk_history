import { getAuthHeaders, authenticatedFetch, handleApiError } from '../api'
import Cookies from 'js-cookie'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock js-cookie
jest.mock('js-cookie')
const mockCookies = Cookies as jest.Mocked<typeof Cookies>

// Mock window.location
delete (window as any).location
window.location = { href: '' } as any

// Mock alert
global.alert = jest.fn()

describe('api utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAuthHeaders', () => {
    it('should return Authorization header when token exists', () => {
      mockCookies.get.mockReturnValue('test-token')

      const headers = getAuthHeaders()

      expect(headers).toEqual({ 'Authorization': 'Bearer test-token' })
      expect(Cookies.get).toHaveBeenCalledWith('auth-token')
    })

    it('should return empty object when no token', () => {
      mockCookies.get.mockReturnValue(undefined)

      const headers = getAuthHeaders()

      expect(headers).toEqual({})
    })
  })

  describe('authenticatedFetch', () => {
    it('should make fetch request with auth headers', async () => {
      mockCookies.get.mockReturnValue('test-token')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      } as any)

      const response = await authenticatedFetch('/test')

      expect(fetch).toHaveBeenCalledWith('/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        }
      })
      expect(response).toBeDefined()
    })

    it('should make fetch request without auth when no token', async () => {
      mockCookies.get.mockReturnValue(undefined)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      } as any)

      await authenticatedFetch('/test')

      expect(fetch).toHaveBeenCalledWith('/test', {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    })

    it('should merge custom headers', async () => {
      mockCookies.get.mockReturnValue('test-token')
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
          'Authorization': 'Bearer test-token',
          'Custom-Header': 'custom-value'
        },
        body: JSON.stringify({ data: 'test' })
      })
    })
  })

  describe('handleApiError', () => {
    it('should handle 401 unauthorized', () => {
      const response = { status: 401 } as Response

      handleApiError(response)

      expect(Cookies.remove).toHaveBeenCalledWith('auth-token')
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
})