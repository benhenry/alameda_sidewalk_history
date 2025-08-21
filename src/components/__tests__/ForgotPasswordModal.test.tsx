import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ForgotPasswordModal from '../ForgotPasswordModal'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('ForgotPasswordModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onBackToLogin: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when isOpen is false', () => {
    render(<ForgotPasswordModal {...defaultProps} isOpen={false} />)
    expect(screen.queryByText('Forgot Password')).not.toBeInTheDocument()
  })

  it('should render forgot password form when isOpen is true', () => {
    render(<ForgotPasswordModal {...defaultProps} />)
    
    expect(screen.getByText('Forgot Password')).toBeInTheDocument()
    expect(screen.getByText('Enter your email address and we\'ll send you a link to reset your password.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send Reset Link' })).toBeInTheDocument()
  })

  it('should call onClose when X button is clicked', () => {
    render(<ForgotPasswordModal {...defaultProps} />)
    
    const closeButton = screen.getByRole('button', { name: '' }) // X button has no text
    fireEvent.click(closeButton)
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
  })

  it('should call onBackToLogin when Back to Login button is clicked', () => {
    render(<ForgotPasswordModal {...defaultProps} />)
    
    const backButton = screen.getByRole('button', { name: 'Back to Login' })
    fireEvent.click(backButton)
    
    expect(defaultProps.onBackToLogin).toHaveBeenCalledTimes(1)
  })

  it('should disable submit button when email is empty', () => {
    render(<ForgotPasswordModal {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
    expect(submitButton).toBeDisabled()
  })

  it('should enable submit button when email is entered', () => {
    render(<ForgotPasswordModal {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
    expect(submitButton).not.toBeDisabled()
  })

  it('should show loading state when form is submitted', async () => {
    mockFetch.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'Success' })
      } as Response), 100))
    )

    render(<ForgotPasswordModal {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Sending...' })).not.toBeInTheDocument()
    })
  })

  it('should submit form with correct data', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: 'Success' })
    } as Response)

    render(<ForgotPasswordModal {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com' }),
      })
    })
  })

  it('should show success message after successful submission', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: 'Success' })
    } as Response)

    render(<ForgotPasswordModal {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByText(/If an account with the email address/)).toBeInTheDocument()
    expect(screen.getByText('test@example.com', { exact: false })).toBeInTheDocument()
  })

  it('should show error message on API failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' })
    } as Response)

    render(<ForgotPasswordModal {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('should show network error message on fetch failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    render(<ForgotPasswordModal {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument()
    })
  })

  it('should call onBackToLogin from success screen', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: 'Success' })
    } as Response)

    render(<ForgotPasswordModal {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument()
    })

    const backToLoginButton = screen.getByRole('button', { name: 'Back to Login' })
    fireEvent.click(backToLoginButton)
    
    expect(defaultProps.onBackToLogin).toHaveBeenCalledTimes(1)
  })

  it('should reset form state when closing and reopening', async () => {
    const { rerender } = render(<ForgotPasswordModal {...defaultProps} />)
    
    // Enter email and submit
    const emailInput = screen.getByLabelText('Email Address')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    
    // Close modal
    rerender(<ForgotPasswordModal {...defaultProps} isOpen={false} />)
    
    // Reopen modal
    rerender(<ForgotPasswordModal {...defaultProps} isOpen={true} />)
    
    // Email should be reset
    const newEmailInput = screen.getByLabelText('Email Address') as HTMLInputElement
    expect(newEmailInput.value).toBe('')
  })

  it('should validate email format', () => {
    render(<ForgotPasswordModal {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('required')
  })

  it('should disable inputs when loading', async () => {
    let resolvePromise: (value: Response) => void
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    
    mockFetch.mockImplementation(() => pendingPromise)

    render(<ForgotPasswordModal {...defaultProps} />)
    
    const emailInput = screen.getByLabelText('Email Address')
    const submitButton = screen.getByRole('button', { name: 'Send Reset Link' })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)
    
    // Verify inputs are disabled during loading
    expect(emailInput).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sending...' })).toBeInTheDocument()
    
    // Resolve the promise to complete the request
    resolvePromise!({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: 'Success' })
    } as Response)
    
    // Wait for the success state
    await waitFor(() => {
      expect(screen.getByText('Check Your Email')).toBeInTheDocument()
    })
  })
})