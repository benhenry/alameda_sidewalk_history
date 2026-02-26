import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DevAuthProvider, useDevAuth, DevLoginBar } from '../dev-auth'

// Test helper component that exposes devAuth context
function TestConsumer() {
  const auth = useDevAuth()
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.username : 'null'}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
      <span data-testid="is-admin">{String(auth.isAdmin())}</span>
      <span data-testid="dev-mode">{String(auth.devMode)}</span>
      <span data-testid="session">{auth.session ? 'active' : 'null'}</span>
      <button data-testid="login-admin" onClick={auth.loginAsAdmin}>Login Admin</button>
      <button data-testid="login-user" onClick={auth.loginAsUser}>Login User</button>
      <button data-testid="logout" onClick={auth.logout}>Logout</button>
    </div>
  )
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => { store[key] = value }),
    removeItem: jest.fn((key: string) => { delete store[key] }),
    clear: jest.fn(() => { store = {} }),
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('DevAuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  it('should throw when useDevAuth is used outside provider', () => {
    // Suppress console.error for expected error
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useDevAuth must be used within a DevAuthProvider')
    spy.mockRestore()
  })

  it('should start with no user and loading=true then loading=false', async () => {
    render(
      <DevAuthProvider>
        <TestConsumer />
      </DevAuthProvider>
    )

    // After useEffect runs, loading should be false
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(screen.getByTestId('session')).toHaveTextContent('null')
  })

  it('should login as admin', async () => {
    const user = userEvent.setup()
    render(
      <DevAuthProvider>
        <TestConsumer />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await user.click(screen.getByTestId('login-admin'))

    expect(screen.getByTestId('user')).toHaveTextContent('DevAdmin')
    expect(screen.getByTestId('is-admin')).toHaveTextContent('true')
    expect(screen.getByTestId('session')).toHaveTextContent('active')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('dev-auth-user', expect.any(String))
  })

  it('should login as user', async () => {
    const user = userEvent.setup()
    render(
      <DevAuthProvider>
        <TestConsumer />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await user.click(screen.getByTestId('login-user'))

    expect(screen.getByTestId('user')).toHaveTextContent('DevUser')
    expect(screen.getByTestId('is-admin')).toHaveTextContent('false')
  })

  it('should logout', async () => {
    const user = userEvent.setup()
    render(
      <DevAuthProvider>
        <TestConsumer />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })

    await user.click(screen.getByTestId('login-admin'))
    expect(screen.getByTestId('user')).toHaveTextContent('DevAdmin')

    await user.click(screen.getByTestId('logout'))
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(screen.getByTestId('session')).toHaveTextContent('null')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('dev-auth-user')
  })

  it('should restore user from localStorage on mount', async () => {
    const savedUser = {
      id: 'dev-admin-001',
      email: 'admin@dev.local',
      username: 'DevAdmin',
      role: 'admin',
      image: null,
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedUser))

    render(
      <DevAuthProvider>
        <TestConsumer />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('DevAdmin')
    })
  })

  it('should handle invalid localStorage data gracefully', async () => {
    localStorageMock.getItem.mockReturnValue('invalid-json{{{')

    render(
      <DevAuthProvider>
        <TestConsumer />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false')
    })
    expect(screen.getByTestId('user')).toHaveTextContent('null')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('dev-auth-user')
  })

  it('should report devMode=true', async () => {
    render(
      <DevAuthProvider>
        <TestConsumer />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('dev-mode')).toHaveTextContent('true')
    })
  })
})

describe('DevLoginBar', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.clear()
  })

  it('should render dev mode label', async () => {
    render(
      <DevAuthProvider>
        <DevLoginBar />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DEV MODE')).toBeInTheDocument()
    })
  })

  it('should show "Not logged in" when no user', async () => {
    render(
      <DevAuthProvider>
        <DevLoginBar />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Not logged in')).toBeInTheDocument()
    })
  })

  it('should show login buttons', async () => {
    render(
      <DevAuthProvider>
        <DevLoginBar />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Login as User')).toBeInTheDocument()
      expect(screen.getByText('Login as Admin')).toBeInTheDocument()
    })
  })

  it('should show logged in user info after login', async () => {
    const user = userEvent.setup()
    render(
      <DevAuthProvider>
        <DevLoginBar />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Login as Admin')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Login as Admin'))

    await waitFor(() => {
      expect(screen.getByText('DevAdmin')).toBeInTheDocument()
    })
    expect(screen.getByText(/\(admin\)/)).toBeInTheDocument()
  })

  it('should show logout button when logged in', async () => {
    const user = userEvent.setup()
    render(
      <DevAuthProvider>
        <DevLoginBar />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Login as User')).toBeInTheDocument()
    })

    // Initially no logout button
    expect(screen.queryByText('Logout')).not.toBeInTheDocument()

    await user.click(screen.getByText('Login as User'))

    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  it('should hide logout button after logging out', async () => {
    const user = userEvent.setup()
    render(
      <DevAuthProvider>
        <DevLoginBar />
      </DevAuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Login as Admin')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Login as Admin'))
    expect(screen.getByText('Logout')).toBeInTheDocument()

    await user.click(screen.getByText('Logout'))
    expect(screen.queryByText('Logout')).not.toBeInTheDocument()
    expect(screen.getByText('Not logged in')).toBeInTheDocument()
  })
})
