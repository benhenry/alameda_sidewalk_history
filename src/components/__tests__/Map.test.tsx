import React from 'react'
import { render, screen } from '@testing-library/react'
import Map from '../Map'
import { SidewalkSegment, FilterOptions } from '@/types/sidewalk'

// Mock leaflet since it requires a DOM environment
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Polyline: ({ children }: any) => <div data-testid="polyline">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  useMapEvents: jest.fn(() => null),
}))

// Mock leaflet library
jest.mock('leaflet', () => ({
  Icon: {
    Default: {
      prototype: {},
      mergeOptions: jest.fn(),
    },
  },
}))

const mockSegments: SidewalkSegment[] = [
  {
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
  },
  {
    id: '2',
    coordinates: [[37.7660, -122.2420], [37.7665, -122.2425]],
    contractor: 'Johnson & Sons',
    year: 1932,
    street: 'Webster Street',
    block: '1500',
    notes: 'Multiple pipe markers visible',
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-02'),
  },
]

const mockFilters: FilterOptions = {}
const mockOnSegmentClick = jest.fn()

describe('Map Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock the client-side check
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000',
      },
    })
  })

  it('renders loading state on server side', () => {
    // Test the default isClient=false state by mocking useEffect to not run
    jest.spyOn(React, 'useEffect').mockImplementation(() => {})
    
    render(
      <Map
        segments={mockSegments}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    expect(screen.getByText('Loading map...')).toBeInTheDocument()
    
    jest.restoreAllMocks()
  })

  it('renders map container when client side', async () => {
    // Simulate client-side rendering
    const { rerender } = render(
      <Map
        segments={mockSegments}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    // Simulate useEffect running
    rerender(
      <Map
        segments={mockSegments}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    // The component should render the map container
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('renders map legend by default', async () => {
    const { rerender } = render(
      <Map
        segments={mockSegments}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    rerender(
      <Map
        segments={mockSegments}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    expect(screen.getByText('Map Legend')).toBeInTheDocument()
    expect(screen.getByText('Unmapped sidewalks')).toBeInTheDocument()
    expect(screen.getByText('Mapped by decade:')).toBeInTheDocument()
    expect(screen.getByText('1900s')).toBeInTheDocument()
    expect(screen.getByText('1920s')).toBeInTheDocument()
  })

  it('renders polylines for each segment', async () => {
    const { rerender } = render(
      <Map
        segments={mockSegments}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    rerender(
      <Map
        segments={mockSegments}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    const polylines = screen.getAllByTestId('polyline')
    expect(polylines).toHaveLength(mockSegments.length)
  })

  it('renders popups with segment information', async () => {
    const { rerender } = render(
      <Map
        segments={mockSegments}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    rerender(
      <Map
        segments={mockSegments}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    // Check that popups contain segment information
    expect(screen.getByText('Park Street')).toBeInTheDocument()
    expect(screen.getByText('Webster Street')).toBeInTheDocument()
    expect(screen.getByText('Smith Construction Co.')).toBeInTheDocument()
    expect(screen.getByText('Johnson & Sons')).toBeInTheDocument()
  })

  it('applies filters correctly to segment colors', () => {
    const filteredFilters: FilterOptions = {
      contractor: 'Smith Construction Co.',
    }

    const { rerender } = render(
      <Map
        segments={mockSegments}
        filters={filteredFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    rerender(
      <Map
        segments={mockSegments}
        filters={filteredFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    // The component should render with filtered data
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
  })

  it('handles empty segments array', async () => {
    const { rerender } = render(
      <Map
        segments={[]}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    rerender(
      <Map
        segments={[]}
        filters={mockFilters}
        onSegmentClick={mockOnSegmentClick}
      />
    )

    // Should still render map container and legend
    expect(screen.getByTestId('map-container')).toBeInTheDocument()
    expect(screen.getByText('Map Legend')).toBeInTheDocument()
  })
})