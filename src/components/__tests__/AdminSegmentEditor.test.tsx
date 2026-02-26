import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdminSegmentEditor from '../AdminSegmentEditor'
import { SidewalkSegment } from '@/types/sidewalk'

// Mock the Toast hook
jest.mock('../Toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showInfo: jest.fn(),
    showWarning: jest.fn(),
  }),
}))

// Mock InteractiveSegmentDrawer
jest.mock('../InteractiveSegmentDrawer', () => {
  return function MockInteractiveSegmentDrawer({ onCoordinatesChange, initialCoordinates }: any) {
    return (
      <div data-testid="interactive-drawer">
        <span>Mock Drawer ({initialCoordinates?.length || 0} points)</span>
        <button
          data-testid="add-point"
          onClick={() => onCoordinatesChange([...(initialCoordinates || []), [37.77, -122.25]])}
        >
          Add Point
        </button>
      </div>
    )
  }
})

// Mock the api module
const mockAuthenticatedFetch = jest.fn()
jest.mock('@/lib/api', () => ({
  authenticatedFetch: (...args: any[]) => mockAuthenticatedFetch(...args),
  handleApiError: jest.fn(),
}))

const mockSegment: SidewalkSegment = {
  id: 'seg-1',
  coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
  contractor: 'Smith Construction Co.',
  year: 1925,
  street: 'Park Street',
  block: '1400',
  specialMarks: ['P'],
  notes: 'Well-preserved stamp',
  status: 'pending',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
}

const mockOnClose = jest.fn()
const mockOnSave = jest.fn()

describe('AdminSegmentEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders with segment data pre-filled', () => {
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Edit Segment')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Park Street')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1400')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Smith Construction Co.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1925')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Well-preserved stamp')).toBeInTheDocument()
    expect(screen.getByDisplayValue('P')).toBeInTheDocument()
  })

  it('renders status select with correct value', () => {
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const statusSelect = screen.getByDisplayValue('Pending')
    expect(statusSelect).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    // Click the X button (first close button in header)
    const closeButtons = screen.getAllByRole('button')
    const xButton = closeButtons.find(btn => btn.querySelector('svg'))
    if (xButton) {
      await user.click(xButton)
    }

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    await user.click(screen.getByText('Cancel'))
    expect(mockOnClose).toHaveBeenCalled()
  })

  it('updates form fields on input change', async () => {
    const user = userEvent.setup()
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const streetInput = screen.getByDisplayValue('Park Street')
    await user.clear(streetInput)
    await user.type(streetInput, 'Webster Street')
    expect(streetInput).toHaveValue('Webster Street')
  })

  it('handles year input as number', async () => {
    const user = userEvent.setup()
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const yearInput = screen.getByDisplayValue('1925')
    await user.clear(yearInput)
    await user.type(yearInput, '1930')
    expect(yearInput).toHaveValue(1930)
  })

  it('handles special marks change (comma-separated)', () => {
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const marksInput = screen.getByDisplayValue('P')
    // Use fireEvent.change since the handler reformats on each keystroke
    fireEvent.change(marksInput, { target: { value: 'P, D, Logo' } })
    expect(marksInput).toHaveValue('P, D, Logo')
  })

  it('submits form successfully', async () => {
    const user = userEvent.setup()
    const updatedSegment = { ...mockSegment, street: 'Park Street' }
    mockAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(updatedSegment),
    })

    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        '/api/admin/segments/seg-1',
        expect.objectContaining({ method: 'PUT' })
      )
    })

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(updatedSegment)
    })
  })

  it('shows error when required fields are missing', async () => {
    const user = userEvent.setup()
    render(
      <AdminSegmentEditor
        segment={{ ...mockSegment, street: '' }}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText('Please fill in all required fields')).toBeInTheDocument()
    })
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('shows error when API returns error', async () => {
    const user = userEvent.setup()
    mockAuthenticatedFetch.mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: 'Server error' }),
    })

    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    await user.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument()
    })
  })

  it('shows saving state while submitting', async () => {
    mockAuthenticatedFetch.mockReturnValue(new Promise(() => {})) // never resolves

    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    fireEvent.click(screen.getByText('Save Changes'))

    await waitFor(() => {
      expect(screen.getByText('Saving...')).toBeInTheDocument()
    })
  })

  it('toggles map editor visibility', async () => {
    const user = userEvent.setup()
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    // Map should be visible by default
    expect(screen.getByTestId('interactive-drawer')).toBeInTheDocument()
    expect(screen.getByText('Hide Map Editor')).toBeInTheDocument()

    // Click to hide
    await user.click(screen.getByText('Hide Map Editor'))
    expect(screen.queryByTestId('interactive-drawer')).not.toBeInTheDocument()
    expect(screen.getByText('Edit on Map')).toBeInTheDocument()

    // Click to show again
    await user.click(screen.getByText('Edit on Map'))
    expect(screen.getByTestId('interactive-drawer')).toBeInTheDocument()
  })

  it('shows coordinate count', () => {
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Coordinates (2 points)')).toBeInTheDocument()
  })

  it('shows coordinate list when map is hidden', async () => {
    const user = userEvent.setup()
    render(
      <AdminSegmentEditor
        segment={mockSegment}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    await user.click(screen.getByText('Hide Map Editor'))

    expect(screen.getByText(/Point 1:/)).toBeInTheDocument()
    expect(screen.getByText(/Point 2:/)).toBeInTheDocument()
  })

  it('handles segment with no special marks', () => {
    const segmentNoMarks = { ...mockSegment, specialMarks: undefined }
    render(
      <AdminSegmentEditor
        segment={segmentNoMarks}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByPlaceholderText('P, D, Logo, etc. (comma-separated)')).toBeInTheDocument()
  })

  it('handles segment with no notes', () => {
    const segmentNoNotes = { ...mockSegment, notes: undefined }
    render(
      <AdminSegmentEditor
        segment={segmentNoNotes}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByPlaceholderText('Additional notes about this segment...')).toHaveValue('')
  })
})
