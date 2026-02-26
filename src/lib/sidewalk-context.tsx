'use client'

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react'

interface Bounds {
  north: number
  south: number
  east: number
  west: number
}

interface SidewalkContextType {
  sidewalkData: [number, number][][]  // Array of LineStrings
  isLoading: boolean
  error: string | null
  updateBounds: (bounds: Bounds) => void
}

const SidewalkContext = createContext<SidewalkContextType>({
  sidewalkData: [],
  isLoading: true,
  error: null,
  updateBounds: () => {},
})

export function SidewalkProvider({ children }: { children: ReactNode }) {
  const [sidewalkData, setSidewalkData] = useState<[number, number][][]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track fetched bounds to avoid re-fetching same area
  const fetchedBounds = useRef<Bounds[]>([])

  // Initial fetch without bounds (loads all for backwards compatibility)
  useEffect(() => {
    async function fetchSidewalks() {
      try {
        const response = await fetch('/api/sidewalks')
        if (response.ok) {
          const data = await response.json()
          setSidewalkData(data.lineStrings || [])
        } else {
          setError('Failed to fetch sidewalk data')
        }
      } catch (error) {
        setError('Failed to fetch sidewalk data')
        console.error('Failed to fetch sidewalk data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSidewalks()
  }, [])

  // Check if new bounds are already covered by previously fetched bounds
  const isBoundsCovered = useCallback((newBounds: Bounds): boolean => {
    return fetchedBounds.current.some(
      (b) =>
        b.north >= newBounds.north &&
        b.south <= newBounds.south &&
        b.east >= newBounds.east &&
        b.west <= newBounds.west
    )
  }, [])

  const fetchForBounds = useCallback(async (bounds: Bounds) => {
    if (isBoundsCovered(bounds)) return

    try {
      const params = new URLSearchParams({
        north: bounds.north.toString(),
        south: bounds.south.toString(),
        east: bounds.east.toString(),
        west: bounds.west.toString(),
      })
      const response = await fetch(`/api/sidewalks?${params}`)
      if (response.ok) {
        const data = await response.json()
        const newLineStrings: [number, number][][] = data.lineStrings || []

        // Accumulate results — merge new data with existing
        setSidewalkData((prev) => {
          // Simple dedup by serializing — for large datasets a Set or Map would be better
          // but with 2,600 total sidewalks this is fine
          const existingSet = new Set(prev.map((ls) => JSON.stringify(ls)))
          const merged = [...prev]
          for (const ls of newLineStrings) {
            const key = JSON.stringify(ls)
            if (!existingSet.has(key)) {
              merged.push(ls)
              existingSet.add(key)
            }
          }
          return merged
        })

        fetchedBounds.current.push(bounds)
      }
    } catch (err) {
      console.error('Failed to fetch sidewalks for bounds:', err)
    }
  }, [isBoundsCovered])

  const updateBounds = useCallback((bounds: Bounds) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    debounceTimer.current = setTimeout(() => {
      fetchForBounds(bounds)
    }, 500)
  }, [fetchForBounds])

  return (
    <SidewalkContext.Provider value={{ sidewalkData, isLoading, error, updateBounds }}>
      {children}
    </SidewalkContext.Provider>
  )
}

export function useSidewalkData() {
  return useContext(SidewalkContext)
}
