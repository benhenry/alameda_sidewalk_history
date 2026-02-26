import { GET } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/database', () => ({
  getAllSegments: jest.fn(),
}))

import { getAllSegments } from '@/lib/database'

describe('/api/autocomplete/blocks GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockSegments = [
    { street: 'Park Street', block: '1400' },
    { street: 'Park Street', block: '1500' },
    { street: 'Oak Street', block: '200' },
    { street: 'Oak Street', block: '1400' },
  ]

  it('should return empty array when query is missing', async () => {
    const request = new NextRequest('http://localhost/api/autocomplete/blocks')
    const response = await GET(request)
    const data = await response.json()
    expect(data).toEqual([])
  })

  it('should return matching blocks', async () => {
    ;(getAllSegments as jest.Mock).mockResolvedValue(mockSegments)
    const request = new NextRequest('http://localhost/api/autocomplete/blocks?q=14')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toContain('1400')
  })

  it('should filter by street when provided', async () => {
    ;(getAllSegments as jest.Mock).mockResolvedValue(mockSegments)
    const request = new NextRequest('http://localhost/api/autocomplete/blocks?q=14&street=Park')
    const response = await GET(request)

    const data = await response.json()
    expect(data).toContain('1400')
    // 1400 on Oak Street should be excluded
    expect(data).toHaveLength(1)
  })

  it('should return unique blocks', async () => {
    ;(getAllSegments as jest.Mock).mockResolvedValue([
      { street: 'Park Street', block: '1400' },
      { street: 'Park Street', block: '1400' },
    ])
    const request = new NextRequest('http://localhost/api/autocomplete/blocks?q=14')
    const response = await GET(request)
    const data = await response.json()
    expect(data).toHaveLength(1)
  })

  it('should sort results alphabetically', async () => {
    ;(getAllSegments as jest.Mock).mockResolvedValue([
      { street: 'Park Street', block: '300' },
      { street: 'Park Street', block: '100' },
      { street: 'Park Street', block: '200' },
    ])
    const request = new NextRequest('http://localhost/api/autocomplete/blocks?q=0')
    const response = await GET(request)
    const data = await response.json()
    expect(data).toEqual(['100', '200', '300'])
  })

  it('should limit to 10 results', async () => {
    const manySegments = Array.from({ length: 15 }, (_, i) => ({
      street: 'Park Street',
      block: `${(i + 1) * 100}`,
    }))
    ;(getAllSegments as jest.Mock).mockResolvedValue(manySegments)
    const request = new NextRequest('http://localhost/api/autocomplete/blocks?q=0')
    const response = await GET(request)
    const data = await response.json()
    expect(data).toHaveLength(10)
  })

  it('should return 500 on error', async () => {
    ;(getAllSegments as jest.Mock).mockRejectedValue(new Error('DB error'))
    const request = new NextRequest('http://localhost/api/autocomplete/blocks?q=14')
    const response = await GET(request)
    expect(response.status).toBe(500)
  })
})
