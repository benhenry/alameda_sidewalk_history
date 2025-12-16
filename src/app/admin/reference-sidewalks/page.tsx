'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { RefreshCw, Plus, Database } from 'lucide-react'

// Dynamic imports for Leaflet components (avoid SSR issues)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
)
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
)
const GeoJSON = dynamic(
  () => import('react-leaflet').then((mod) => mod.GeoJSON),
  { ssr: false }
)

interface ReferenceSidewalk {
  id: string
  osmId: number
  street: string
  geometry: any
  tags: Record<string, string>
}

export default function AdminReferenceSidewalks() {
  const [sidewalks, setSidewalks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importLog, setImportLog] = useState('')

  const fetchSidewalks = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/reference-sidewalks')
      const data = await response.json()
      setSidewalks(data.features || [])
    } catch (error) {
      console.error('Error fetching sidewalks:', error)
      alert('Failed to fetch reference sidewalks')
    } finally {
      setLoading(false)
    }
  }

  const triggerImport = async () => {
    if (!confirm('Import sidewalk data from OpenStreetMap? This may take several minutes.')) {
      return
    }

    try {
      setImporting(true)
      setImportLog('Starting import from OpenStreetMap...\n')

      const response = await fetch('/api/admin/import-osm', {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setImportLog(prev => prev + '\n' + data.stdout)
        alert('Import completed successfully!')
        await fetchSidewalks()
      } else {
        setImportLog(prev => prev + '\n❌ Error: ' + data.error)
        alert('Import failed. Check the log for details.')
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportLog(prev => prev + '\n❌ Network error: ' + String(error))
      alert('Import failed due to network error.')
    } finally {
      setImporting(false)
    }
  }

  useEffect(() => {
    fetchSidewalks()
  }, [])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reference Sidewalk Management</h1>
          <p className="text-gray-600 mt-1">
            Manage reference sidewalk data imported from OpenStreetMap
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchSidewalks}
            disabled={loading}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={triggerImport}
            disabled={importing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Database className="h-4 w-4" />
            {importing ? 'Importing...' : 'Import from OSM'}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Total Sidewalks</div>
          <div className="text-2xl font-bold">{sidewalks.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">With Street Names</div>
          <div className="text-2xl font-bold">
            {sidewalks.filter(s => s.properties?.street).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600">Status</div>
          <div className="text-2xl font-bold text-green-600">
            {loading ? 'Loading...' : 'Active'}
          </div>
        </div>
      </div>

      {/* Import Log */}
      {importLog && (
        <div className="bg-gray-900 text-green-400 rounded-lg p-4 mb-6 font-mono text-sm max-h-40 overflow-y-auto">
          <pre className="whitespace-pre-wrap">{importLog}</pre>
        </div>
      )}

      {/* Map View */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Map View</h2>
        <div className="border border-gray-300 rounded overflow-hidden" style={{ height: '600px' }}>
          {typeof window !== 'undefined' && (
            <MapContainer
              center={[37.7652, -122.2416]}
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              {sidewalks.length > 0 && (
                <GeoJSON
                  key={JSON.stringify(sidewalks.length)}
                  data={{ type: 'FeatureCollection', features: sidewalks }}
                  style={{
                    color: '#3B82F6',
                    weight: 3,
                    opacity: 0.6
                  }}
                />
              )}
            </MapContainer>
          )}
        </div>
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <div>
            Displaying {sidewalks.length} reference sidewalk{sidewalks.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-blue-500"></div>
            <span>Reference Sidewalks (OSM)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
