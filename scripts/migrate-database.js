const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.join(process.cwd(), 'data', 'sidewalks.db')
const db = new Database(dbPath)

console.log('Starting database migration...')

try {
  // Check if columns already exist
  const tableInfo = db.pragma("table_info(sidewalk_segments)")
  const columnNames = tableInfo.map(col => col.name)
  
  if (!columnNames.includes('status')) {
    console.log('Adding status column...')
    db.exec('ALTER TABLE sidewalk_segments ADD COLUMN status TEXT NOT NULL DEFAULT "approved" CHECK (status IN ("pending", "approved", "rejected"))')
  }
  
  if (!columnNames.includes('approved_by')) {
    console.log('Adding approved_by column...')
    db.exec('ALTER TABLE sidewalk_segments ADD COLUMN approved_by TEXT REFERENCES users(id)')
  }
  
  if (!columnNames.includes('approved_at')) {
    console.log('Adding approved_at column...')
    db.exec('ALTER TABLE sidewalk_segments ADD COLUMN approved_at DATETIME')
  }

  // Update existing segments to be approved (since they were created before the approval system)
  const result = db.prepare('UPDATE sidewalk_segments SET status = ? WHERE status IS NULL OR status = ""').run('approved')
  console.log(`Updated ${result.changes} existing segments to approved status`)

  // Create new indexes
  console.log('Creating new indexes...')
  db.exec('CREATE INDEX IF NOT EXISTS idx_segments_status ON sidewalk_segments (status)')

  console.log('Migration completed successfully!')
  
} catch (error) {
  console.error('Migration failed:', error)
} finally {
  db.close()
}