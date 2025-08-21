import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../auth-context'

// Mock fetch
global.fetch = jest.fn()

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

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  it('should provide initial loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('loading')).toHaveTextContent('true')
    expect(screen.getByTestId('user')).toHaveTextContent('null')
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

    expect(localStorage.getItem('token')).toBe('test-token')
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

    expect(localStorage.getItem('token')).toBeNull()
  })

  it('should handle logout', async () => {
    // Set up initial logged-in state
    localStorage.setItem('token', 'test-token')
    
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
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('should handle token validation on mount', async () => {
    localStorage.setItem('token', 'test-token')
    
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'user'
    }

    const mockResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({ user: mockUser })
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
    localStorage.setItem('token', 'invalid-token')
    
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

    expect(localStorage.getItem('token')).toBeNull()
  })
})