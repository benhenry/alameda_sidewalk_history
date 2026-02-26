import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { SidewalkProvider, useSidewalkData } from '../sidewalk-context'

// Use fake timers for debounce testing
beforeEach(() => {
  jest.useFakeTimers()
  jest.clearAllMocks()
  ;(global.fetch as jest.Mock).mockReset()
})

afterEach(() => {
  jest.useRealTimers()
})

function wrapper({ children }: { children: React.ReactNode }) {
  return <SidewalkProvider>{children}</SidewalkProvider>
}

describe('SidewalkProvider', () => {
  it('should start with loading=true and empty data', () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ lineStrings: [] }),
    })

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.sidewalkData).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('should fetch initial sidewalk data on mount', async () => {
    const mockLineStrings = [
      [[37.7652, -122.2416], [37.766, -122.242]],
    ]

    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ lineStrings: mockLineStrings }),
    })

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/sidewalks')
    expect(result.current.sidewalkData).toEqual(mockLineStrings)
    expect(result.current.error).toBeNull()
  })

  it('should set error when initial fetch fails', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    })

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to fetch sidewalk data')
    expect(result.current.sidewalkData).toEqual([])
  })

  it('should set error when initial fetch throws', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBe('Failed to fetch sidewalk data')
  })

  it('should handle missing lineStrings in response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ coordinates: 0 }), // No lineStrings field
    })

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.sidewalkData).toEqual([])
  })

  it('should debounce updateBounds calls', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ lineStrings: [] }),
    })

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    // Wait for initial fetch
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Clear mock from initial fetch
    ;(global.fetch as jest.Mock).mockClear()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ lineStrings: [] }),
    })

    // Call updateBounds multiple times rapidly
    act(() => {
      result.current.updateBounds({ north: 37.80, south: 37.76, east: -122.22, west: -122.28 })
    })
    act(() => {
      result.current.updateBounds({ north: 37.81, south: 37.77, east: -122.21, west: -122.27 })
    })
    act(() => {
      result.current.updateBounds({ north: 37.82, south: 37.78, east: -122.20, west: -122.26 })
    })

    // Before debounce fires, no fetch should have happened
    expect(global.fetch).not.toHaveBeenCalled()

    // Advance past debounce timer (500ms)
    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    // Only the last call should have triggered a fetch
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('north=37.82')
    )
  })

  it('should accumulate sidewalk data from bounds fetches without duplicates', async () => {
    const initialData = [
      [[37.7652, -122.2416], [37.766, -122.242]],
    ]

    // Initial fetch
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lineStrings: initialData }),
    })

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.sidewalkData).toHaveLength(1)

    // Bounds fetch returns one new line and one duplicate
    const newLine = [[37.77, -122.25], [37.775, -122.255]]
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        lineStrings: [
          initialData[0], // duplicate
          newLine, // new
        ],
      }),
    })

    act(() => {
      result.current.updateBounds({ north: 37.80, south: 37.76, east: -122.22, west: -122.28 })
    })

    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    await waitFor(() => {
      expect(result.current.sidewalkData).toHaveLength(2)
    })

    // Should have original + new, no duplicate
    expect(result.current.sidewalkData[0]).toEqual(initialData[0])
    expect(result.current.sidewalkData[1]).toEqual(newLine)
  })

  it('should skip fetch when bounds are already covered', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lineStrings: [] }),
    })

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // First bounds fetch
    ;(global.fetch as jest.Mock).mockClear()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lineStrings: [] }),
    })

    const largeBounds = { north: 37.82, south: 37.76, east: -122.20, west: -122.28 }
    act(() => {
      result.current.updateBounds(largeBounds)
    })

    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Second fetch with smaller bounds inside the first
    ;(global.fetch as jest.Mock).mockClear()
    const smallerBounds = { north: 37.80, south: 37.77, east: -122.22, west: -122.26 }
    act(() => {
      result.current.updateBounds(smallerBounds)
    })

    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    // Should NOT fetch because smaller bounds are covered by larger
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should fetch when bounds extend beyond covered area', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ lineStrings: [] }),
    })

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // First bounds fetch
    ;(global.fetch as jest.Mock).mockClear()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ lineStrings: [] }),
    })

    const firstBounds = { north: 37.78, south: 37.76, east: -122.24, west: -122.28 }
    act(() => {
      result.current.updateBounds(firstBounds)
    })

    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    expect(global.fetch).toHaveBeenCalledTimes(1)
    ;(global.fetch as jest.Mock).mockClear()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ lineStrings: [] }),
    })

    // New bounds that extend beyond the first (north is higher)
    const extendedBounds = { north: 37.82, south: 37.76, east: -122.24, west: -122.28 }
    act(() => {
      result.current.updateBounds(extendedBounds)
    })

    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    // Should fetch because extended bounds exceed previous
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should provide updateBounds function via context', () => {
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ lineStrings: [] }),
    })

    const { result } = renderHook(() => useSidewalkData(), { wrapper })

    expect(typeof result.current.updateBounds).toBe('function')
  })
})

describe('useSidewalkData without provider', () => {
  it('should return default context values', () => {
    // Rendering without a provider should return defaults
    const { result } = renderHook(() => useSidewalkData())

    expect(result.current.sidewalkData).toEqual([])
    expect(result.current.isLoading).toBe(true)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.updateBounds).toBe('function')
  })
})
