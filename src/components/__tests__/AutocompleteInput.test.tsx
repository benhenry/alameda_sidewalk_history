import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AutocompleteInput from '../AutocompleteInput'

describe('AutocompleteInput', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    suggestions: [] as string[],
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should render input with placeholder', () => {
    render(<AutocompleteInput {...defaultProps} placeholder="Search..." />)
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('should render with disabled state', () => {
    render(<AutocompleteInput {...defaultProps} disabled placeholder="Test" />)
    expect(screen.getByPlaceholderText('Test')).toBeDisabled()
  })

  it('should call onChange when typing', () => {
    const onChange = jest.fn()
    render(<AutocompleteInput {...defaultProps} onChange={onChange} placeholder="Type" />)

    fireEvent.change(screen.getByPlaceholderText('Type'), { target: { value: 'Sm' } })
    expect(onChange).toHaveBeenCalledWith('Sm')
  })

  it('should show suggestions dropdown when value >= 2 chars and suggestions exist', () => {
    render(
      <AutocompleteInput
        {...defaultProps}
        value="Sm"
        suggestions={['Smith Construction', 'Smith & Sons']}
      />
    )

    // Open dropdown by focusing and typing
    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Sm' } })

    expect(screen.getByText('Smith Construction')).toBeInTheDocument()
    expect(screen.getByText('Smith & Sons')).toBeInTheDocument()
  })

  it('should select suggestion on click', () => {
    const onChange = jest.fn()
    render(
      <AutocompleteInput
        {...defaultProps}
        onChange={onChange}
        value="Sm"
        suggestions={['Smith Construction']}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Sm' } })

    fireEvent.click(screen.getByText('Smith Construction'))
    expect(onChange).toHaveBeenCalledWith('Smith Construction')
  })

  it('should handle keyboard navigation with ArrowDown', () => {
    render(
      <AutocompleteInput
        {...defaultProps}
        value="Sm"
        suggestions={['Smith Construction', 'Smith & Sons']}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Sm' } })

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    // First suggestion should be highlighted
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toHaveClass('bg-blue-50')
  })

  it('should handle ArrowUp navigation', () => {
    render(
      <AutocompleteInput
        {...defaultProps}
        value="Sm"
        suggestions={['Smith Construction', 'Smith & Sons']}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Sm' } })

    // ArrowUp from no highlight should go to last item
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    const buttons = screen.getAllByRole('button')
    expect(buttons[buttons.length - 1]).toHaveClass('bg-blue-50')
  })

  it('should select highlighted item on Enter', () => {
    const onChange = jest.fn()
    render(
      <AutocompleteInput
        {...defaultProps}
        onChange={onChange}
        value="Sm"
        suggestions={['Smith Construction']}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Sm' } })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('Smith Construction')
  })

  it('should close dropdown on Escape', () => {
    render(
      <AutocompleteInput
        {...defaultProps}
        value="Sm"
        suggestions={['Smith Construction']}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Sm' } })

    expect(screen.getByText('Smith Construction')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByText('Smith Construction')).not.toBeInTheDocument()
  })

  it('should show loading state', () => {
    render(
      <AutocompleteInput
        {...defaultProps}
        value="Sm"
        loading={true}
        suggestions={[]}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Sm' } })

    expect(screen.getByText('Loading suggestions...')).toBeInTheDocument()
  })

  it('should call onSearch after debounce', () => {
    const onSearch = jest.fn()
    render(
      <AutocompleteInput
        {...defaultProps}
        onSearch={onSearch}
        value=""
        suggestions={[]}
        placeholder="Search"
      />
    )

    const input = screen.getByPlaceholderText('Search')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Sm' } })

    // onSearch should not be called immediately
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('should not show dropdown when value < 2 chars', () => {
    render(
      <AutocompleteInput
        {...defaultProps}
        value="S"
        suggestions={['Smith Construction']}
      />
    )

    const input = screen.getByRole('textbox')
    fireEvent.focus(input)

    // Dropdown should not be visible even with suggestions
    expect(screen.queryByText('Smith Construction')).not.toBeInTheDocument()
  })
})
