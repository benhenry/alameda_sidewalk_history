// Mock fetch
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock turf functions
jest.mock('@turf/turf', () => ({
  distance: jest.fn(),
  point: jest.fn((coords) => ({ geometry: { coordinates: coords } })),
  lineString: jest.fn(),
  buffer: jest.fn(),
  booleanPointInPolygon: jest.fn(),
}))

import { distance, point } from '@turf/turf'
const mockDistance = distance as jest.MockedFunction<typeof distance>
const mockPoint = point as jest.MockedFunction<typeof point>

describe('sidewalk-validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  describe('fetchSidewalkData', () => {
    it('should handle successful API response', async () => {
      // Import after mocks are set
      const { fetchSidewalkData } = await import('../sidewalk-validation')
      
      const mockOSMResponse = {
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 37.7652,
            lon: -122.2416
          },
          {
            type: 'node', 
            id: 2,
            lat: 37.7653,
            lon: -122.2417
          },
          {
            type: 'way',
            id: 100,
            nodes: [1, 2],
            tags: { highway: 'footway' }
          }
        ]
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockOSMResponse)
      } as any)

      const result = await fetchSidewalkData()

      expect(result).toBeInstanceOf(Array)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should handle fetch errors gracefully', async () => {
      const { fetchSidewalkData } = await import('../sidewalk-validation')
      
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchSidewalkData()

      expect(result).toEqual([])
    })

    it('should handle API errors gracefully', async () => {
      const { fetchSidewalkData } = await import('../sidewalk-validation')
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      } as any)

      const result = await fetchSidewalkData()

      expect(result).toEqual([])
    })
  })

  describe('validateSidewalkCoordinates', () => {
    it('should handle validation with empty sidewalk data', async () => {
      const { validateSidewalkCoordinates } = await import('../sidewalk-validation')
      
      // Mock empty sidewalk data
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ elements: [] })
      } as any)

      const coordinates: [number, number][] = [[37.7652, -122.2416]]
      const result = await validateSidewalkCoordinates(coordinates)

      expect(result.isValid).toBe(true) // Should fallback to allow
      expect(result.invalidCoordinates).toEqual([])
    })

    it('should handle validation errors gracefully', async () => {
      const { validateSidewalkCoordinates } = await import('../sidewalk-validation')
      
      mockFetch.mockRejectedValueOnce(new Error('Validation error'))

      const coordinates: [number, number][] = [[37.7652, -122.2416]]
      const result = await validateSidewalkCoordinates(coordinates)

      expect(result.isValid).toBe(true) // Should fallback to allow
      expect(result.invalidCoordinates).toEqual([])
    })
  })

  describe('getSidewalkSuggestions', () => {
    it('should handle suggestions with empty data', async () => {
      const { getSidewalkSuggestions } = await import('../sidewalk-validation')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ elements: [] })
      } as any)

      const coordinate: [number, number] = [37.7650, -122.2415]
      const result = await getSidewalkSuggestions(coordinate)

      expect(result).toEqual([])
    })

    it('should handle errors gracefully and return empty array', async () => {
      const { getSidewalkSuggestions } = await import('../sidewalk-validation')

      mockFetch.mockRejectedValueOnce(new Error('Fetch error'))

      const coordinate: [number, number] = [37.7650, -122.2415]
      const result = await getSidewalkSuggestions(coordinate)

      expect(result).toEqual([])
    })
  })

  describe('fetchSidewalkData - cache behavior', () => {
    it('should extract coordinates from nodes and ways', async () => {
      const { fetchSidewalkData } = await import('../sidewalk-validation')

      const mockResponse = {
        elements: [
          { type: 'node', id: 10, lat: 37.765, lon: -122.241 },
          { type: 'node', id: 11, lat: 37.766, lon: -122.242 },
          { type: 'node', id: 12, lat: 37.767, lon: -122.243 },
          {
            type: 'way',
            id: 200,
            nodes: [10, 11, 12],
            tags: { highway: 'footway' },
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await fetchSidewalkData()
      expect(result.length).toBe(3) // 3 nodes from 1 way
      expect(result[0]).toEqual([37.765, -122.241])
    })

    it('should skip ways with only one node', async () => {
      const { fetchSidewalkData } = await import('../sidewalk-validation')

      const mockResponse = {
        elements: [
          { type: 'node', id: 10, lat: 37.765, lon: -122.241 },
          {
            type: 'way',
            id: 200,
            nodes: [10], // Only one node
            tags: { highway: 'footway' },
          },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse),
      } as any)

      const result = await fetchSidewalkData()
      expect(result.length).toBe(0) // Skip ways with < 2 nodes
    })

    it('should handle API error status with error text', async () => {
      const { fetchSidewalkData } = await import('../sidewalk-validation')

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limited'),
      } as any)

      const result = await fetchSidewalkData()
      expect(result).toEqual([])
    })
  })

  describe('validateSidewalkCoordinates - server-side', () => {
    it('should always return valid on server-side (no window)', async () => {
      const { validateSidewalkCoordinates } = await import('../sidewalk-validation')

      const coords: [number, number][] = [[0, 0]] // Obviously not near Alameda
      const result = await validateSidewalkCoordinates(coords)

      // Server-side always returns valid
      expect(result.isValid).toBe(true)
      expect(result.invalidCoordinates).toEqual([])
    })
  })

  describe('getSidewalkSuggestions - server-side', () => {
    it('should return empty array on server-side (no window)', async () => {
      const { getSidewalkSuggestions } = await import('../sidewalk-validation')

      const result = await getSidewalkSuggestions([37.765, -122.241])
      expect(result).toEqual([])
    })
  })
})