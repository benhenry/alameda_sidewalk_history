'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Plus } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import ContributeModal from '@/components/ContributeModal'
import { SidewalkSegment, FilterOptions, Contractor } from '@/types/sidewalk'
import { useAuth } from '@/lib/auth-context'

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), { 
  ssr: false,
  loading: () => <div className="w-full h-screen bg-gray-200 flex items-center justify-center">Loading map...</div>
})

export default function Home() {
  const [segments, setSegments] = useState<SidewalkSegment[]>([])
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [filters, setFilters] = useState<FilterOptions>({})
  const [selectedSegment, setSelectedSegment] = useState<SidewalkSegment | undefined>()
  const [loading, setLoading] = useState(true)
  const [showContributeModal, setShowContributeModal] = useState(false)
  
  const { user } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [segmentsRes, contractorsRes] = await Promise.all([
        fetch('/api/segments'),
        fetch('/api/contractors')
      ])
      
      if (segmentsRes.ok && contractorsRes.ok) {
        const segmentsData = await segmentsRes.json()
        const contractorsData = await contractorsRes.json()
        
        setSegments(segmentsData)
        setContractors(contractorsData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      // Initialize with empty data on error
      setSegments([])
      setContractors([])
    } finally {
      setLoading(false)
    }
  }

  const filteredSegments = segments.filter(segment => {
    if (filters.contractor && segment.contractor !== filters.contractor) return false
    if (filters.year && segment.year !== filters.year) return false
    if (filters.decade && Math.floor(segment.year / 10) * 10 !== filters.decade) return false
    if (filters.street && segment.street !== filters.street) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Alameda sidewalk data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex relative">
      <Sidebar
        contractors={contractors}
        segments={segments}
        filters={filters}
        onFiltersChange={setFilters}
        selectedSegment={selectedSegment}
      />
      <div className="ml-[300px] flex-1 relative">
        <Map
          segments={filteredSegments}
          filters={filters}
          onSegmentClick={setSelectedSegment}
        />
        
        {/* Contribute Button */}
        {user && (
          <div className="absolute bottom-6 right-6 z-[1000]">
            <button
              onClick={() => {
                setShowContributeModal(true)
              }}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700 transition-colors"
              title="Contribute to the map"
            >
              <Plus className="h-5 w-5" />
              <span className="hidden sm:block">Contribute</span>
            </button>
          </div>
        )}
      </div>

      {/* Contribute Modal */}
      <ContributeModal
        isOpen={showContributeModal}
        onClose={() => {
          setShowContributeModal(false)
          setSelectedSegment(undefined)
        }}
        selectedSegment={selectedSegment}
        onSegmentSaved={loadData}
      />
    </div>
  )
}