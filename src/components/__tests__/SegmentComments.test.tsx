import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SegmentComments from '../SegmentComments'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock useAuth
const mockUser = { id: 'user-1', username: 'TestUser', role: 'user' }
jest.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: mockUser }),
}))

// Mock Toast
const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()
jest.mock('../Toast', () => ({
  useToast: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}))

const mockComments = [
  {
    id: 'comment-1',
    segment_id: 'segment-1',
    user_id: 'user-1',
    username: 'Alice',
    content: 'This is a great segment!',
    parent_id: null,
    is_edited: false,
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    replies: [
      {
        id: 'comment-2',
        segment_id: 'segment-1',
        user_id: 'user-2',
        username: 'Bob',
        content: 'I agree!',
        parent_id: 'comment-1',
        is_edited: false,
        created_at: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
        updated_at: new Date(Date.now() - 1800000).toISOString(),
      },
    ],
  },
]

describe('SegmentComments Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders loading state initially', () => {
    mockFetch.mockReturnValue(new Promise(() => {})) // Never resolves

    render(<SegmentComments segmentId="segment-1" />)

    expect(screen.getByText('Loading comments...')).toBeInTheDocument()
  })

  it('renders comments after loading', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: mockComments }),
    })

    render(<SegmentComments segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Comments')).toBeInTheDocument()
    })

    expect(screen.getByText('This is a great segment!')).toBeInTheDocument()
    expect(screen.getByText('I agree!')).toBeInTheDocument()
  })

  it('shows usernames for comments', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: mockComments }),
    })

    render(<SegmentComments segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument()
    })

    expect(screen.getByText('Bob')).toBeInTheDocument()
  })

  it('shows comment count', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: mockComments }),
    })

    render(<SegmentComments segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('(2)')).toBeInTheDocument() // 1 comment + 1 reply
    })
  })

  it('renders empty state when no comments', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: [] }),
    })

    render(<SegmentComments segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument()
    })
  })

  it('shows comment form when user is logged in', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: [] }),
    })

    render(<SegmentComments segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
    })

    expect(screen.getByText('Post Comment')).toBeInTheDocument()
  })

  it('submits a new comment', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'new-comment' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ comments: [] }),
      })

    render(<SegmentComments segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText('Add a comment...')
    fireEvent.change(textarea, { target: { value: 'New comment text' } })

    const submitButton = screen.getByText('Post Comment')
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/segments/segment-1/comments',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ content: 'New comment text' }),
        })
      )
    })

    expect(mockShowSuccess).toHaveBeenCalledWith('Comment posted!')
  })

  it('shows reply button for comments', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: mockComments }),
    })

    render(<SegmentComments segmentId="segment-1" />)

    await waitFor(() => {
      expect(screen.getByText('Reply')).toBeInTheDocument()
    })
  })

  it('fetches comments for the correct segment', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comments: [] }),
    })

    render(<SegmentComments segmentId="test-segment-456" />)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/segments/test-segment-456/comments')
    })
  })
})
