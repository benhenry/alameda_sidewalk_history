#!/usr/bin/env node

/**
 * Import sidewalks from roads with sidewalk tags
 * This supplements the separate sidewalk ways we already have
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

const overpassQuery = `[out:json][timeout:60];
way["highway"]["sidewalk"~"both|left|right|yes"](${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
(._;>;);
out geom;`

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

async function importRoadSidewalks() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  try {
    console.log('🛣️  Importing road-based sidewalks...')
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery)}`
    })

    if (!response.ok) throw new Error(`Overpass error: ${response.status}`)

    const data = await response.json()
    console.log(`📦 Received ${data.elements.length} elements`)

    const nodeMap = new Map()
    data.elements.forEach(el => {
      if (el.type === 'node' && el.lat && el.lon) nodeMap.set(el.id, [el.lat, el.lon])
    })

    const ways = data.elements.filter(el => el.type === 'way' && el.nodes)
    console.log(`Processing ${ways.length} roads with sidewalk tags...`)

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
          const tagsCopy = { ...tags, generated_from: 'road_centerline' }

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

          if ((imported + updated) % 100 === 0) {
            console.log(`⏳ ${imported} imported, ${updated} updated`)
          }
        }
      } catch (err) {
        console.error(`Error on way ${way.id}:`, err.message)
        errors++
      }
    }

    console.log(`\n✅ Complete! Imported: ${imported}, Updated: ${updated}, Errors: ${errors}`)

    const count = await pool.query("SELECT COUNT(*) as total FROM reference_sidewalks WHERE status = 'active'")
    console.log(`📊 Total active sidewalks: ${count.rows[0].total}`)

  } catch (error) {
    console.error('💥 Failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL required')
    process.exit(1)
  }
  importRoadSidewalks()
}

module.exports = { importRoadSidewalks }
