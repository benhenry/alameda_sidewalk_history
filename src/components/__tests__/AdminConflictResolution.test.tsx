import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the Toast hook
const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()
const mockShowInfo = jest.fn()
jest.mock('../Toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
    showSuccess: mockShowSuccess,
    showError: mockShowError,
    showInfo: mockShowInfo,
    showWarning: jest.fn(),
  }),
}))

// Mock the api module
const mockAuthenticatedFetch = jest.fn()
jest.mock('../../lib/api', () => ({
  authenticatedFetch: (...args: any[]) => mockAuthenticatedFetch(...args),
  handleApiError: jest.fn(),
}))

// Mock window.confirm
const mockConfirm = jest.fn()
window.confirm = mockConfirm

// Import after mocking
import AdminConflictResolution from '../AdminConflictResolution'

const mockConflicts = [
  {
    id: 'conflict-1',
    segment1_id: 'seg-1',
    segment1_street: 'Park Street',
    segment1_block: '1400',
    segment1_contractor: 'Smith Construction',
    segment2_id: 'seg-2',
    segment2_street: 'Park Street',
    segment2_block: '1400',
    segment2_contractor: 'Johnson & Sons',
    overlap_length_meters: 5.5,
    status: 'open',
    created_at: '2023-01-01T00:00:00Z',
  },
  {
    id: 'conflict-2',
    segment1_id: 'seg-3',
    segment1_street: 'Webster Street',
    segment1_block: '1500',
    segment1_contractor: 'Davis Paving',
    segment2_id: 'seg-4',
    segment2_street: 'Webster Street',
    segment2_block: '1500',
    segment2_contractor: 'City Works',
    overlap_length_meters: 3.2,
    status: 'resolved',
    resolution_action: 'accept_overlap',
    resolved_by_username: 'admin',
    resolved_at: '2023-01-05T00:00:00Z',
    created_at: '2023-01-02T00:00:00Z',
  },
]

describe('AdminConflictResolution Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConfirm.mockReturnValue(true)
    // Default mock response
    mockAuthenticatedFetch.mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ conflicts: mockConflicts }),
      })
    })
  })

  it('renders loading state initially', () => {
    render(<AdminConflictResolution />)
    expect(screen.getByText('Loading conflicts...')).toBeInTheDocument()
  })

  it('renders conflict list after loading', async () => {
    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getByText('Overlap Conflicts')).toBeInTheDocument()
    })

    // Both segments are on Park Street, so there are multiple matches
    expect(screen.getAllByText(/Park Street/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Smith Construction/)).toBeInTheDocument()
  })

  it('shows open conflicts count', async () => {
    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getByText(/1 open conflicts/)).toBeInTheDocument()
    })
  })

  it('displays conflict details correctly', async () => {
    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getAllByText(/Park Street/).length).toBeGreaterThan(0)
    })

    expect(screen.getByText(/5.5m overlap/)).toBeInTheDocument()
    expect(screen.getAllByText(/Block 1400/).length).toBeGreaterThan(0)
  })

  it('runs overlap detection when button is clicked', async () => {
    const user = userEvent.setup()

    mockAuthenticatedFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url === '/api/admin/conflicts') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ detected: 3 }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ conflicts: mockConflicts }),
      })
    })

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getByText('Overlap Conflicts')).toBeInTheDocument()
    })

    const detectButton = screen.getByText('Run Detection')
    await user.click(detectButton)

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        '/api/admin/conflicts',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ minOverlapMeters: 1 }),
        })
      )
    })

    expect(mockShowInfo).toHaveBeenCalledWith('Detection complete: 3 overlaps found')
  })

  it('switches between open and all tabs', async () => {
    const user = userEvent.setup()

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getByText('Overlap Conflicts')).toBeInTheDocument()
    })

    // By default shows open conflicts only
    expect(screen.getByText('Open (1)')).toBeInTheDocument()
    expect(screen.getByText('All Conflicts (2)')).toBeInTheDocument()

    // Click All Conflicts tab
    await user.click(screen.getByText('All Conflicts (2)'))

    // Should show all including resolved
    await waitFor(() => {
      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })
  })

  it('shows empty state when no open conflicts', async () => {
    mockAuthenticatedFetch.mockImplementation(() => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ conflicts: [] }),
      })
    })

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getByText(/No open conflicts/)).toBeInTheDocument()
    })
  })

  it('calls onPreviewSegments when Preview button is clicked', async () => {
    const mockOnPreview = jest.fn()
    const user = userEvent.setup()

    render(<AdminConflictResolution onPreviewSegments={mockOnPreview} />)

    await waitFor(() => {
      expect(screen.getAllByText(/Park Street/).length).toBeGreaterThan(0)
    })

    const previewButton = screen.getByText('Preview')
    await user.click(previewButton)

    expect(mockOnPreview).toHaveBeenCalledWith('seg-1', 'seg-2')
  })

  it('handles accept overlap action', async () => {
    const user = userEvent.setup()

    mockAuthenticatedFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url === '/api/admin/conflicts/resolve') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ conflicts: mockConflicts }),
      })
    })

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getAllByText(/Park Street/).length).toBeGreaterThan(0)
    })

    const acceptButton = screen.getByText('Accept Overlap')
    await user.click(acceptButton)

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining('Accept this overlap as intentional')
    )

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        '/api/admin/conflicts/resolve',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('accept_overlap'),
        })
      )
    })

    expect(mockShowSuccess).toHaveBeenCalledWith('Conflict resolved successfully!')
  })

  it('handles delete segment1 action', async () => {
    const user = userEvent.setup()

    mockAuthenticatedFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url === '/api/admin/conflicts/resolve') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ conflicts: mockConflicts }),
      })
    })

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getAllByText(/Park Street/).length).toBeGreaterThan(0)
    })

    const deleteButtons = screen.getAllByText('Delete Seg 1')
    await user.click(deleteButtons[0])

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.stringContaining('Delete segment at Park Street block 1400')
    )

    await waitFor(() => {
      expect(mockAuthenticatedFetch).toHaveBeenCalledWith(
        '/api/admin/conflicts/resolve',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('delete_segment1'),
        })
      )
    })
  })

  it('does not resolve when user cancels confirmation', async () => {
    const user = userEvent.setup()
    mockConfirm.mockReturnValue(false)

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getAllByText(/Park Street/).length).toBeGreaterThan(0)
    })

    const acceptButton = screen.getByText('Accept Overlap')
    await user.click(acceptButton)

    expect(mockConfirm).toHaveBeenCalled()

    // Should not have made the resolve API call
    expect(mockAuthenticatedFetch).not.toHaveBeenCalledWith(
      '/api/admin/conflicts/resolve',
      expect.anything()
    )
  })

  it('shows error toast when API fails', async () => {
    const user = userEvent.setup()

    mockAuthenticatedFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url === '/api/admin/conflicts/resolve') {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Server error' }),
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ conflicts: mockConflicts }),
      })
    })

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getAllByText(/Park Street/).length).toBeGreaterThan(0)
    })

    const acceptButton = screen.getByText('Accept Overlap')
    await user.click(acceptButton)

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Failed to resolve conflict')
    })
  })

  it('shows status badges correctly', async () => {
    const user = userEvent.setup()

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getAllByText(/Park Street/).length).toBeGreaterThan(0)
    })

    // Open tab shows open badge
    expect(screen.getByText('Open')).toBeInTheDocument()

    // Switch to all tab
    await user.click(screen.getByText('All Conflicts (2)'))

    await waitFor(() => {
      expect(screen.getByText('Resolved')).toBeInTheDocument()
    })
  })

  it('shows resolution info for resolved conflicts', async () => {
    const user = userEvent.setup()

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getByText('Overlap Conflicts')).toBeInTheDocument()
    })

    // Switch to all tab to see resolved conflict
    await user.click(screen.getByText('All Conflicts (2)'))

    // Wait for Webster Street to appear (which is the resolved conflict)
    await waitFor(() => {
      expect(screen.getAllByText(/Webster Street/).length).toBeGreaterThan(0)
    })

    // Check for resolution info - the text is "Resolved by admin on {date}"
    await waitFor(() => {
      expect(screen.getByText(/Resolved by admin on/)).toBeInTheDocument()
    })
  })

  it('disables buttons while processing', async () => {
    const user = userEvent.setup()

    // Make the API call slow
    mockAuthenticatedFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST' && url === '/api/admin/conflicts/resolve') {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({ ok: true, json: () => Promise.resolve({}) })
          }, 100)
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ conflicts: mockConflicts }),
      })
    })

    render(<AdminConflictResolution />)

    await waitFor(() => {
      expect(screen.getAllByText(/Park Street/).length).toBeGreaterThan(0)
    })

    const acceptButton = screen.getByText('Accept Overlap')
    await user.click(acceptButton)

    // Buttons should be disabled while processing
    await waitFor(() => {
      expect(screen.getByText('Accept Overlap')).toBeDisabled()
    })
  })
})
