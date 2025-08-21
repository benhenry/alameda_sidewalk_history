import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminSegmentApproval from '../AdminSegmentApproval'

// Mock fetch
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock alert
global.alert = jest.fn()

describe('AdminSegmentApproval', () => {
  const mockPendingSegments = [
    {
      id: '1',
      coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
      contractor: 'Smith Construction Co.',
      year: 1925,
      street: 'Park Street',
      block: '1400',
      status: 'pending' as const,
      specialMarks: ['P'],
      notes: 'Well-preserved contractor stamp',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
      createdByUsername: 'testuser',
      photos: []
    }
  ]

  const mockAllSegments = [
    ...mockPendingSegments,
    {
      id: '2',
      coordinates: [[37.7670, -122.2430]],
      contractor: 'Jones Construction',
      year: 1930,
      street: 'Main Street',
      block: '1500',
      status: 'approved' as const,
      specialMarks: [],
      notes: null,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
      createdByUsername: 'testuser2',
      approvedByUsername: 'admin',
      approvedAt: new Date('2023-01-02'),
      photos: []
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  it('should render pending segments by default', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPendingSegments)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAllSegments)
      } as any)

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Segment Approval')).toBeInTheDocument()
    })

    expect(screen.getByText('1 pending approval')).toBeInTheDocument()
    expect(screen.getByText('Park Street')).toBeInTheDocument()
    expect(screen.getByText('Block 1400 • Smith Construction Co. • 1925')).toBeInTheDocument()
    expect(screen.getByText('Created by testuser')).toBeInTheDocument()
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('should switch between pending and all tabs', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPendingSegments)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAllSegments)
      } as any)

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Pending (1)')).toBeInTheDocument()
    })

    // Click on "All Segments" tab
    const allTab = screen.getByText('All Segments (2)')
    fireEvent.click(allTab)

    expect(screen.getByText('Jones Construction')).toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.getByText('Approved by admin on 1/2/2023')).toBeInTheDocument()
  })

  it('should handle approve action', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPendingSegments)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAllSegments)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([]) // Empty pending after approval
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAllSegments)
      } as any)

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument()
    })

    const approveButton = screen.getByText('Approve')
    fireEvent.click(approveButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/segments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId: '1', action: 'approve' })
      })
    })

    expect(global.alert).toHaveBeenCalledWith('Segment approved successfully!')
  })

  it('should handle reject action', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPendingSegments)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAllSegments)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([])
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAllSegments)
      } as any)

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Reject')).toBeInTheDocument()
    })

    const rejectButton = screen.getByText('Reject')
    fireEvent.click(rejectButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/admin/segments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segmentId: '1', action: 'reject' })
      })
    })

    expect(global.alert).toHaveBeenCalledWith('Segment rejected successfully!')
  })

  it('should show loading state', () => {
    // Mock fetch to never resolve to keep loading state
    mockFetch.mockImplementation(() => new Promise(() => {}))

    render(<AdminSegmentApproval />)

    expect(screen.getByText('Loading segments for approval...')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('API Error'))
      .mockRejectedValueOnce(new Error('API Error'))

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to load segments for approval')
    })
  })

  it('should show empty state when no segments', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([])
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue([])
      } as any)

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('No segments pending approval')).toBeInTheDocument()
    })

    // Switch to all tab
    const allTab = screen.getByText('All Segments (0)')
    fireEvent.click(allTab)

    expect(screen.getByText('No segments found')).toBeInTheDocument()
  })

  it('should disable buttons during processing', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPendingSegments)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAllSegments)
      } as any)
      .mockImplementation(() => new Promise(() => {})) // Never resolves to keep processing state

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument()
    })

    const approveButton = screen.getByText('Approve')
    fireEvent.click(approveButton)

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument()
    })

    // Buttons should be disabled
    const buttons = screen.getAllByText('Processing...')
    buttons.forEach(button => {
      expect(button).toBeDisabled()
    })
  })

  it('should display segment details correctly', async () => {
    const segmentWithDetails = [{
      ...mockPendingSegments[0],
      notes: 'Test notes',
      specialMarks: ['P', 'X']
    }]

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(segmentWithDetails)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(segmentWithDetails)
      } as any)

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Notes:')).toBeInTheDocument()
    })

    expect(screen.getByText('Test notes')).toBeInTheDocument()
    expect(screen.getByText('Special Marks:')).toBeInTheDocument()
    expect(screen.getByText('P, X')).toBeInTheDocument()
    expect(screen.getByText('2 coordinate points • Created 12/31/2022')).toBeInTheDocument()
  })

  it('should handle approval/rejection errors', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockPendingSegments)
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockAllSegments)
      } as any)
      .mockResolvedValueOnce({
        ok: false,
        status: 500
      } as any)

    render(<AdminSegmentApproval />)

    await waitFor(() => {
      expect(screen.getByText('Approve')).toBeInTheDocument()
    })

    const approveButton = screen.getByText('Approve')
    fireEvent.click(approveButton)

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Failed to approve segment')
    })
  })
})