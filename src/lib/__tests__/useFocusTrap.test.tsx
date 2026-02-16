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
})

