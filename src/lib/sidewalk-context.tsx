'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidewalkContextType {
  sidewalkData: [number, number][]
  isLoading: boolean
  error: string | null
}

const SidewalkContext = createContext<SidewalkContextType>({
  sidewalkData: [],
  isLoading: true,
  error: null
})

export function SidewalkProvider({ children }: { children: ReactNode }) {
  const [sidewalkData, setSidewalkData] = useState<[number, number][]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSidewalks() {
      try {
        const response = await fetch('/api/sidewalks')
        if (response.ok) {
          const data = await response.json()
          setSidewalkData(data.coordinates || [])
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

  return (
    <SidewalkContext.Provider value={{ sidewalkData, isLoading, error }}>
      {children}
    </SidewalkContext.Provider>
  )
}

export function useSidewalkData() {
  return useContext(SidewalkContext)
}