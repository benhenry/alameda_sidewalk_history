import { POST } from '../route'
import { NextRequest } from 'next/server'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('/api/reverse-geocode POST', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'test-api-key' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should return 400 for invalid coordinates', async () => {
    const request = new NextRequest('http://localhost/api/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ lat: 'invalid', lng: -122.2 }),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 400 for missing coordinates', async () => {
    const request = new NextRequest('http://localhost/api/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('should return 503 when API key is not configured', async () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const request = new NextRequest('http://localhost/api/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.76, lng: -122.24 }),
    })
    const response = await POST(request)
    expect(response.status).toBe(503)
  })

  it('should return street and block on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        results: [{
          formatted_address: '2345 Park Street, Alameda, CA',
          address_components: [
            { long_name: '2345', types: ['street_number'] },
            { long_name: 'Park Street', types: ['route'] },
          ]
        }]
      })
    })

    const request = new NextRequest('http://localhost/api/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.76, lng: -122.24 }),
    })
    const response = await POST(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.street).toBe('Park Street')
    expect(data.block).toBe('2300')
    expect(data.formattedAddress).toBe('2345 Park Street, Alameda, CA')
  })

  it('should round block to nearest 100', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        results: [{
          formatted_address: '1499 Oak Street',
          address_components: [
            { long_name: '1499', types: ['street_number'] },
            { long_name: 'Oak Street', types: ['route'] },
          ]
        }]
      })
    })

    const request = new NextRequest('http://localhost/api/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.76, lng: -122.24 }),
    })
    const response = await POST(request)
    const data = await response.json()
    expect(data.block).toBe('1400')
  })

  it('should handle no results from geocoding', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ZERO_RESULTS', results: [] })
    })

    const request = new NextRequest('http://localhost/api/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.76, lng: -122.24 }),
    })
    const response = await POST(request)
    const data = await response.json()
    expect(data.street).toBeNull()
    expect(data.block).toBeNull()
  })

  it('should handle geocoding API failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    })

    const request = new NextRequest('http://localhost/api/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.76, lng: -122.24 }),
    })
    const response = await POST(request)
    expect(response.status).toBe(500)
  })

  it('should return null street/block when no street number', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        status: 'OK',
        results: [{
          formatted_address: 'Park Street, Alameda, CA',
          address_components: [
            { long_name: 'Park Street', types: ['route'] },
          ]
        }]
      })
    })

    const request = new NextRequest('http://localhost/api/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.76, lng: -122.24 }),
    })
    const response = await POST(request)
    const data = await response.json()
    expect(data.street).toBe('Park Street')
    expect(data.block).toBeNull()
  })

  it('should return 500 on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const request = new NextRequest('http://localhost/api/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.76, lng: -122.24 }),
    })
    const response = await POST(request)
    expect(response.status).toBe(500)
  })
})
