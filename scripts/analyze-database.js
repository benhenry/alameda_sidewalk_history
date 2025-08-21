const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(process.cwd(), 'data', 'sidewalks.db')

try {
  const db = new Database(dbPath)
  
  console.log('=== DATABASE ANALYSIS ===\n')
  
  // Get table structure
  console.log('1. TABLE STRUCTURE:')
  const tableInfo = db.pragma("table_info(sidewalk_segments)")
  console.table(tableInfo)
  
  // Get sample data
  console.log('\n2. SAMPLE DATA:')
  const sampleData = db.prepare('SELECT * FROM sidewalk_segments LIMIT 5').all()
  console.table(sampleData)
  
  // Check for data issues
  console.log('\n3. DATA VALIDATION:')
  
  // Check coordinates format
  const coordIssues = db.prepare(`
    SELECT id, coordinates, 
           CASE 
             WHEN coordinates IS NULL THEN 'NULL'
             WHEN coordinates = '' THEN 'EMPTY'
             WHEN coordinates NOT LIKE '[%' THEN 'NO_BRACKET'
             WHEN coordinates NOT LIKE '%]' THEN 'NO_CLOSING_BRACKET'
             ELSE 'OK'
           END as coord_status
    FROM sidewalk_segments
  `).all()
  
  const badCoords = coordIssues.filter(row => row.coord_status !== 'OK')
  console.log(`Coordinate issues found: ${badCoords.length}`)
  if (badCoords.length > 0) {
    console.table(badCoords)
  }
  
  // Check special marks format
  const marksIssues = db.prepare(`
    SELECT id, special_marks,
           CASE 
             WHEN special_marks IS NULL THEN 'NULL'
             WHEN special_marks = '' THEN 'EMPTY'
             WHEN special_marks NOT LIKE '[%' AND special_marks NOT LIKE 'null' THEN 'NOT_JSON'
             ELSE 'OK'
           END as marks_status
    FROM sidewalk_segments
    WHERE special_marks IS NOT NULL AND special_marks != ''
  `).all()
  
  const badMarks = marksIssues.filter(row => row.marks_status !== 'OK')
  console.log(`\nSpecial marks issues found: ${badMarks.length}`)
  if (badMarks.length > 0) {
    console.table(badMarks)
  }
  
  // Check required fields
  const missingData = db.prepare(`
    SELECT id, contractor, year, street, block,
           CASE 
             WHEN contractor IS NULL OR contractor = '' THEN 'MISSING_CONTRACTOR'
             WHEN year IS NULL OR year = 0 THEN 'MISSING_YEAR'
             WHEN street IS NULL OR street = '' THEN 'MISSING_STREET'
             WHEN block IS NULL OR block = '' THEN 'MISSING_BLOCK'
             ELSE 'OK'
           END as data_status
    FROM sidewalk_segments
  `).all()
  
  const badData = missingData.filter(row => row.data_status !== 'OK')
  console.log(`\nMissing required data issues found: ${badData.length}`)
  if (badData.length > 0) {
    console.table(badData)
  }
  
  // Overall stats
  console.log('\n4. OVERALL STATS:')
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_segments,
      COUNT(CASE WHEN coordinates IS NULL OR coordinates = '' THEN 1 END) as null_coordinates,
      COUNT(CASE WHEN contractor IS NULL OR contractor = '' THEN 1 END) as null_contractor,
      COUNT(CASE WHEN year IS NULL OR year = 0 THEN 1 END) as null_year,
      COUNT(CASE WHEN street IS NULL OR street = '' THEN 1 END) as null_street,
      COUNT(CASE WHEN block IS NULL OR block = '' THEN 1 END) as null_block
    FROM sidewalk_segments
  `).get()
  
  console.table(stats)
  
  db.close()
  
} catch (error) {
  console.error('Error analyzing database:', error.message)
  
  if (error.code === 'SQLITE_CANTOPEN') {
    console.log('\nDatabase file not found. Creating a fresh database...')
    // Create a minimal database for analysis
    const db = new Database(dbPath)
    db.exec(`
      CREATE TABLE IF NOT EXISTS sidewalk_segments (
        id TEXT PRIMARY KEY,
        coordinates TEXT NOT NULL,
        contractor TEXT NOT NULL,
        year INTEGER NOT NULL,
        street TEXT NOT NULL,
        block TEXT NOT NULL,
        notes TEXT,
        special_marks TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Empty database created. No data to fix.')
    db.close()
  }
}