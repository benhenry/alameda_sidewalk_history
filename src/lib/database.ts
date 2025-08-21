import Database from 'better-sqlite3'
import path from 'path'

const dbPath = path.join(process.cwd(), 'data', 'sidewalks.db')
const db = new Database(dbPath)

// Initialize database tables
export function initDatabase() {
  // Create directories if they don't exist
  const fs = require('fs')
  const dataDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login_at DATETIME
    )
  `)

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
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      created_by TEXT,
      approved_by TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (approved_by) REFERENCES users (id)
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      sidewalk_segment_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      caption TEXT,
      type TEXT NOT NULL CHECK (type IN ('contractor_stamp', 'special_mark', 'general')),
      coordinates TEXT,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sidewalk_segment_id) REFERENCES sidewalk_segments (id) ON DELETE CASCADE
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS contractors (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      years_active TEXT,
      total_segments INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `)

  // Handle migration for existing segments without status
  db.exec(`
    UPDATE sidewalk_segments 
    SET status = 'approved' 
    WHERE status IS NULL OR status = ''
  `)

  // Create indexes for better performance
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_segments_contractor ON sidewalk_segments (contractor)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_segments_year ON sidewalk_segments (year)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_segments_street ON sidewalk_segments (street)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_segments_status ON sidewalk_segments (status)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_segments_created_by ON sidewalk_segments (created_by)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_photos_segment ON photos (sidewalk_segment_id)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens (token)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens (user_id)`)
}

// Initialize database immediately
initDatabase()

// User operations
export const userQueries = {
  getByEmail: db.prepare(`
    SELECT id, email, username, password_hash, role, created_at, last_login_at
    FROM users WHERE email = ?
  `),

  getByUsername: db.prepare(`
    SELECT id, email, username, password_hash, role, created_at, last_login_at
    FROM users WHERE username = ?
  `),

  getById: db.prepare(`
    SELECT id, email, username, role, created_at, last_login_at
    FROM users WHERE id = ?
  `),

  create: db.prepare(`
    INSERT INTO users (id, email, username, password_hash, role)
    VALUES (?, ?, ?, ?, ?)
  `),

  updateLastLogin: db.prepare(`
    UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?
  `),

  getAll: db.prepare(`
    SELECT id, email, username, role, created_at, last_login_at
    FROM users ORDER BY created_at DESC
  `),

  updateRole: db.prepare(`
    UPDATE users SET role = ? WHERE id = ?
  `),

  updatePassword: db.prepare(`
    UPDATE users SET password_hash = ? WHERE id = ?
  `),
}

// Segment operations
export const segmentQueries = {
  getAll: db.prepare(`
    SELECT s.*, 
           GROUP_CONCAT(p.id) as photo_ids,
           GROUP_CONCAT(p.filename) as photo_filenames,
           GROUP_CONCAT(p.type) as photo_types
    FROM sidewalk_segments s
    LEFT JOIN photos p ON s.id = p.sidewalk_segment_id
    WHERE s.status = 'approved'
    GROUP BY s.id
    ORDER BY s.street, s.block
  `),

  getById: db.prepare(`
    SELECT s.*, 
           GROUP_CONCAT(p.id) as photo_ids,
           GROUP_CONCAT(p.filename) as photo_filenames,
           GROUP_CONCAT(p.type) as photo_types
    FROM sidewalk_segments s
    LEFT JOIN photos p ON s.id = p.sidewalk_segment_id
    WHERE s.id = ?
    GROUP BY s.id
  `),

  insert: db.prepare(`
    INSERT INTO sidewalk_segments (id, coordinates, contractor, year, street, block, notes, special_marks, created_by, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `),

  update: db.prepare(`
    UPDATE sidewalk_segments 
    SET coordinates = ?, contractor = ?, year = ?, street = ?, block = ?, notes = ?, special_marks = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  delete: db.prepare(`DELETE FROM sidewalk_segments WHERE id = ?`),

  getByFilters: db.prepare(`
    SELECT s.*, 
           GROUP_CONCAT(p.id) as photo_ids,
           GROUP_CONCAT(p.filename) as photo_filenames,
           GROUP_CONCAT(p.type) as photo_types
    FROM sidewalk_segments s
    LEFT JOIN photos p ON s.id = p.sidewalk_segment_id
    WHERE s.status = 'approved'
      AND (? IS NULL OR s.contractor = ?)
      AND (? IS NULL OR s.year = ?)
      AND (? IS NULL OR s.street = ?)
    GROUP BY s.id
    ORDER BY s.street, s.block
  `),

  // Admin queries
  getPending: db.prepare(`
    SELECT s.*, u.username as created_by_username,
           GROUP_CONCAT(p.id) as photo_ids,
           GROUP_CONCAT(p.filename) as photo_filenames,
           GROUP_CONCAT(p.type) as photo_types
    FROM sidewalk_segments s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN photos p ON s.id = p.sidewalk_segment_id
    WHERE s.status = 'pending'
    GROUP BY s.id
    ORDER BY s.created_at ASC
  `),

  approve: db.prepare(`
    UPDATE sidewalk_segments 
    SET status = 'approved', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  reject: db.prepare(`
    UPDATE sidewalk_segments 
    SET status = 'rejected', approved_by = ?, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  getAllWithStatus: db.prepare(`
    SELECT s.*, u.username as created_by_username, a.username as approved_by_username,
           GROUP_CONCAT(p.id) as photo_ids,
           GROUP_CONCAT(p.filename) as photo_filenames,
           GROUP_CONCAT(p.type) as photo_types
    FROM sidewalk_segments s
    LEFT JOIN users u ON s.created_by = u.id
    LEFT JOIN users a ON s.approved_by = a.id
    LEFT JOIN photos p ON s.id = p.sidewalk_segment_id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `),
}

// Photo operations
export const photoQueries = {
  getBySegmentId: db.prepare(`
    SELECT * FROM photos WHERE sidewalk_segment_id = ? ORDER BY uploaded_at DESC
  `),

  insert: db.prepare(`
    INSERT INTO photos (id, sidewalk_segment_id, filename, caption, type, coordinates)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  delete: db.prepare(`DELETE FROM photos WHERE id = ?`),

  update: db.prepare(`
    UPDATE photos SET caption = ?, type = ? WHERE id = ?
  `),
}

// Contractor operations
export const contractorQueries = {
  getAll: db.prepare(`
    SELECT c.*, COUNT(s.id) as total_segments
    FROM contractors c
    LEFT JOIN sidewalk_segments s ON c.name = s.contractor
    GROUP BY c.id
    ORDER BY c.name
  `),

  upsert: db.prepare(`
    INSERT INTO contractors (id, name, years_active)
    VALUES (?, ?, ?)
    ON CONFLICT (name) DO UPDATE SET
      years_active = excluded.years_active
  `),

  updateSegmentCount: db.prepare(`
    UPDATE contractors 
    SET total_segments = (
      SELECT COUNT(*) FROM sidewalk_segments WHERE contractor = contractors.name
    )
    WHERE name = ?
  `),
}

// Password reset token operations
export const passwordResetQueries = {
  create: db.prepare(`
    INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
    VALUES (?, ?, ?, ?)
  `),

  getByToken: db.prepare(`
    SELECT prt.*, u.email, u.username
    FROM password_reset_tokens prt
    JOIN users u ON prt.user_id = u.id
    WHERE prt.token = ? AND prt.used_at IS NULL AND prt.expires_at > CURRENT_TIMESTAMP
  `),

  markAsUsed: db.prepare(`
    UPDATE password_reset_tokens 
    SET used_at = CURRENT_TIMESTAMP 
    WHERE token = ?
  `),

  cleanupExpired: db.prepare(`
    DELETE FROM password_reset_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP OR used_at IS NOT NULL
  `),

  deleteByUserId: db.prepare(`
    DELETE FROM password_reset_tokens WHERE user_id = ?
  `),
}

// Utility functions
export function parseCoordinates(coordinatesStr: string): [number, number][] {
  try {
    return JSON.parse(coordinatesStr)
  } catch {
    return []
  }
}

export function stringifyCoordinates(coordinates: [number, number][]): string {
  return JSON.stringify(coordinates)
}

export function parseSpecialMarks(marksStr: string | null): string[] {
  if (!marksStr) return []
  try {
    return JSON.parse(marksStr)
  } catch {
    return marksStr.split(',').map(mark => mark.trim()).filter(Boolean)
  }
}

export function stringifySpecialMarks(marks: string[]): string {
  return JSON.stringify(marks)
}

export default db