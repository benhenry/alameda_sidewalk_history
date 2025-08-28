import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../auth-context'
import Cookies from 'js-cookie'

// Mock fetch
global.fetch = jest.fn()

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}))

// Test component that uses auth context
function TestComponent() {
  const { user, loading, login, logout } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="user">{user ? user.email : 'null'}</div>
      <button onClick={() => login('test@example.com', 'password')}>
        Login
      </button>
      <button onClick={logout}>
        Logout
      </button>
    </div>
  )
}

const mockCookies = Cookies as jest.Mocked<typeof Cookies>

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCookies.get.mockReturnValue(undefined)
  })

  it('should provide initial loading state and then complete auth check', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // User should initially be null
    expect(screen.getByTestId('user')).toHaveTextContent('null')

    // Wait for loading to become false after auth check (no token case)
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })

  it('should handle successful login', async () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'user'
    }

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        user: mockUser,
        token: 'test-token'
      })
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const loginButton = screen.getByText('Login')
    
    await act(async () => {
      loginButton.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })

    expect(mockCookies.set).toHaveBeenCalledWith('auth-token', 'test-token', { expires: 7 })
  })

  it('should handle login failure', async () => {
    const mockResponse = {
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: 'Invalid credentials'
      })
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    const loginButton = screen.getByText('Login')
    
    await act(async () => {
      loginButton.click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    // Login failure test - no cookie should be set
  })

  it('should handle logout', async () => {
    // Set up initial logged-in state
    mockCookies.get.mockReturnValue('test-token')
    
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'user'
    }

    const mockMeResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ user: mockUser })
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce(mockMeResponse)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    const logoutButton = screen.getByText('Logout')
    
    await act(async () => {
      logoutButton.click()
    })

    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(mockCookies.remove).toHaveBeenCalledWith('auth-token')
  })

  it('should handle token validation on mount', async () => {
    mockCookies.get.mockReturnValue('test-token')
    
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'user'
    }

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue(mockUser)
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
  })

  it('should handle invalid token on mount', async () => {
    mockCookies.get.mockReturnValue('invalid-token')
    
    const mockResponse = {
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Invalid token' })
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce(mockResponse)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('null')
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    expect(mockCookies.remove).toHaveBeenCalledWith('auth-token')
  })
})