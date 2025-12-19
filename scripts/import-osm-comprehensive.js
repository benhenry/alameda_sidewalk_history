#!/usr/bin/env node

/**
 * Comprehensive OpenStreetMap Sidewalk Import
 *
 * Imports BOTH:
 * 1. Separate sidewalk ways (highway=footway, etc.)
 * 2. Roads with sidewalk tags (sidewalk=both/left/right/yes)
 *
 * For road-based sidewalks, generates offset geometries using Turf.js
 */

const { Pool } = require('pg')
const turf = require('@turf/turf')

const ALAMEDA_BOUNDS = {
  south: 37.75,
  west: -122.32,
  north: 37.78,
  east: -122.22
}

// Offset distance for sidewalks from road centerline (in meters)
const SIDEWALK_OFFSET = 3

const overpassQuery = `[out:json][timeout:180];
(
  // 1. SEPARATE SIDEWALK WAYS
  way["highway"="footway"]["footway"="sidewalk"](${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
  way["highway"="footway"](${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
  way["highway"="pedestrian"](${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
  way["highway"="path"]["foot"!="no"](${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
  way["highway"="living_street"](${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});

  // 2. ROADS WITH SIDEWALK TAGS (the missing data!)
  way["highway"]["sidewalk"~"both|left|right|yes"](${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
);
(._;>;);
out geom;`

/**
 * Generate sidewalk geometry from road centerline using Turf offset
 */
function generateSidewalkGeometry(roadCoordinates, side, offsetMeters) {
  try {
    // Convert to GeoJSON LineString
    const line = turf.lineString(roadCoordinates.map(([lat, lng]) => [lng, lat]))

    // Calculate offset (negative for left, positive for right)
    const offsetDistance = side === 'left' ? -offsetMeters : offsetMeters
    const offsetLine = turf.lineOffset(line, offsetDistance / 1000, { units: 'kilometers' })

    // Convert back to [lat, lng] format
    return offsetLine.geometry.coordinates.map(([lng, lat]) => [lat, lng])
  } catch (error) {
    console.error('Error generating offset:', error.message)
    return null
  }
}

async function importOSMData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  })

  try {
    console.log('🌍 Comprehensive OSM Sidewalk Import')
    console.log('📍 Fetching data from Overpass API...')
    console.log(`   Bounds: N:${ALAMEDA_BOUNDS.north}, S:${ALAMEDA_BOUNDS.south}, E:${ALAMEDA_BOUNDS.east}, W:${ALAMEDA_BOUNDS.west}`)
    console.log('   Including: Separate ways + Roads with sidewalk tags')

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

    // Build node map
    const nodeMap = new Map()
    data.elements.forEach(element => {
      if (element.type === 'node' && element.lat && element.lon) {
        nodeMap.set(element.id, [element.lat, element.lon])
      }
    })

    const ways = data.elements.filter(el => el.type === 'way' && el.nodes)
    console.log(`🛣️  Processing ${ways.length} ways...`)

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

        const tags = way.tags || {}
        const street = tags.name || tags['addr:street'] || null
        const surface = tags.surface || null
        const width = tags.width ? parseFloat(tags.width) : null

        // Check if this is a road with sidewalk tags
        const sidewalkTag = tags.sidewalk
        const isRoadWithSidewalks = sidewalkTag && ['both', 'left', 'right', 'yes'].includes(sidewalkTag)

        if (isRoadWithSidewalks) {
          // Generate offset sidewalk geometries
          const sides = sidewalkTag === 'left' ? ['left']
                     : sidewalkTag === 'right' ? ['right']
                     : ['left', 'right'] // both or yes

          for (const side of sides) {
            const offsetCoords = generateSidewalkGeometry(coordinates, side, SIDEWALK_OFFSET)

            if (!offsetCoords || offsetCoords.length < 2) {
              skipped++
              continue
            }

            const wkt = `SRID=4326;LINESTRING(${offsetCoords.map(([lat, lng]) => `${lng} ${lat}`).join(',')})`

            const tagsCopy = { ...tags, generated_from: 'road_centerline' }

            const result = await pool.query(
              `INSERT INTO reference_sidewalks (osm_id, osm_type, geometry, street, surface, width, tags, side)
               VALUES ($1, $2, ST_GeomFromText($3), $4, $5, $6, $7, $8)
               ON CONFLICT (osm_id, side) DO UPDATE SET
                 geometry = EXCLUDED.geometry,
                 street = EXCLUDED.street,
                 surface = EXCLUDED.surface,
                 width = EXCLUDED.width,
                 tags = EXCLUDED.tags,
                 last_updated = CURRENT_TIMESTAMP
               RETURNING (xmax = 0) AS inserted`,
              [way.id, 'way', wkt, street, surface, width, JSON.stringify(tagsCopy), side]
            )

            if (result.rows[0].inserted) {
              imported++
            } else {
              updated++
            }
          }
        } else {
          // Regular separate sidewalk way
          const wkt = `SRID=4326;LINESTRING(${coordinates.map(([lat, lng]) => `${lng} ${lat}`).join(',')})`

          const result = await pool.query(
            `INSERT INTO reference_sidewalks (osm_id, osm_type, geometry, street, surface, width, tags, side)
             VALUES ($1, $2, ST_GeomFromText($3), $4, $5, $6, $7, NULL)
             ON CONFLICT (osm_id, side) DO UPDATE SET
               geometry = EXCLUDED.geometry,
               street = EXCLUDED.street,
               surface = EXCLUDED.surface,
               width = EXCLUDED.width,
               tags = EXCLUDED.tags,
               last_updated = CURRENT_TIMESTAMP
             RETURNING (xmax = 0) AS inserted`,
            [way.id, 'way', wkt, street, surface, width, JSON.stringify(tags)]
          )

          if (result.rows[0].inserted) {
            imported++
          } else {
            updated++
          }
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
    console.log(`   Skipped:   ${skipped} (insufficient coordinates or errors)`)
    console.log(`   Errors:    ${errors}`)

    // Get total count
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM reference_sidewalks WHERE status = 'active'"
    )
    console.log(`\n📊 Total active reference sidewalks: ${countResult.rows[0].total}`)

    // Get breakdown
    const breakdownResult = await pool.query(`
      SELECT
        CASE
          WHEN tags->>'generated_from' = 'road_centerline' THEN 'Road-based (offset)'
          ELSE 'Separate ways'
        END as source_type,
        COUNT(*) as count
      FROM reference_sidewalks
      WHERE status = 'active'
      GROUP BY source_type
    `)

    console.log('\n📈 Breakdown by source:')
    breakdownResult.rows.forEach(row => {
      console.log(`   ${row.source_type}: ${row.count}`)
    })

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
