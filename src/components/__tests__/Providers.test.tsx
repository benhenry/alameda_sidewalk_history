import React from 'react'
import { render, screen } from '@testing-library/react'

// Mock all providers
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="session-provider">{children}</div>,
}))

jest.mock('@/lib/auth-context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
}))

jest.mock('@/lib/sidewalk-context', () => ({
  SidewalkProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="sidewalk-provider">{children}</div>,
}))

jest.mock('@/components/Toast', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
}))

jest.mock('@/lib/dev-auth', () => ({
  DevAuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="dev-auth-provider">{children}</div>,
  DevLoginBar: () => <div data-testid="dev-login-bar" />,
}))

describe('Providers', () => {
  it('should render production providers when not in development', () => {
    // Force production path by ensuring isDev is false
    // The module evaluates process.env.NODE_ENV at import time, so we set it before importing
    const originalNodeEnv = process.env.NODE_ENV
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', writable: true })

    // Clear module cache and re-import
    jest.resetModules()
    // Re-apply mocks after module reset
    jest.mock('next-auth/react', () => ({
      SessionProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="session-provider">{children}</div>,
    }))
    jest.mock('@/lib/auth-context', () => ({
      AuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="auth-provider">{children}</div>,
    }))
    jest.mock('@/lib/sidewalk-context', () => ({
      SidewalkProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="sidewalk-provider">{children}</div>,
    }))
    jest.mock('@/components/Toast', () => ({
      ToastProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="toast-provider">{children}</div>,
    }))
    jest.mock('@/lib/dev-auth', () => ({
      DevAuthProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="dev-auth-provider">{children}</div>,
      DevLoginBar: () => <div data-testid="dev-login-bar" />,
    }))

    const { Providers } = require('../Providers')

    render(<Providers><div data-testid="child">Hello</div></Providers>)

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
    // Should have sidewalk and toast providers in production path
    expect(screen.getByTestId('sidewalk-provider')).toBeInTheDocument()
    expect(screen.getByTestId('toast-provider')).toBeInTheDocument()

    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true })
  })

  it('should wrap children with provider tree', () => {
    const { Providers } = require('../Providers')

    render(
      <Providers>
        <span>Test Content</span>
      </Providers>
    )

    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })
})
