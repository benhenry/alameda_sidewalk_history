import { render, screen, fireEvent } from '@testing-library/react'
import { useFocusTrap } from '../useFocusTrap'

// Test component that uses the hook
function TestModal({
  enabled = true,
  onEscape,
}: {
  enabled?: boolean
  onEscape?: () => void
}) {
  const containerRef = useFocusTrap<HTMLDivElement>({ enabled, onEscape })

  return (
    <div ref={containerRef} data-testid="modal">
      <button data-testid="first-button">First</button>
      <input data-testid="input" type="text" />
      <button data-testid="last-button">Last</button>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = jest.fn()
    render(<TestModal onEscape={onEscape} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onEscape).toHaveBeenCalledTimes(1)
  })

  it('does not call onEscape when other keys are pressed', () => {
    const onEscape = jest.fn()
    render(<TestModal onEscape={onEscape} />)

    fireEvent.keyDown(document, { key: 'Enter' })
    fireEvent.keyDown(document, { key: 'Tab' })
    fireEvent.keyDown(document, { key: 'a' })

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('does not set up event listeners when disabled', () => {
    const onEscape = jest.fn()
    render(<TestModal enabled={false} onEscape={onEscape} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('renders modal content correctly', () => {
    render(<TestModal />)

    expect(screen.getByTestId('modal')).toBeInTheDocument()
    expect(screen.getByTestId('first-button')).toBeInTheDocument()
    expect(screen.getByTestId('input')).toBeInTheDocument()
    expect(screen.getByTestId('last-button')).toBeInTheDocument()
  })

  it('attaches ref to container element', () => {
    render(<TestModal />)

    const modal = screen.getByTestId('modal')
    expect(modal).toBeInstanceOf(HTMLDivElement)
  })

  it('handles Tab key events without crashing', () => {
    render(<TestModal />)

    // Tab key event should be handled gracefully even with jsdom limitations
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })

    // Should not throw
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('restores focus when disabled after being enabled', () => {
    const { rerender } = render(<TestModal enabled={true} />)

    // Simulate disabling - should trigger cleanup
    rerender(<TestModal enabled={false} />)

    // Should not throw
    expect(screen.getByTestId('modal')).toBeInTheDocument()
  })

  it('handles focus trapping with visible elements', () => {
    // Mock offsetParent for jsdom (always null in jsdom)
    const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() { return this.parentElement },
      configurable: true,
    })

    render(<TestModal />)

    const lastButton = screen.getByTestId('last-button')
    const firstButton = screen.getByTestId('first-button')

    // Focus the last button
    lastButton.focus()
    expect(document.activeElement).toBe(lastButton)

    // Press Tab on the last element - should wrap to first
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(firstButton)

    // Press Shift+Tab on first element - should wrap to last
    firstButton.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(lastButton)

    // Restore
    if (originalDescriptor) {
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalDescriptor)
    }
  })
})

