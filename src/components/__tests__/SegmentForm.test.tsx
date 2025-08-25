import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SegmentForm from '../SegmentForm'
import { SidewalkSegment } from '@/types/sidewalk'
import { SidewalkProvider } from '@/lib/sidewalk-context'

// Mock the InteractiveSegmentDrawer component
jest.mock('../InteractiveSegmentDrawer', () => {
  return function MockInteractiveSegmentDrawer({ onCoordinatesChange }: any) {
    return (
      <div data-testid="map-container" onClick={() => onCoordinatesChange([[37.7652, -122.2416]])}>
        Mock Interactive Map
      </div>
    )
  }
})

// Mock fetch for sidewalk data
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

const mockOnSave = jest.fn()
const mockOnCancel = jest.fn()

const mockSegment: SidewalkSegment = {
  id: '1',
  coordinates: [[37.7652, -122.2416], [37.7660, -122.2420]],
  contractor: 'Smith Construction Co.',
  year: 1925,
  street: 'Park Street',
  block: '1400',
  specialMarks: ['P'],
  notes: 'Well-preserved contractor stamp',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
}

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <SidewalkProvider>
      {component}
    </SidewalkProvider>
  )
}

describe('SegmentForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        coordinates: [[37.7652, -122.2416], [37.7653, -122.2417]]
      })
    } as any)
  })

  it('renders form title for new segment', () => {
    renderWithProvider(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Add New Segment')).toBeInTheDocument()
  })

  it('renders form title for editing segment', () => {
    renderWithProvider(
      <SegmentForm
        segment={mockSegment}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Edit Segment')).toBeInTheDocument()
  })

  it('pre-fills form fields when editing existing segment', () => {
    renderWithProvider(
      <SegmentForm
        segment={mockSegment}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByDisplayValue('Smith Construction Co.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1925')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Park Street')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1400')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Well-preserved contractor stamp')).toBeInTheDocument()
  })

  it('displays existing special marks', () => {
    renderWithProvider(
      <SegmentForm
        segment={mockSegment}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('renders the interactive segment drawer', async () => {
    renderWithProvider(
      <SegmentForm
        segment={mockSegment}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    // Wait for the sidewalk data to load and map to render
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    
    renderWithProvider(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnCancel).toHaveBeenCalledTimes(1)
  })

  it('prevents submission with missing required fields', async () => {
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {})
    
    renderWithProvider(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    // Find the form and trigger submit event without waiting for map
    const form = document.querySelector('form')
    if (form) {
      fireEvent.submit(form)
    }

    expect(alertSpy).toHaveBeenCalledWith('Please fill in all required fields and add at least one coordinate')
    expect(mockOnSave).not.toHaveBeenCalled()
    
    alertSpy.mockRestore()
  })

  it('displays special mark input placeholder', () => {
    renderWithProvider(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByPlaceholderText('Add special mark (e.g., P for pipe)')).toBeInTheDocument()
  })

  it('shows loading state while fetching sidewalk data', () => {
    renderWithProvider(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Loading sidewalk data...')).toBeInTheDocument()
  })

  it('displays segment location section', async () => {
    renderWithProvider(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Segment Location *')).toBeInTheDocument()

    // Wait for sidewalk data to load
    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('renders save button with save icon', () => {
    renderWithProvider(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    const saveButton = screen.getByText('Save Segment')
    expect(saveButton).toBeInTheDocument()
    expect(saveButton.closest('button')).toHaveAttribute('type', 'submit')
  })

  it('renders form with proper labels', () => {
    renderWithProvider(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Contractor *')).toBeInTheDocument()
    expect(screen.getByText('Year *')).toBeInTheDocument()
    expect(screen.getByText('Street *')).toBeInTheDocument()
    expect(screen.getByText('Block *')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
    expect(screen.getByText('Special Marks')).toBeInTheDocument()
    expect(screen.getByText('Segment Location *')).toBeInTheDocument()
  })
})