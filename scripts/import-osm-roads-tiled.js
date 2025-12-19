#!/usr/bin/env node

/**
 * Tiled import of road-based sidewalks
 * Splits Alameda into smaller tiles to avoid Overpass API timeouts
 */

const { Pool } = require('pg')
const turf = require('@turf/turf')

const ALAMEDA_BOUNDS = {
  south: 37.75,
  west: -122.32,
  north: 37.78,
  east: -122.22
}

const SIDEWALK_OFFSET = 3 // meters

// Create 6 tiles (3 columns x 2 rows)
function createTiles(bounds) {
  const latRange = bounds.north - bounds.south
  const lngRange = bounds.east - bounds.west

  const tiles = []
  const cols = 3
  const rows = 2

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const south = bounds.south + (latRange / rows) * row
      const north = bounds.south + (latRange / rows) * (row + 1)
      const west = bounds.west + (lngRange / cols) * col
      const east = bounds.west + (lngRange / cols) * (col + 1)

      tiles.push({
        id: `tile_${row}_${col}`,
        south, north, west, east
      })
    }
  }

  return tiles
}

function generateSidewalkGeometry(roadCoordinates, side, offsetMeters) {
  try {
    const line = turf.lineString(roadCoordinates.map(([lat, lng]) => [lng, lat]))
    const offsetDistance = side === 'left' ? -offsetMeters : offsetMeters
    const offsetLine = turf.lineOffset(line, offsetDistance / 1000, { units: 'kilometers' })
    return offsetLine.geometry.coordinates.map(([lng, lat]) => [lat, lng])
  } catch (error) {
    return null
  }
}

async function importTile(pool, tile, tileNumber, totalTiles) {
  const query = `[out:json][timeout:60];
way["highway"]["sidewalk"~"both|left|right|yes"](${tile.south},${tile.west},${tile.north},${tile.east});
(._;>;);
out geom;`

  console.log(`\n📍 Tile ${tileNumber}/${totalTiles} (${tile.id})`)
  console.log(`   Bounds: [${tile.south.toFixed(3)}, ${tile.west.toFixed(3)}] to [${tile.north.toFixed(3)}, ${tile.east.toFixed(3)}]`)

  try {
    const response = await fetch('https://overpass.kumi.systems/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    })

    if (!response.ok) {
      console.error(`   ❌ API error: ${response.status}`)
      return { imported: 0, updated: 0, skipped: 0, errors: 1 }
    }

    const data = await response.json()

    // Build node map
    const nodeMap = new Map()
    data.elements.forEach(el => {
      if (el.type === 'node' && el.lat && el.lon) {
        nodeMap.set(el.id, [el.lat, el.lon])
      }
    })

    const ways = data.elements.filter(el => el.type === 'way' && el.nodes)
    console.log(`   📦 Processing ${ways.length} roads...`)

    let imported = 0, updated = 0, skipped = 0, errors = 0

    for (const way of ways) {
      try {
        const coordinates = way.nodes.map(n => nodeMap.get(n)).filter(c => c)
        if (coordinates.length < 2) {
          skipped++
          continue
        }

        const tags = way.tags || {}
        const sidewalkTag = tags.sidewalk
        const sides = sidewalkTag === 'left' ? ['left']
                   : sidewalkTag === 'right' ? ['right']
                   : ['left', 'right']

        for (const side of sides) {
          const offsetCoords = generateSidewalkGeometry(coordinates, side, SIDEWALK_OFFSET)
          if (!offsetCoords || offsetCoords.length < 2) {
            skipped++
            continue
          }

          const wkt = `SRID=4326;LINESTRING(${offsetCoords.map(([lat, lng]) => `${lng} ${lat}`).join(',')})`
          const street = tags.name || tags['addr:street'] || null
          const surface = tags.surface || null
          const tagsCopy = { ...tags, generated_from: 'road_centerline', tile: tile.id }

          const result = await pool.query(
            `INSERT INTO reference_sidewalks (osm_id, osm_type, geometry, street, surface, tags, side)
             VALUES ($1, 'way', ST_GeomFromText($2), $3, $4, $5, $6)
             ON CONFLICT (osm_id, side) DO UPDATE SET
               geometry = EXCLUDED.geometry,
               street = EXCLUDED.street,
               surface = EXCLUDED.surface,
               tags = EXCLUDED.tags,
               last_updated = CURRENT_TIMESTAMP
             RETURNING (xmax = 0) AS inserted`,
            [way.id, wkt, street, surface, JSON.stringify(tagsCopy), side]
          )

          result.rows[0].inserted ? imported++ : updated++
        }
      } catch (err) {
        errors++
      }
    }

    console.log(`   ✅ Tile complete: ${imported} imported, ${updated} updated, ${skipped} skipped`)
    return { imported, updated, skipped, errors }

  } catch (error) {
    console.error(`   ❌ Tile failed:`, error.message)
    return { imported: 0, updated: 0, skipped: 0, errors: 1 }
  }
}

async function importAllTiles() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    console.log('🗺️  TILED ROAD-BASED SIDEWALK IMPORT')
    console.log('=====================================\n')

    const tiles = createTiles(ALAMEDA_BOUNDS)
    console.log(`Created ${tiles.length} tiles to process`)

    let totalImported = 0, totalUpdated = 0, totalSkipped = 0, totalErrors = 0

    for (let i = 0; i < tiles.length; i++) {
      const result = await importTile(pool, tiles[i], i + 1, tiles.length)

      totalImported += result.imported
      totalUpdated += result.updated
      totalSkipped += result.skipped
      totalErrors += result.errors

      // Wait 3 seconds between tiles to be respectful to the API
      if (i < tiles.length - 1) {
        console.log('   ⏳ Waiting 3 seconds before next tile...')
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }

    console.log('\n=====================================')
    console.log('📊 FINAL RESULTS')
    console.log('=====================================')
    console.log(`   Imported:  ${totalImported} new sidewalks`)
    console.log(`   Updated:   ${totalUpdated} existing sidewalks`)
    console.log(`   Skipped:   ${totalSkipped}`)
    console.log(`   Errors:    ${totalErrors}`)

    // Get total count and breakdown
    const countResult = await pool.query(
      "SELECT COUNT(*) as total FROM reference_sidewalks WHERE status = 'active'"
    )
    console.log(`\n📈 Total active reference sidewalks: ${countResult.rows[0].total}`)

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
      ORDER BY count DESC
    `)

    console.log('\n📊 Breakdown by source:')
    breakdownResult.rows.forEach(row => {
      console.log(`   ${row.source_type}: ${row.count}`)
    })

    console.log('\n✅ Import complete!')

  } catch (error) {
    console.error('\n💥 Import failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL required')
    console.error('   Example: DATABASE_URL="postgresql://..." node scripts/import-osm-roads-tiled.js')
    process.exit(1)
  }
  importAllTiles()
}

module.exports = { importAllTiles }
