import { render, screen, fireEvent } from '@testing-library/react'
import SkipLink from '../SkipLink'

describe('SkipLink Component', () => {
  beforeEach(() => {
    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = jest.fn()

    // Create a mock main content element
    const mainContent = document.createElement('div')
    mainContent.id = 'main-content'
    mainContent.tabIndex = -1
    document.body.appendChild(mainContent)
  })

  afterEach(() => {
    // Clean up
    const mainContent = document.getElementById('main-content')
    if (mainContent) {
      mainContent.remove()
    }
  })

  it('renders with default text', () => {
    render(<SkipLink />)

    expect(screen.getByText('Skip to main content')).toBeInTheDocument()
  })

  it('renders with custom text', () => {
    render(<SkipLink>Skip to navigation</SkipLink>)

    expect(screen.getByText('Skip to navigation')).toBeInTheDocument()
  })

  it('has default href pointing to main-content', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('accepts custom href', () => {
    render(<SkipLink href="#sidebar">Skip to sidebar</SkipLink>)

    const link = screen.getByRole('link', { name: 'Skip to sidebar' })
    expect(link).toHaveAttribute('href', '#sidebar')
  })

  it('focuses target element on click', () => {
    render(<SkipLink />)

    const mainContent = document.getElementById('main-content')
    const focusSpy = jest.spyOn(mainContent!, 'focus')

    const link = screen.getByRole('link', { name: 'Skip to main content' })
    fireEvent.click(link)

    expect(focusSpy).toHaveBeenCalled()
  })

  it('is visually hidden by default (has sr-only class)', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })
    expect(link).toHaveClass('sr-only')
  })

  it('becomes visible on focus (has focus:not-sr-only class)', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })
    expect(link).toHaveClass('focus:not-sr-only')
  })
})
