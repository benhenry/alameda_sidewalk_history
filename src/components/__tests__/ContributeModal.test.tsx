import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ContributeModal from '../ContributeModal'
import { SidewalkSegment } from '@/types/sidewalk'

// Mock auth context
const mockUser = { id: 'user-1', email: 'test@test.com', username: 'TestUser', role: 'user' as const }
let currentUser: any = mockUser

jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: currentUser }),
}))

// Mock Toast
const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()
const mockShowWarning = jest.fn()
jest.mock('../Toast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showWarning: mockShowWarning,
  }),
}))

// Mock useFocusTrap
jest.mock('@/lib/useFocusTrap', () => ({
  useFocusTrap: () => React.createRef(),
}))

// Mock SegmentForm
jest.mock('../SegmentForm', () => {
  return function MockSegmentForm({ onSave, onCancel }: any) {
    return (
      <div data-testid="segment-form">
        <button onClick={() => onSave({ street: 'Park', contractor: 'Smith' })}>
          Mock Save
        </button>
        <button onClick={onCancel}>Mock Cancel</button>
      </div>
    )
  }
})

// Mock PhotoUpload
jest.mock('../PhotoUpload', () => {
  return function MockPhotoUpload({ sidewalkSegmentId }: any) {
    return <div data-testid="photo-upload">Photo Upload for {sidewalkSegmentId}</div>
  }
})

// Mock fetch
global.fetch = jest.fn()

const mockOnClose = jest.fn()
const mockOnSegmentSaved = jest.fn()

const mockSegment: SidewalkSegment = {
  id: 'seg-1',
  coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
  contractor: 'Smith Construction Co.',
  year: 1925,
  street: 'Park Street',
  block: '1400',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
}

describe('ContributeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    currentUser = mockUser
  })

  it('should not render when closed', () => {
    render(
      <ContributeModal
        isOpen={false}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )
    expect(screen.queryByText('Contribute to Alameda Sidewalk Map')).not.toBeInTheDocument()
  })

  it('should not render when user is not logged in', () => {
    currentUser = null
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )
    expect(screen.queryByText('Contribute to Alameda Sidewalk Map')).not.toBeInTheDocument()
  })

  it('should render when open and user is logged in', () => {
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )
    expect(screen.getByText('Contribute to Alameda Sidewalk Map')).toBeInTheDocument()
    expect(screen.getByText(/Help document the history/)).toBeInTheDocument()
  })

  it('should have dialog role and aria attributes', () => {
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('should show segment form by default', () => {
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )
    expect(screen.getByTestId('segment-form')).toBeInTheDocument()
    expect(screen.getByText('Guidelines for Contributing')).toBeInTheDocument()
  })

  it('should show photo tab when selectedSegment is provided', () => {
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        selectedSegment={mockSegment}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )
    expect(screen.getByText('Add Photos')).toBeInTheDocument()
  })

  it('should not show photo tab when no selectedSegment', () => {
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )
    expect(screen.queryByText('Add Photos')).not.toBeInTheDocument()
  })

  it('should switch to photo mode when photo tab clicked', async () => {
    const user = userEvent.setup()
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        selectedSegment={mockSegment}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )

    await user.click(screen.getByText('Add Photos'))
    expect(screen.getByTestId('photo-upload')).toBeInTheDocument()
    expect(screen.getByText('Photo Upload for seg-1')).toBeInTheDocument()
  })

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup()
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )

    await user.click(screen.getByLabelText('Close modal'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should call onClose when footer Close button clicked', async () => {
    const user = userEvent.setup()
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )

    // Click the "Close" text button in footer
    const closeButtons = screen.getAllByText('Close')
    await user.click(closeButtons[closeButtons.length - 1])
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('should handle segment save for new segment', async () => {
    const user = userEvent.setup()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'new-seg' }),
    })

    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )

    await user.click(screen.getByText('Mock Save'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/segments',
        expect.objectContaining({ method: 'POST' })
      )
    })

    expect(mockOnSegmentSaved).toHaveBeenCalled()
    expect(mockOnClose).toHaveBeenCalled()
    expect(mockShowSuccess).toHaveBeenCalledWith(expect.stringContaining('submitted for review'))
  })

  it('should handle segment save for existing segment', async () => {
    const user = userEvent.setup()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'seg-1' }),
    })

    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        selectedSegment={mockSegment}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )

    await user.click(screen.getByText('Mock Save'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/segments/seg-1',
        expect.objectContaining({ method: 'PUT' })
      )
    })

    expect(mockShowSuccess).toHaveBeenCalledWith('Segment updated successfully!')
  })

  it('should handle API error on save', async () => {
    const user = userEvent.setup()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({ error: 'Internal error' }),
    })

    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )

    await user.click(screen.getByText('Mock Save'))

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Internal error')
    })
  })

  it('should handle 422 validation error with invalid coordinates', async () => {
    const user = userEvent.setup()
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 422,
      json: jest.fn().mockResolvedValue({ error: 'Invalid', invalidCoordinates: true }),
    })

    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )

    await user.click(screen.getByText('Mock Save'))

    await waitFor(() => {
      expect(mockShowWarning).toHaveBeenCalledWith(expect.stringContaining('not near known sidewalk'))
    })
    // Should NOT close or save
    expect(mockOnClose).not.toHaveBeenCalled()
    expect(mockOnSegmentSaved).not.toHaveBeenCalled()
  })

  it('should show guidelines list', () => {
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )

    expect(screen.getByText(/Provide accurate contractor names/)).toBeInTheDocument()
    expect(screen.getByText(/Use precise coordinates/)).toBeInTheDocument()
  })

  it('should show thank you message in footer', () => {
    render(
      <ContributeModal
        isOpen={true}
        onClose={mockOnClose}
        onSegmentSaved={mockOnSegmentSaved}
      />
    )

    expect(screen.getByText(/Thank you for contributing/)).toBeInTheDocument()
  })
})
