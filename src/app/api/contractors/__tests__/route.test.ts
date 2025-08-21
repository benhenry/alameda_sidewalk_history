import { GET } from '../route'
import { NextRequest } from 'next/server'

// Mock the database module
jest.mock('@/lib/database', () => ({
  contractorQueries: {
    getAll: {
      all: jest.fn(),
    },
  },
}))

import { contractorQueries } from '@/lib/database'

describe('/api/contractors', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return contractors successfully', async () => {
    const mockContractors = [
      { id: '1', name: 'Smith Construction', years_active: '[1920,1930]', total_segments: 15 },
      { id: '2', name: 'Johnson & Sons', years_active: '[1930,1940]', total_segments: 23 },
    ]

    ;(contractorQueries.getAll.all as jest.Mock).mockReturnValue(mockContractors)

    const request = new NextRequest('http://localhost:3000/api/contractors')
    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(contractorQueries.getAll.all).toHaveBeenCalled()

    const data = await response.json()
    expect(data).toEqual(mockContractors)
  })

  it('should handle database errors', async () => {
    ;(contractorQueries.getAll.all as jest.Mock).mockImplementation(() => {
      throw new Error('Database error')
    })

    const request = new NextRequest('http://localhost:3000/api/contractors')
    const response = await GET(request)

    expect(response.status).toBe(500)
    
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch contractors')
  })
})