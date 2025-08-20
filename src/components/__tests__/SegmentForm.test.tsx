import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SegmentForm from '../SegmentForm'
import { SidewalkSegment } from '@/types/sidewalk'

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

describe('SegmentForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders form title for new segment', () => {
    render(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Add New Segment')).toBeInTheDocument()
  })

  it('renders form title for editing segment', () => {
    render(
      <SegmentForm
        segment={mockSegment}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('Edit Segment')).toBeInTheDocument()
  })

  it('pre-fills form fields when editing existing segment', () => {
    render(
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
    render(
      <SegmentForm
        segment={mockSegment}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('P')).toBeInTheDocument()
  })

  it('displays existing coordinates', () => {
    render(
      <SegmentForm
        segment={mockSegment}
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText('37.765200, -122.241600')).toBeInTheDocument()
    expect(screen.getByText('37.766000, -122.242000')).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
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
    
    render(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    // Find the form and trigger submit event
    const form = document.querySelector('form')
    if (form) {
      fireEvent.submit(form)
    }

    expect(alertSpy).toHaveBeenCalledWith('Please fill in all required fields and add at least one coordinate')
    expect(mockOnSave).not.toHaveBeenCalled()
    
    alertSpy.mockRestore()
  })

  it('displays coordinate input placeholders', () => {
    render(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByPlaceholderText('Latitude (37.7652)')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Longitude (-122.2416)')).toBeInTheDocument()
  })

  it('displays special mark input placeholder', () => {
    render(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByPlaceholderText('Add special mark (e.g., P for pipe)')).toBeInTheDocument()
  })

  it('shows coordinate bounds helper text', () => {
    render(
      <SegmentForm
        onSave={mockOnSave}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText(/Alameda bounds: Lat 37.7-37.8, Lng -122.3--122.2/)).toBeInTheDocument()
  })

  it('renders save button with save icon', () => {
    render(
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
    render(
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
    expect(screen.getByText('Coordinates *')).toBeInTheDocument()
  })
})