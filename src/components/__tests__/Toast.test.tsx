import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../Toast'

// Test component that exposes toast methods
function ToastTrigger() {
  const { showToast, showSuccess, showError, showInfo, showWarning } = useToast()
  return (
    <div>
      <button onClick={() => showToast('Generic toast')}>Show Toast</button>
      <button onClick={() => showSuccess('Success!')}>Show Success</button>
      <button onClick={() => showError('Error!')}>Show Error</button>
      <button onClick={() => showInfo('Info!')}>Show Info</button>
      <button onClick={() => showWarning('Warning!')}>Show Warning</button>
      <button onClick={() => showToast('Custom duration', 'info', 1000)}>Custom Duration</button>
    </div>
  )
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <ToastTrigger />
    </ToastProvider>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('useToast', () => {
    it('should throw when used outside ToastProvider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      expect(() => render(<ToastTrigger />)).toThrow('useToast must be used within a ToastProvider')
      consoleSpy.mockRestore()
    })
  })

  describe('ToastProvider', () => {
    it('should render children', () => {
      render(
        <ToastProvider>
          <div data-testid="child">Hello</div>
        </ToastProvider>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('should show a toast notification', async () => {
      renderWithProvider()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      await user.click(screen.getByText('Show Toast'))

      expect(screen.getByText('Generic toast')).toBeInTheDocument()
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })

    it('should show success toast', async () => {
      renderWithProvider()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      await user.click(screen.getByText('Show Success'))

      expect(screen.getByText('Success!')).toBeInTheDocument()
    })

    it('should show error toast', async () => {
      renderWithProvider()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      await user.click(screen.getByText('Show Error'))

      expect(screen.getByText('Error!')).toBeInTheDocument()
    })

    it('should show info toast', async () => {
      renderWithProvider()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      await user.click(screen.getByText('Show Info'))

      expect(screen.getByText('Info!')).toBeInTheDocument()
    })

    it('should show warning toast', async () => {
      renderWithProvider()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      await user.click(screen.getByText('Show Warning'))

      expect(screen.getByText('Warning!')).toBeInTheDocument()
    })

    it('should auto-dismiss toast after default duration', async () => {
      renderWithProvider()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      await user.click(screen.getByText('Show Info'))
      expect(screen.getByText('Info!')).toBeInTheDocument()

      act(() => {
        jest.advanceTimersByTime(4000)
      })

      expect(screen.queryByText('Info!')).not.toBeInTheDocument()
    })

    it('should dismiss toast on close button click', async () => {
      renderWithProvider()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      await user.click(screen.getByText('Show Success'))
      expect(screen.getByText('Success!')).toBeInTheDocument()

      await user.click(screen.getByLabelText('Dismiss notification'))

      expect(screen.queryByText('Success!')).not.toBeInTheDocument()
    })

    it('should show multiple toasts simultaneously', async () => {
      renderWithProvider()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })

      await user.click(screen.getByText('Show Success'))
      await user.click(screen.getByText('Show Error'))

      expect(screen.getByText('Success!')).toBeInTheDocument()
      expect(screen.getByText('Error!')).toBeInTheDocument()
    })

    it('should have aria-live polite on container', () => {
      renderWithProvider()
      const container = document.querySelector('[aria-live="polite"]')
      expect(container).toBeInTheDocument()
    })
  })
})
