import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

const mockLogout = jest.fn()
const mockIsAdmin = jest.fn()
const mockUser = { username: 'testuser', email: 'test@example.com' }

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
    logout: mockLogout,
    isAdmin: mockIsAdmin,
  }),
}))

import UserMenu from '../UserMenu'

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsAdmin.mockReturnValue(false)
  })

  it('should render user avatar with first letter', () => {
    render(<UserMenu />)
    expect(screen.getByText('T')).toBeInTheDocument() // 'testuser' -> 'T'
  })

  it('should display username', () => {
    render(<UserMenu />)
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('should toggle menu on click', () => {
    render(<UserMenu />)

    // Menu should be closed initially
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()

    // Click to open
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Sign Out')).toBeInTheDocument()

    // Click again to close
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
  })

  it('should show admin badge for admin users', () => {
    mockIsAdmin.mockReturnValue(true)
    render(<UserMenu />)

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    expect(screen.getByText('Admin Panel')).toBeInTheDocument()
  })

  it('should not show admin panel link for non-admin', () => {
    mockIsAdmin.mockReturnValue(false)
    render(<UserMenu />)

    fireEvent.click(screen.getByRole('button'))
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument()
  })

  it('should call logout on sign out click', () => {
    render(<UserMenu />)

    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Sign Out'))

    expect(mockLogout).toHaveBeenCalled()
  })

  it('should show settings option', () => {
    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('should show email in dropdown', () => {
    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('should close menu when clicking outside', () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <UserMenu />
      </div>
    )

    // Open the menu
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('Sign Out')).toBeInTheDocument()

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText('Sign Out')).not.toBeInTheDocument()
  })

  it('should navigate to settings on Settings click', () => {
    // Mock window.location
    const originalLocation = window.location
    delete (window as any).location
    window.location = { ...originalLocation, href: '' } as any

    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Settings'))

    expect(window.location.href).toBe('/api/auth/me')

    // Restore
    ;(window as any).location = originalLocation
  })

  it('should navigate to admin panel on Admin Panel click', () => {
    mockIsAdmin.mockReturnValue(true)
    const originalLocation = window.location
    delete (window as any).location
    window.location = { ...originalLocation, href: '' } as any

    render(<UserMenu />)
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('Admin Panel'))

    expect(window.location.href).toBe('/admin')

    // Restore
    ;(window as any).location = originalLocation
  })
})
