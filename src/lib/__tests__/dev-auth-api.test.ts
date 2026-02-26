import { getDevUser, createDevSession } from '../dev-auth-api'

// We need to be able to toggle NODE_ENV
const originalEnv = process.env.NODE_ENV

describe('dev-auth-api', () => {
  afterEach(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true })
  })

  describe('getDevUser', () => {
    it('should return null in production', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'x-dev-user': 'admin' },
      })
      expect(getDevUser(request)).toBeNull()
    })

    it('should return admin user when header is "admin"', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'x-dev-user': 'admin' },
      })
      const user = getDevUser(request)
      expect(user).not.toBeNull()
      expect(user!.role).toBe('admin')
      expect(user!.id).toBe('dev-admin-001')
      expect(user!.email).toBe('admin@dev.local')
      expect(user!.name).toBe('DevAdmin')
    })

    it('should return regular user when header is "user"', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'x-dev-user': 'user' },
      })
      const user = getDevUser(request)
      expect(user).not.toBeNull()
      expect(user!.role).toBe('user')
      expect(user!.id).toBe('dev-user-001')
      expect(user!.email).toBe('user@dev.local')
      expect(user!.name).toBe('DevUser')
    })

    it('should return null when no dev header is set', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
      const request = new Request('http://localhost:3000/api/test')
      expect(getDevUser(request)).toBeNull()
    })

    it('should return null for unknown header values', () => {
      Object.defineProperty(process.env, 'NODE_ENV', { value: 'development', writable: true })
      const request = new Request('http://localhost:3000/api/test', {
        headers: { 'x-dev-user': 'superadmin' },
      })
      expect(getDevUser(request)).toBeNull()
    })
  })

  describe('createDevSession', () => {
    it('should create session with correct user fields', () => {
      const user = { id: 'dev-admin-001', email: 'admin@dev.local', name: 'DevAdmin', role: 'admin' as const }
      const session = createDevSession(user)

      expect(session.user.id).toBe('dev-admin-001')
      expect(session.user.email).toBe('admin@dev.local')
      expect(session.user.name).toBe('DevAdmin')
      expect(session.user.role).toBe('admin')
      expect(session.user.image).toBeNull()
    })

    it('should set expiry 30 days in the future', () => {
      const user = { id: 'dev-user-001', email: 'user@dev.local', name: 'DevUser', role: 'user' as const }
      const before = Date.now()
      const session = createDevSession(user)
      const after = Date.now()

      const expiry = new Date(session.expires).getTime()
      const thirtyDays = 30 * 24 * 60 * 60 * 1000
      expect(expiry).toBeGreaterThanOrEqual(before + thirtyDays)
      expect(expiry).toBeLessThanOrEqual(after + thirtyDays)
    })
  })
})
