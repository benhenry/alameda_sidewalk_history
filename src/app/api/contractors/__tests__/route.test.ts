import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock the database module
jest.mock('@/lib/database', () => ({
  getAllContractors: jest.fn(),
}))

import { getAllContractors } from '@/lib/database'

describe('/api/contractors', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return contractors successfully', async () => {
    const mockContractors = [
      { id: '1', name: 'Smith Construction', yearsActive: [1920, 1930], totalSegments: 15 },
      { id: '2', name: 'Johnson & Sons', yearsActive: [1930, 1940], totalSegments: 23 },
    ]

    ;(getAllContractors as jest.Mock).mockResolvedValue(mockContractors)

    const request = new NextRequest('http://localhost:3000/api/contractors')
    const response = await GET()

    expect(response.status).toBe(200)
    expect(getAllContractors).toHaveBeenCalled()

    const data = await response.json()
    expect(data).toEqual(mockContractors)
  })

  it('should handle database errors', async () => {
    ;(getAllContractors as jest.Mock).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/contractors')
    const response = await GET()

    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data.error).toBe('Failed to fetch contractors')
  })
})
