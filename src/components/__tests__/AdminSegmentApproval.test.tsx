import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the Toast hook
const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()
jest.mock('../Toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: jest.fn(),
    showWarning: jest.fn(),
  }),
}))

// Mock the api module
const mockAuthenticatedFetch = jest.fn()
jest.mock('../../lib/api', () => ({
  authenticatedFetch: (...args: any[]) => mockAuthenticatedFetch(...args),
  handleApiError: jest.fn(),
}))

// Mock AdminSegmentEditor
jest.mock('../AdminSegmentEditor', () => {
  return function MockAdminSegmentEditor({ segment, onClose, onSave }: any) {
    return (
      <div data-testid="admin-segment-editor">
        <span>Editing: {segment.street}</span>
        <button onClick={onClose}>Close Editor</button>
        <button onClick={() => onSave(segment)}>Save</button>
      </div>
    )
  }
})

// Import after mocking
import AdminSegmentApproval from '../AdminSegmentApproval'

const mockPendingSegments = [
  {
    id: '1',
    coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
    contractor: 'Smith Construction Co.',
    year: 1925,
    street: 'Park Street',
    block: '1400',
    status: 'pending',
    notes: 'Test notes',
    specialMarks: ['P'],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    createdByUsername: 'testuser',
  },
  {
    id: '2',
    coordinates: [[37.7660, -122.2420], [37.7665, -122.2425]],
    contractor: 'Johnson & Sons',
    year: 1932,
    street: 'Webster Street',
    block: '1500',
    status: 'pending',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
]

const mockAllSegments = [
  ...mockPendingSegments,
  {
    id: '3',
    coordinates: [[37.7665, -122.2425], [37.7670, -122.2430]],
    contractor: 'Davis Paving',
    year: 1945,
    street: 'Santa Clara Ave',
    block: '1600',
    status: 'approved',
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-03'),
    approvedByUsername: 'admin',
    approvedAt: new Date('2023-01-04'),
  },
]

describe('AdminSegmentApproval Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Default mock responses
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('status=pending')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPendingSegments),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAllSegments),
      })
    })
  })

  it('renders loading state initially', () => {
    render(<AdminSegmentApproval />)
    expect(screen.getByText('Loading segments for approval...')).toBeInTheDocument()
  })

  it('renders pending segments after loading', async () => {
    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Segment Approval')).toBeInTheDocument()
    })

    expect(screen.getByText('Park Street')).toBeInTheDocument()
    expect(screen.getByText('Webster Street')).toBeInTheDocument()
    expect(screen.getByText('Pending (2)')).toBeInTheDocument()
  })

  it('shows pending count badge when segments are pending', async () => {
    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('2 pending approval')).toBeInTheDocument()
    })
  })

  it('displays segment details correctly', async () => {
    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Park Street')).toBeInTheDocument()
    })

    // Check segment details
    expect(screen.getByText(/Smith Construction Co./)).toBeInTheDocument()
    expect(screen.getByText(/1925/)).toBeInTheDocument()
    expect(screen.getByText('Test notes')).toBeInTheDocument()
    expect(screen.getByText('P')).toBeInTheDocument()
    expect(screen.getByText(/Created by testuser/)).toBeInTheDocument()
  })

  it('switches between pending and all tabs', async () => {
    const user = userEvent.setup()
    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Park Street')).toBeInTheDocument()
    })

    // Click All Segments tab
    await user.click(screen.getByText('All Segments (3)'))

    // Should show all segments including approved
    await waitFor(() => {
      expect(screen.getByText('Santa Clara Ave')).toBeInTheDocument()
    })
  })

  it('shows empty state when no pending segments', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('status=pending')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('No segments pending approval')).toBeInTheDocument()
    })
  })

  it('calls onPreviewSegment when Preview button is clicked', async () => {
    const mockOnPreview = jest.fn()
    const user = userEvent.setup()

    render(<AdminSegmentApproval onPreviewSegment={mockOnPreview} />)

    await waitFor(() => {
      expect(screen.getByText('Park Street')).toBeInTheDocument()
    })

    const previewButtons = screen.getAllByText('Preview on Map')
    await user.click(previewButtons[0])

    expect(mockOnPreview).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', street: 'Park Street' })
    )
  })

  it('handles approve action correctly', async () => {
    const user = userEvent.setup()

    mockAuthenticatedFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      if (url.includes('status=pending')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPendingSegments),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAllSegments),
      })
    })

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Park Street')).toBeInTheDocument()
    })

    const approveButtons = screen.getAllByText('Approve')
    await user.click(approveButtons[0])

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        '/api/admin/segments',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ segmentId: '1', action: 'approve' }),
        })
      )
    })

    expect(mockShowSuccess).toHaveBeenCalledWith('Segment approved successfully!')
  })

  it('handles reject action correctly', async () => {
    const user = userEvent.setup()

    mockAuthenticatedFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'PATCH') {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      if (url.includes('status=pending')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPendingSegments),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAllSegments),
      })
    })

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Park Street')).toBeInTheDocument()
    })

    const rejectButtons = screen.getAllByText('Reject')
    await user.click(rejectButtons[0])

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        '/api/admin/segments',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ segmentId: '1', action: 'reject' }),
        })
      )
    })

    expect(mockShowSuccess).toHaveBeenCalledWith('Segment rejected successfully!')
  })

  it('shows error toast when API fails', async () => {
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      if (url.includes('status=pending')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    })

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to load segments for approval')
    })
  })

  it('opens edit modal when Edit button is clicked', async () => {
    const user = userEvent.setup()

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Park Street')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('admin-segment-editor')).toBeInTheDocument()
      expect(screen.getByText('Editing: Park Street')).toBeInTheDocument()
    })
  })

  it('closes edit modal when Close Editor is clicked', async () => {
    const user = userEvent.setup()

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Park Street')).toBeInTheDocument()
    })

    const editButtons = screen.getAllByText('Edit')
    await user.click(editButtons[0])

    await waitFor(() => {
      expect(screen.getByTestId('admin-segment-editor')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Close Editor'))

    await waitFor(() => {
      expect(screen.queryByTestId('admin-segment-editor')).not.toBeInTheDocument()
    })
  })

  it('shows status badges correctly', async () => {
    const user = userEvent.setup()

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Park Street')).toBeInTheDocument()
    })

    // Click All Segments to see approved segments
    await user.click(screen.getByText('All Segments (3)'))

    await waitFor(() => {
      // Should show pending badges
      const pendingBadges = screen.getAllByText('Pending')
      expect(pendingBadges.length).toBeGreaterThan(0)

      // Should show approved badge
      expect(screen.getByText('Approved')).toBeInTheDocument()
    })
  })

  it('disables buttons while processing', async () => {
    const user = userEvent.setup()

    // Make the PATCH request slow
    mockAuthenticatedFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'PATCH') {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ ok: true, json: () => Promise.resolve({}) })
          }, 500) // Longer delay to catch the processing state
        })
      }
      if (url.includes('status=pending')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockPendingSegments),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockAllSegments),
      })
    })

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Park Street')).toBeInTheDocument()
    })

    const approveButtons = screen.getAllByText('Approve')
    await user.click(approveButtons[0])

    // Button should show processing state - check for disabled state instead
    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /Approve|Processing/i })
      // At least one button should be disabled
      expect(buttons.some(btn => btn.hasAttribute('disabled') || btn.textContent?.includes('Processing'))).toBe(true)
    })
  })
})
