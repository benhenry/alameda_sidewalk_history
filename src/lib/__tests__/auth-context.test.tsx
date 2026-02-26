import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next-auth/react
const mockSession = {
  user: {
    id: 'user-1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    image: 'https://example.com/avatar.jpg',
  },
  expires: '2099-01-01',
}
const mockSignOut = jest.fn()
let mockStatus = 'authenticated'
let mockSessionData: any = mockSession

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSessionData, status: mockStatus }),
  signOut: (...args: any[]) => mockSignOut(...args),
}))

// Mock dev-auth - needed because auth-context imports it
jest.mock('../dev-auth', () => ({
  useDevAuth: () => ({
    user: null,
    loading: false,
    logout: jest.fn(),
    isAdmin: () => false,
    session: null,
  }),
}))

// Force production mode for testing AuthProvider
const originalEnv = process.env.NODE_ENV
Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true })

// Import after mocking
import { AuthProvider, useAuth } from '../auth-context'

// Restore after import
Object.defineProperty(process.env, 'NODE_ENV', { value: originalEnv, writable: true })

function TestConsumer() {
  const auth = useAuth()
  return (
    <div>
      <span data-testid="user-id">{auth.user?.id || 'null'}</span>
      <span data-testid="user-email">{auth.user?.email || 'null'}</span>
      <span data-testid="user-username">{auth.user?.username || 'null'}</span>
      <span data-testid="user-role">{auth.user?.role || 'null'}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="is-admin">{String(auth.isAdmin())}</span>
      <button data-testid="logout" onClick={auth.logout}>Logout</button>
    </div>
  )
}

describe('AuthProvider (production mode)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStatus = 'authenticated'
    mockSessionData = mockSession
  })

  it('should provide user data from session', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user-id')).toHaveTextContent('user-1')
    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('user-username')).toHaveTextContent('Test User')
    expect(screen.getByTestId('user-role')).toHaveTextContent('user')
  })

  it('should report loading when session is loading', () => {
    mockStatus = 'loading'

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
  })

  it('should provide null user when not authenticated', () => {
    mockStatus = 'unauthenticated'
    mockSessionData = null

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user-id')).toHaveTextContent('null')
    expect(screen.getByTestId('loading')).toHaveTextContent('false')
  })

  it('should call signOut on logout', async () => {
    const user = userEvent.setup()
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await user.click(screen.getByTestId('logout'))
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' })
  })

  it('should correctly report admin status', () => {
    mockSessionData = {
      ...mockSession,
      user: { ...mockSession.user, role: 'admin' },
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('is-admin')).toHaveTextContent('true')
  })

  it('should correctly report non-admin status', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('is-admin')).toHaveTextContent('false')
  })

  it('should fallback username to email prefix when name is missing', () => {
    mockSessionData = {
      ...mockSession,
      user: { ...mockSession.user, name: null },
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user-username')).toHaveTextContent('test')
  })

  it('should fallback role to user when not provided', () => {
    mockSessionData = {
      ...mockSession,
      user: { ...mockSession.user, role: undefined },
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByTestId('user-role')).toHaveTextContent('user')
  })

  it('should throw when useAuth is used outside AuthProvider', () => {
    // Suppress React error boundary console output
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<TestConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    )

    spy.mockRestore()
  })
})
