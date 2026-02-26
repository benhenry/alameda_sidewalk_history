import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

const mockSignIn = jest.fn()
jest.mock('next-auth/react', () => ({
  signIn: (...args: any[]) => mockSignIn(...args),
}))

jest.mock('@/lib/useFocusTrap', () => ({
  useFocusTrap: () => React.createRef(),
}))

import AuthModal from '../AuthModal'

describe('AuthModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should not render when closed', () => {
    render(<AuthModal isOpen={false} onClose={jest.fn()} />)
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()
  })

  it('should render when open', () => {
    render(<AuthModal isOpen={true} onClose={jest.fn()} />)
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('should have accessible dialog role', () => {
    render(<AuthModal isOpen={true} onClose={jest.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should show Google and GitHub sign in buttons', () => {
    render(<AuthModal isOpen={true} onClose={jest.fn()} />)
    expect(screen.getByText('Continue with Google')).toBeInTheDocument()
    expect(screen.getByText('Continue with GitHub')).toBeInTheDocument()
  })

  it('should call signIn with google when Google button clicked', () => {
    render(<AuthModal isOpen={true} onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Continue with Google'))
    expect(mockSignIn).toHaveBeenCalledWith('google', { callbackUrl: '/' })
  })

  it('should call signIn with github when GitHub button clicked', () => {
    render(<AuthModal isOpen={true} onClose={jest.fn()} />)
    fireEvent.click(screen.getByText('Continue with GitHub'))
    expect(mockSignIn).toHaveBeenCalledWith('github', { callbackUrl: '/' })
  })

  it('should call onClose when close button clicked', () => {
    const onClose = jest.fn()
    render(<AuthModal isOpen={true} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('Close modal'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should show contributing message', () => {
    render(<AuthModal isOpen={true} onClose={jest.fn()} />)
    expect(screen.getByText(/contribute constructively/i)).toBeInTheDocument()
  })
})
