import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SegmentEditHistory from '../SegmentEditHistory'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

const mockHistory = [
  {
    id: 'history-1',
    segment_id: 'segment-1',
    edited_by: 'user-1',
    edited_by_username: 'TestUser',
    edit_type: 'update',
    field_changes: ['contractor', 'year'],
    previous_values: { contractor: 'Old Company', year: 1920 },
    new_values: { contractor: 'New Company', year: 1925 },
    notes: 'Corrected based on historical records',
    created_at: '2023-06-15T10:30:00Z',
    street: 'Park Street',
    block: '1400',
  },
  {
    id: 'history-2',
    segment_id: 'segment-1',
    edited_by: 'user-2',
    edited_by_username: 'AdminUser',
    edit_type: 'approve',
    field_changes: ['status'],
    previous_values: { status: 'pending' },
    new_values: { status: 'approved' },
    notes: null,
    created_at: '2023-06-14T08:00:00Z',
    street: 'Park Street',
    block: '1400',
  },
  {
    id: 'history-3',
    segment_id: 'segment-1',
    edited_by: 'user-3',
    edited_by_username: 'Creator',
    edit_type: 'create',
    field_changes: ['street', 'block', 'contractor', 'year'],
    previous_values: {},
    new_values: { street: 'Park Street', block: '1400', contractor: 'Old Company', year: 1920 },
    notes: null,
    created_at: '2023-06-13T12:00:00Z',
    street: 'Park Street',
    block: '1400',
  },
]

describe('SegmentEditHistory Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // Never resolves

    render(<SegmentEditHistory segmentId="segment-1" />)

    expect(screen.getByText('Loading history...')).toBeInTheDocument()
  })

  it('renders history entries after loading', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ history: mockHistory }),
    })

    render(<SegmentEditHistory segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Edit History')).toBeInTheDocument()
    })

    expect(screen.getByText('(3 entries)')).toBeInTheDocument()
    expect(screen.getByText('Updated')).toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Created')).toBeInTheDocument()
  })

  it('shows usernames for each entry', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ history: mockHistory }),
    })

    render(<SegmentEditHistory segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('TestUser')).toBeInTheDocument()
    })

    expect(screen.getByText('AdminUser')).toBeInTheDocument()
    expect(screen.getByText('Creator')).toBeInTheDocument()
  })

  it('expands entry to show details when clicked', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ history: mockHistory }),
    })

    render(<SegmentEditHistory segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Updated')).toBeInTheDocument()
    })

    // Click to expand the first entry
    const updateEntry = screen.getByText('Updated').closest('button')
    fireEvent.click(updateEntry!)

    // Should show the changes
    await waitFor(() => {
      expect(screen.getByText('Changes:')).toBeInTheDocument()
    })

    expect(screen.getByText('Contractor:')).toBeInTheDocument()
    expect(screen.getByText('Corrected based on historical records')).toBeInTheDocument()
  })

  it('shows empty state when no history', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ history: [] }),
    })

    render(<SegmentEditHistory segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('No edit history available')).toBeInTheDocument()
    })
  })

  it('shows error state when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    })

    render(<SegmentEditHistory segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Failed to load edit history')).toBeInTheDocument()
    })
  })

  it('fetches history for the correct segment', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ history: mockHistory }),
    })

    render(<SegmentEditHistory segmentId="test-segment-123" />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/segments/test-segment-123/history')
    })
  })
})
