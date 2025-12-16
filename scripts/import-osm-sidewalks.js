#!/usr/bin/env node

/**
 * OpenStreetMap Sidewalk Import Script
 *
 * This script fetches sidewalk data from the Overpass API for Alameda, CA
 * and imports it into the reference_sidewalks table with PostGIS geometry.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/import-osm-sidewalks.js
 */

const { Pool } = require('pg')

const ALAMEDA_BOUNDS = {
  south: 37.75,
  west: -122.32,
  north: 37.78,
  east: -122.22
}

const overpassQuery = `[out:json][timeout:60];
(
  way["highway"="footway"]["footway"="sidewalk"](${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
  way["highway"="path"]["foot"!="no"](${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
);
(._;>;);
out geom;`

async function importOSMData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  try {
    console.log('📍 Fetching sidewalk data from Overpass API...')
    console.log(`   Bounds: N:${ALAMEDA_BOUNDS.north}, S:${ALAMEDA_BOUNDS.south}, E:${ALAMEDA_BOUNDS.east}, W:${ALAMEDA_BOUNDS.west}`)

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`
    })

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log(`📦 Received ${data.elements.length} elements from Overpass API`)

    // Build node map for resolving way node references
    const nodeMap = new Map()
    data.elements.forEach(element => {
      if (element.type === 'node' && element.lat && element.lon) {
        nodeMap.set(element.id, [element.lat, element.lon])
      }
    })

    const ways = data.elements.filter(el => el.type === 'way' && el.nodes)
    console.log(`🛣️  Processing ${ways.length} sidewalk ways...`)

    let imported = 0
    let updated = 0
    let skipped = 0
    let errors = 0

    for (const way of ways) {
      try {
        // Resolve node IDs to coordinates
        const coordinates = way.nodes
          .map(nodeId => nodeMap.get(nodeId))
          .filter(coord => coord !== undefined)

        if (coordinates.length < 2) {
          skipped++
          continue
        }

        // Convert to WKT format (lng lat, lng lat, ...)
        const wkt = `SRID=4326;LINESTRING(${coordinates.map(([lat, lng]) => `${lng} ${lat}`).join(',')})`

        // Extract metadata
        const street = way.tags?.name || way.tags?.['addr:street'] || null
        const surface = way.tags?.surface || null
        const width = way.tags?.width ? parseFloat(way.tags.width) : null
        const tags = JSON.stringify(way.tags || {})

        // Upsert into database
        const result = await pool.query(
          `INSERT INTO reference_sidewalks (osm_id, osm_type, geometry, street, surface, width, tags)
           VALUES ($1, $2, ST_GeomFromText($3), $4, $5, $6, $7)
           ON CONFLICT (osm_id) DO UPDATE SET
             geometry = EXCLUDED.geometry,
             street = EXCLUDED.street,
             surface = EXCLUDED.surface,
             width = EXCLUDED.width,
             tags = EXCLUDED.tags,
             last_updated = CURRENT_TIMESTAMP
           RETURNING (xmax = 0) AS inserted`,
          [way.id, 'way', wkt, street, surface, width, tags]
        )

        if (result.rows[0].inserted) {
          imported++
        } else {
          updated++
        }

        // Progress indicator every 100 records
        if ((imported + updated) % 100 === 0) {
          console.log(`⏳ Progress: ${imported} imported, ${updated} updated, ${skipped} skipped`)
        }
      } catch (err) {
        console.error(`❌ Error processing way ${way.id}:`, err.message)
        errors++
      }
    }

    console.log('\n✅ Import complete!')
    console.log(`   Imported:  ${imported} new sidewalks`)
    console.log(`   Updated:   ${updated} existing sidewalks`)
    console.log(`   Skipped:   ${skipped} (insufficient coordinates)`)
    console.log(`   Errors:    ${errors}`)

    // Get total count
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM reference_sidewalks WHERE status = 'active'"
    )
    console.log(`\n📊 Total active reference sidewalks: ${countResult.rows[0].total}`)

  } catch (error) {
    console.error('\n💥 Import failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run if called directly
if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required')
    console.error('   Example: DATABASE_URL="postgresql://user:pass@localhost:5432/dbname" npm run import-osm')
    process.exit(1)
  }

  importOSMData()
}

module.exports = { importOSMData }
