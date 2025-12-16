#!/usr/bin/env node

/**
 * Quick test script for the snap API with real PostGIS data
 */

async function testSnapAPI() {
  const testCoordinate = [37.7622, -122.2715] // Near Alameda center

  console.log('🧪 Testing Snap API with real PostGIS data...')
  console.log(`📍 Test coordinate: [${testCoordinate[0]}, ${testCoordinate[1]}]`)

  try {
    const response = await fetch('http://localhost:3000/api/snap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coordinates: [testCoordinate]
      })
    })

    if (!response.ok) {
      console.error('❌ API error:', response.status, response.statusText)
      const error = await response.text()
      console.error('   Error body:', error)
      process.exit(1)
    }

    const data = await response.json()

    console.log('\n✅ Snap API Response:')
    console.log('   Original:', data.metadata[0].original)
    console.log('   Snapped:', data.metadata[0].snapped)
    console.log('   Distance:', data.metadata[0].distance, 'meters')
    console.log('   Reference ID:', data.metadata[0].referenceId)

    if (data.metadata[0].snapped) {
      const [origLat, origLng] = data.metadata[0].original
      const [snapLat, snapLng] = data.metadata[0].snapped
      const latDiff = Math.abs(origLat - snapLat) * 111000
      const lngDiff = Math.abs(origLng - snapLng) * 111000
      console.log(`   Moved: ${latDiff.toFixed(2)}m lat, ${lngDiff.toFixed(2)}m lng`)
      console.log('\n🎉 PostGIS snapping working correctly!')
    } else {
      console.log('\n⚠️  No nearby sidewalk found (check data coverage)')
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('   Make sure:')
    console.error('   1. Database is running: npm run db:start')
    console.error('   2. OSM data imported: npm run import-osm')
    console.error('   3. Dev server running: npm run dev')
    process.exit(1)
  }
}

testSnapAPI()
