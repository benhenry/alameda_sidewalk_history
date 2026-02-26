import { POST } from '../route'
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({
  auth: () => mockAuth(),
}))

jest.mock('child_process', () => ({
  exec: jest.fn(),
}))

jest.mock('util', () => ({
  promisify: (fn: any) => jest.fn(),
}))

// We need to mock the promisified exec
const mockExecAsync = jest.fn()
jest.mock('../route', () => {
  // Re-import with mocked deps
  const original = jest.requireActual('../route')
  return original
})

describe('/api/admin/import-osm POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost/api/admin/import-osm', { method: 'POST' })
    const response = await POST(request)
    expect(response.status).toBe(401)
  })

  it('should return 403 when not admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'user' } })
    const request = new NextRequest('http://localhost/api/admin/import-osm', { method: 'POST' })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('should return 500 when exec fails', async () => {
    mockAuth.mockResolvedValue({ user: { id: '1', role: 'admin' } })
    // The real exec will fail because 'npm run import-osm' doesn't exist
    const request = new NextRequest('http://localhost/api/admin/import-osm', { method: 'POST' })
    const response = await POST(request)
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
  })
})
