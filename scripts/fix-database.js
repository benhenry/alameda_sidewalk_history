const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(process.cwd(), 'data', 'sidewalks.db')

try {
  const db = new Database(dbPath)
  
  console.log('=== FIXING DATABASE ===\n')
  
  console.log('1. Checking current schema...')
  const tableInfo = db.pragma("table_info(sidewalk_segments)")
  const columnNames = tableInfo.map(col => col.name)
  console.log(`Current columns: ${columnNames.join(', ')}`)
  
  // Track changes made
  let changesMade = []
  
  console.log('\n2. Adding missing schema fields...')
  
  // Add status column if missing
  if (!columnNames.includes('status')) {
    console.log('  → Adding status column...')
    db.exec(`
      ALTER TABLE sidewalk_segments 
      ADD COLUMN status TEXT NOT NULL DEFAULT 'approved' 
      CHECK (status IN ('pending', 'approved', 'rejected'))
    `)
    changesMade.push('Added status column')
  }
  
  // Add approved_by column if missing
  if (!columnNames.includes('approved_by')) {
    console.log('  → Adding approved_by column...')
    db.exec(`
      ALTER TABLE sidewalk_segments 
      ADD COLUMN approved_by TEXT 
      REFERENCES users(id)
    `)
    changesMade.push('Added approved_by column')
  }
  
  // Add approved_at column if missing
  if (!columnNames.includes('approved_at')) {
    console.log('  → Adding approved_at column...')
    db.exec(`
      ALTER TABLE sidewalk_segments 
      ADD COLUMN approved_at DATETIME
    `)
    changesMade.push('Added approved_at column')
  }
  
  console.log('\n3. Updating existing data...')
  
  // Set existing segments to approved status (they were created before approval system)
  const updateResult = db.prepare(`
    UPDATE sidewalk_segments 
    SET status = 'approved', approved_at = CURRENT_TIMESTAMP 
    WHERE status IS NULL OR status = '' OR status = 'approved'
  `).run()
  
  console.log(`  → Updated ${updateResult.changes} segments to approved status`)
  if (updateResult.changes > 0) {
    changesMade.push(`Updated ${updateResult.changes} segments to approved status`)
  }
  
  console.log('\n4. Creating/updating indexes...')
  
  // Create status index for performance
  db.exec('CREATE INDEX IF NOT EXISTS idx_segments_status ON sidewalk_segments (status)')
  changesMade.push('Created status index')
  
  // Create other indexes if they don't exist
  db.exec('CREATE INDEX IF NOT EXISTS idx_segments_contractor ON sidewalk_segments (contractor)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_segments_year ON sidewalk_segments (year)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_segments_street ON sidewalk_segments (street)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_segments_created_by ON sidewalk_segments (created_by)')
  
  console.log('\n5. Data validation and cleanup...')
  
  // Check for any malformed coordinates and try to fix them
  const segments = db.prepare('SELECT id, coordinates, special_marks FROM sidewalk_segments').all()
  let fixedCount = 0
  
  for (const segment of segments) {
    let needsUpdate = false
    let newCoordinates = segment.coordinates
    let newSpecialMarks = segment.special_marks
    
    // Validate and fix coordinates
    if (segment.coordinates) {
      try {
        JSON.parse(segment.coordinates)
      } catch (e) {
        console.log(`    ⚠️  Fixing malformed coordinates for segment ${segment.id}`)
        // Try to fix common issues
        if (segment.coordinates.includes('[[') && segment.coordinates.includes(']]')) {
          // Coordinates look mostly right, maybe just spacing issues
          newCoordinates = segment.coordinates.replace(/\s+/g, '').replace(/,+/g, ',')
        } else {
          console.log(`    ❌ Cannot fix coordinates for segment ${segment.id}: ${segment.coordinates}`)
          continue
        }
        needsUpdate = true
      }
    }
    
    // Validate and fix special marks
    if (segment.special_marks && segment.special_marks !== '[]' && segment.special_marks !== 'null') {
      try {
        JSON.parse(segment.special_marks)
      } catch (e) {
        console.log(`    ⚠️  Fixing malformed special_marks for segment ${segment.id}`)
        // If it's not JSON, try to convert it to a JSON array
        if (segment.special_marks.includes(',')) {
          // Comma-separated values
          const marks = segment.special_marks.split(',').map(m => m.trim()).filter(m => m)
          newSpecialMarks = JSON.stringify(marks)
        } else {
          // Single value
          newSpecialMarks = JSON.stringify([segment.special_marks.trim()])
        }
        needsUpdate = true
      }
    }
    
    // Update if needed
    if (needsUpdate) {
      db.prepare('UPDATE sidewalk_segments SET coordinates = ?, special_marks = ? WHERE id = ?')
        .run(newCoordinates, newSpecialMarks, segment.id)
      fixedCount++
    }
  }
  
  if (fixedCount > 0) {
    console.log(`  → Fixed ${fixedCount} segments with malformed data`)
    changesMade.push(`Fixed ${fixedCount} malformed segments`)
  } else {
    console.log('  → No malformed data found')
  }
  
  console.log('\n6. Final validation...')
  
  // Get final stats
  const finalStats = db.prepare(`
    SELECT 
      COUNT(*) as total_segments,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_segments,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_segments,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_segments
    FROM sidewalk_segments
  `).get()
  
  console.table(finalStats)
  
  // Show updated schema
  console.log('\n7. Updated schema:')
  const newTableInfo = db.pragma("table_info(sidewalk_segments)")
  console.table(newTableInfo)
  
  console.log('\n✅ DATABASE FIX COMPLETED!')
  console.log('\nChanges made:')
  changesMade.forEach((change, i) => {
    console.log(`  ${i + 1}. ${change}`)
  })
  
  if (changesMade.length === 0) {
    console.log('  → No changes needed, database was already in good shape!')
  }
  
  console.log('\nYour database is now ready for the new admin approval system.')
  console.log('All existing segments have been set to "approved" status and will continue to appear on the map.')
  console.log('New segments created going forward will be "pending" until approved by an admin.')
  
  db.close()
  
} catch (error) {
  console.error('❌ Error fixing database:', error.message)
  console.error(error.stack)
}