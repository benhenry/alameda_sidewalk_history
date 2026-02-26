import { render, screen, fireEvent, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Contractor, SidewalkSegment, FilterOptions } from '@/types/sidewalk'

// Mock the auth context
const mockUseAuth = {
  user: null,
  loading: false,
}

jest.mock('../../lib/auth-context', () => ({
  useAuth: () => mockUseAuth,
}))

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

// Mock the modal components
jest.mock('../AuthModal', () => {
  return function MockAuthModal({ isOpen, onClose }: any) {
    return isOpen ? <div data-testid="auth-modal">Auth Modal</div> : null
  }
})

jest.mock('../UserMenu', () => {
  return function MockUserMenu() {
    return <div data-testid="user-menu">User Menu</div>
  }
})

// Import after mocking
import Sidebar from '../Sidebar'

const mockContractors: Contractor[] = [
  { id: '1', name: 'Smith Construction Co.', yearsActive: [1920, 1930], totalSegments: 15 },
  { id: '2', name: 'Johnson & Sons', yearsActive: [1930, 1940], totalSegments: 23 },
]

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
const mockOnFiltersChange = jest.fn()

describe('Sidebar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders title and description', () => {
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByText('Alameda Sidewalk Map')).toBeInTheDocument()
    expect(screen.getByText(/Explore the history of Alameda's sidewalks/)).toBeInTheDocument()
  })

  it('displays search input', () => {
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search contractors...')
    expect(searchInput).toBeInTheDocument()
  })

  it('displays filter controls', () => {
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByText('Filters')).toBeInTheDocument()
    
    // Check for select elements by their text content
    expect(screen.getByText('All contractors')).toBeInTheDocument()
    expect(screen.getByText('All years')).toBeInTheDocument()
    expect(screen.getByText('All decades')).toBeInTheDocument()
    expect(screen.getByText('All streets')).toBeInTheDocument()
  })

  it('displays statistics', () => {
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByText('Statistics')).toBeInTheDocument()
    expect(screen.getByText('Total segments: 2')).toBeInTheDocument()
    expect(screen.getByText('Contractors: 2')).toBeInTheDocument()
    expect(screen.getByText('Year range: 1925 - 1932')).toBeInTheDocument()
  })

  it('displays selected segment details', () => {
    const selectedSegment = mockSegments[0]
    
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        selectedSegment={selectedSegment}
      />
    )

    // Use more specific selectors to avoid conflicts
    expect(screen.getByRole('heading', { name: 'Park Street' })).toBeInTheDocument()
    
    // Find the selected segment details section and search within it
    const selectedSegmentSection = screen.getByRole('heading', { name: 'Park Street' }).closest('div')
    expect(selectedSegmentSection).toBeInTheDocument()
    
    within(selectedSegmentSection!).getByText('Smith Construction Co.')
    within(selectedSegmentSection!).getByText('1925')
    within(selectedSegmentSection!).getByText('1400')
    within(selectedSegmentSection!).getByText('Well-preserved contractor stamp')
    within(selectedSegmentSection!).getByText('P')
  })

  it('shows sign in button when user is not logged in', () => {
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  it('clears all filters when clear button is clicked', async () => {
    const user = userEvent.setup()
    const filtersWithData: FilterOptions = {
      contractor: 'Smith Construction Co.',
      year: 1925
    }

    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={filtersWithData}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const clearButton = screen.getByText('Clear All Filters')
    await user.click(clearButton)

    expect(mockOnFiltersChange).toHaveBeenCalledWith({})
  })

  it('filters contractors based on search term', async () => {
    const user = userEvent.setup()
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const searchInput = screen.getByPlaceholderText('Search contractors...')
    await act(async () => {
      await user.type(searchInput, 'Smith')
    })

    // The component should filter the contractors internally
    // We can verify the search input has the value
    expect(searchInput).toHaveValue('Smith')
  })

  it('selects a contractor filter', async () => {
    const user = userEvent.setup()
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const contractorSelect = screen.getByDisplayValue('All contractors')
    await user.selectOptions(contractorSelect, 'Smith Construction Co.')

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ contractor: 'Smith Construction Co.' })
    )
  })

  it('selects a year filter', async () => {
    const user = userEvent.setup()
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const yearSelect = screen.getByDisplayValue('All years')
    await user.selectOptions(yearSelect, '1925')

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ year: 1925 })
    )
  })

  it('selects a decade filter', async () => {
    const user = userEvent.setup()
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const decadeSelect = screen.getByDisplayValue('All decades')
    await user.selectOptions(decadeSelect, '1920')

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ decade: 1920 })
    )
  })

  it('selects a street filter', async () => {
    const user = userEvent.setup()
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const streetSelect = screen.getByDisplayValue('All streets')
    await user.selectOptions(streetSelect, 'Park Street')

    expect(mockOnFiltersChange).toHaveBeenCalledWith(
      expect.objectContaining({ street: 'Park Street' })
    )
  })

  it('toggles filters visibility', async () => {
    const user = userEvent.setup()
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    // Filters should be visible by default
    expect(screen.getByText('All contractors')).toBeInTheDocument()

    // Click Filters to hide
    await user.click(screen.getByText('Filters'))
    expect(screen.queryByText('All contractors')).not.toBeInTheDocument()

    // Click Filters to show again
    await user.click(screen.getByText('Filters'))
    expect(screen.getByText('All contractors')).toBeInTheDocument()
  })

  it('shows UserMenu when logged in', () => {
    mockUseAuth.user = { id: '1', email: 'test@test.com', username: 'TestUser', role: 'user' } as any
    mockUseAuth.loading = false

    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByTestId('user-menu')).toBeInTheDocument()
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument()

    // Reset
    mockUseAuth.user = null
  })

  it('shows welcome message when logged in', () => {
    mockUseAuth.user = { id: '1', email: 'test@test.com', username: 'TestUser', role: 'user' } as any
    mockUseAuth.loading = false

    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByText(/Welcome back, TestUser/)).toBeInTheDocument()

    // Reset
    mockUseAuth.user = null
  })

  it('handles empty segments array', () => {
    render(
      <Sidebar
        contractors={mockContractors}
        segments={[]}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByText('No segments yet')).toBeInTheDocument()
    expect(screen.getByText('Total segments: 0')).toBeInTheDocument()
  })

  it('shows location search when onLocationSearch is provided', () => {
    const mockLocationSearch = jest.fn()
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
        onLocationSearch={mockLocationSearch}
      />
    )

    expect(screen.getByText('Go to Location')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Street or address...')).toBeInTheDocument()
  })

  it('does not show location search when onLocationSearch is not provided', () => {
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.queryByText('Go to Location')).not.toBeInTheDocument()
  })

  it('shows no matching segments message when visibleSegments is empty', () => {
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        visibleSegments={[]}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    expect(screen.getByText('No matching segments')).toBeInTheDocument()
  })

  it('handles mobile toggle', async () => {
    const user = userEvent.setup()
    render(
      <Sidebar
        contractors={mockContractors}
        segments={mockSegments}
        filters={mockFilters}
        onFiltersChange={mockOnFiltersChange}
      />
    )

    const toggleButton = screen.getByLabelText('Collapse sidebar')
    await user.click(toggleButton)

    // After clicking, label should change
    expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument()
  })
})