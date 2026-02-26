import { GET } from '../route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/database', () => ({
  getAllSegments: jest.fn(),
}))

import { getAllSegments } from '@/lib/database'

describe('/api/autocomplete/contractors GET', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockSegments = [
    { contractor: 'Smith Construction Co.', street: 'Park Street', block: '1400' },
    { contractor: 'Jones Brothers', street: 'Oak Street', block: '200' },
    { contractor: 'Smith Construction Co.', street: 'Oak Street', block: '300' },
    { contractor: 'Alpine Concrete', street: 'Elm Street', block: '100' },
  ]

  it('should return empty array when query is missing', async () => {
    const request = new NextRequest('http://localhost/api/autocomplete/contractors')
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual([])
  })

  it('should return empty array when query is too short', async () => {
    const request = new NextRequest('http://localhost/api/autocomplete/contractors?q=S')
    const response = await GET(request)
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual([])
  })

  it('should return matching contractors', async () => {
    ;(getAllSegments as jest.Mock).mockResolvedValue(mockSegments)
    const request = new NextRequest('http://localhost/api/autocomplete/contractors?q=Smith')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual(['Smith Construction Co.'])
  })

  it('should return unique contractors only', async () => {
    ;(getAllSegments as jest.Mock).mockResolvedValue(mockSegments)
    const request = new NextRequest('http://localhost/api/autocomplete/contractors?q=smith')
    const response = await GET(request)

    const data = await response.json()
    // Smith Construction Co. appears twice in segments but should be deduplicated
    expect(data).toHaveLength(1)
  })

  it('should be case-insensitive', async () => {
    ;(getAllSegments as jest.Mock).mockResolvedValue(mockSegments)
    const request = new NextRequest('http://localhost/api/autocomplete/contractors?q=jones')
    const response = await GET(request)
    const data = await response.json()
    expect(data).toContain('Jones Brothers')
  })

  it('should return 500 on error', async () => {
    ;(getAllSegments as jest.Mock).mockRejectedValue(new Error('DB error'))
    const request = new NextRequest('http://localhost/api/autocomplete/contractors?q=Smith')
    const response = await GET(request)
    expect(response.status).toBe(500)
  })
})
