import { render, screen } from '@testing-library/react'

// Mock next/navigation
const mockPathname = jest.fn()
jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

import Breadcrumb from '../Breadcrumb'

describe('Breadcrumb Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('does not render on home page', () => {
    mockPathname.mockReturnValue('/')

    const { container } = render(<Breadcrumb />)

    expect(container.querySelector('nav')).not.toBeInTheDocument()
  })

  it('renders breadcrumb on admin page', () => {
    mockPathname.mockReturnValue('/admin')

    render(<Breadcrumb />)

    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('marks current page with aria-current', () => {
    mockPathname.mockReturnValue('/admin')

    render(<Breadcrumb />)

    const currentPage = screen.getByText('Admin Dashboard')
    expect(currentPage).toHaveAttribute('aria-current', 'page')
  })

  it('renders home as a link', () => {
    mockPathname.mockReturnValue('/admin')

    render(<Breadcrumb />)

    const homeLink = screen.getByRole('link', { name: 'Home' })
    expect(homeLink).toHaveAttribute('href', '/')
  })

  it('handles nested paths', () => {
    mockPathname.mockReturnValue('/admin/settings')

    render(<Breadcrumb />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  it('capitalizes unknown route segments', () => {
    mockPathname.mockReturnValue('/custom-page')

    render(<Breadcrumb />)

    expect(screen.getByText('Custom-page')).toBeInTheDocument()
  })
})
