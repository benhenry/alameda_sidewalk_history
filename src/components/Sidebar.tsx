'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Calendar, User, MapPin, Camera, LogIn, Plus } from 'lucide-react'
import { FilterOptions, Contractor, SidewalkSegment } from '@/types/sidewalk'
import { useAuth } from '@/lib/auth-context'
import AuthModal from './AuthModal'
import UserMenu from './UserMenu'

interface SidebarProps {
  contractors: Contractor[]
  segments: SidewalkSegment[]
  visibleSegments?: SidewalkSegment[]
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  selectedSegment?: SidewalkSegment
}

export default function Sidebar({
  contractors,
  segments,
  visibleSegments,
  filters,
  onFiltersChange,
  selectedSegment
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const { user, loading } = useAuth()

  // Use visible segments for legend if available, otherwise all segments
  const legendSegments = visibleSegments || segments

  console.log('📊 Sidebar - using', visibleSegments ? 'visible' : 'all', 'segments:', legendSegments.length)

  const years = Array.from(new Set(legendSegments.map(s => s.year))).sort()
  const decades = Array.from(new Set(years.map(y => Math.floor(y / 10) * 10))).sort()
  const streets = Array.from(new Set(legendSegments.map(s => s.street))).sort()

  const filteredContractors = contractors.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <>
      <div className="sidebar p-4">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-2xl font-bold text-gray-800">
              Alameda Sidewalk Map
            </h1>
            {!loading && (
              <div className="flex items-center gap-2">
                {user ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="text-gray-600 text-sm">
            Explore the history of Alameda's sidewalks through contractor stamps and installation years
          </p>
          {user && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Welcome back, {user.username}!</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                You can now contribute to the sidewalk map by adding segments and uploading photos.
              </p>
            </div>
          )}
        </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contractors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters Toggle */}
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition-colors"
        >
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filters</span>
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-4 mb-6">
          {/* Contractor Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="inline h-4 w-4 mr-1" />
              Contractor
            </label>
            <select
              value={filters.contractor || ''}
              onChange={(e) => onFiltersChange({ ...filters, contractor: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All contractors</option>
              {filteredContractors.map(contractor => (
                <option key={contractor.id} value={contractor.name}>
                  {contractor.name} ({contractor.totalSegments})
                </option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline h-4 w-4 mr-1" />
              Year
            </label>
            <select
              value={filters.year || ''}
              onChange={(e) => onFiltersChange({ ...filters, year: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Decade Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="inline h-4 w-4 mr-1" />
              Decade
            </label>
            <select
              value={filters.decade || ''}
              onChange={(e) => onFiltersChange({ ...filters, decade: e.target.value ? parseInt(e.target.value) : undefined })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All decades</option>
              {decades.map(decade => (
                <option key={decade} value={decade}>{decade}s</option>
              ))}
            </select>
          </div>

          {/* Street Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="inline h-4 w-4 mr-1" />
              Street
            </label>
            <select
              value={filters.street || ''}
              onChange={(e) => onFiltersChange({ ...filters, street: e.target.value || undefined })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All streets</option>
              {streets.map(street => (
                <option key={street} value={street}>{street}</option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          <button
            onClick={() => onFiltersChange({})}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      )}

      {/* Selected Segment Details */}
      {selectedSegment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-bold text-lg text-blue-800 mb-2">
            {selectedSegment.street}
          </h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Contractor:</span> {selectedSegment.contractor}</p>
            <p><span className="font-medium">Year:</span> {selectedSegment.year}</p>
            <p><span className="font-medium">Block:</span> {selectedSegment.block}</p>
            {selectedSegment.notes && (
              <p><span className="font-medium">Notes:</span> {selectedSegment.notes}</p>
            )}
            {selectedSegment.specialMarks && selectedSegment.specialMarks.length > 0 && (
              <p><span className="font-medium">Special marks:</span> {selectedSegment.specialMarks.join(', ')}</p>
            )}
            {selectedSegment.photos && selectedSegment.photos.length > 0 && (
              <div className="mt-2">
                <p className="font-medium flex items-center gap-1">
                  <Camera className="h-4 w-4" />
                  Photos ({selectedSegment.photos.length})
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-bold text-gray-800 mb-2">Statistics</h3>
        <div className="space-y-1 text-sm text-gray-600">
          <p>Total segments: {segments.length}</p>
          <p>Contractors: {contractors.length}</p>
          <p>Year range: {Math.min(...years)} - {Math.max(...years)}</p>
        </div>
      </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  )
}