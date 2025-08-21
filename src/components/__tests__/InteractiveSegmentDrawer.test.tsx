import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import InteractiveSegmentDrawer from '../InteractiveSegmentDrawer'

// Mock react-leaflet components (already handled by __mocks__)

describe('InteractiveSegmentDrawer', () => {
  const mockOnCoordinatesChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render with initial coordinates', async () => {
    const initialCoordinates: [number, number][] = [[37.7652, -122.2416], [37.7660, -122.2420]]

    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        initialCoordinates={initialCoordinates}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })

    expect(screen.getByText('2 points added')).toBeInTheDocument()
    expect(screen.getByText('Ready to save')).toBeInTheDocument()
  })

  it('should render instructions and guidelines', async () => {
    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('How to draw a sidewalk segment:')).toBeInTheDocument()
    })

    expect(screen.getByText('Click on the map to add points along the sidewalk')).toBeInTheDocument()
    expect(screen.getByText('Blue dashed lines show known sidewalk locations')).toBeInTheDocument()
    expect(screen.getByText('Connect points to create a line representing the sidewalk segment')).toBeInTheDocument()
  })

  it('should show loading state initially', () => {
    // Before mount, component shows loading
    const { container } = render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
      />
    )

    // Initially shows loading div
    expect(container.querySelector('.bg-gray-200')).toBeInTheDocument()
  })

  it('should display coordinate count and status correctly', async () => {
    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        initialCoordinates={[[37.7652, -122.2416]]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('1 point added')).toBeInTheDocument()
    })

    // Should not show "Ready to save" with only 1 point
    expect(screen.queryByText('Ready to save')).not.toBeInTheDocument()
  })

  it('should show control buttons when coordinates exist', async () => {
    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        initialCoordinates={[[37.7652, -122.2416], [37.7660, -122.2420]]}
      />
    )

    await waitFor(() => {
      expect(screen.getByTitle('Remove last point')).toBeInTheDocument()
      expect(screen.getByTitle('Clear all points')).toBeInTheDocument()
    })
  })

  it('should call onCoordinatesChange when removeLastPoint is clicked', async () => {
    const coordinates: [number, number][] = [[37.7652, -122.2416], [37.7660, -122.2420]]

    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        initialCoordinates={coordinates}
      />
    )

    await waitFor(() => {
      expect(screen.getByTitle('Remove last point')).toBeInTheDocument()
    })

    const removeButton = screen.getByTitle('Remove last point')
    fireEvent.click(removeButton)

    expect(mockOnCoordinatesChange).toHaveBeenCalledWith([[37.7652, -122.2416]])
  })

  it('should call onCoordinatesChange when clearAll is clicked', async () => {
    const coordinates: [number, number][] = [[37.7652, -122.2416], [37.7660, -122.2420]]

    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        initialCoordinates={coordinates}
      />
    )

    await waitFor(() => {
      expect(screen.getByTitle('Clear all points')).toBeInTheDocument()
    })

    const clearButton = screen.getByTitle('Clear all points')
    fireEvent.click(clearButton)

    expect(mockOnCoordinatesChange).toHaveBeenCalledWith([])
  })

  it('should display last coordinate when available', async () => {
    const coordinates: [number, number][] = [[37.765234, -122.241567]]

    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        initialCoordinates={coordinates}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Last: 37.765234, -122.241567')).toBeInTheDocument()
    })
  })

  it('should render with sidewalk overlay data', async () => {
    const sidewalkData: [number, number][] = [
      [37.7652, -122.2416],
      [37.7653, -122.2417]
    ]

    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        sidewalkData={sidewalkData}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })

    // The map container should be rendered with sidewalk data
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('should handle empty initial coordinates', async () => {
    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        initialCoordinates={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('0 points added')).toBeInTheDocument()
    })

    expect(screen.queryByText('Ready to save')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Remove last point')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Clear all points')).not.toBeInTheDocument()
  })

  it('should show polyline when multiple coordinates exist', async () => {
    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        initialCoordinates={[[37.7652, -122.2416], [37.7660, -122.2420]]}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('polyline')).toBeInTheDocument()
    })
  })

  it('should not show control buttons when no coordinates', async () => {
    render(
      <InteractiveSegmentDrawer
        onCoordinatesChange={mockOnCoordinatesChange}
        initialCoordinates={[]}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('map-container')).toBeInTheDocument()
    })

    expect(screen.queryByTitle('Remove last point')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Clear all points')).not.toBeInTheDocument()
  })
})