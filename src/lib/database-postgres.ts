// PostgreSQL database configuration for Google Cloud deployment
// This replaces the SQLite database.ts for production use

import { Pool, PoolClient } from 'pg'
import { SidewalkSegment, Contractor } from '@/types/sidewalk'
import { User } from '@/types/auth'
import { logPerf } from './perf-logger'

// Create a connection pool with fallback to individual env vars
const connectionConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      host: process.env.PGHOST,
      database: process.env.PGDATABASE || 'postgres',
      user: process.env.PGUSER || 'postgres', 
      password: process.env.PGPASSWORD ? String(process.env.PGPASSWORD) : undefined,
      ssl: false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }

// Debug logging for connection config (without password)
console.log('🔧 PostgreSQL connection config:', {
  ...connectionConfig,
  password: connectionConfig.password ? '[SET]' : '[MISSING]'
})

const pool = new Pool(connectionConfig)

// Connection wrapper for better error handling with performance logging
async function withDatabase<T>(callback: (client: PoolClient) => Promise<T>, operationName?: string): Promise<T> {
  const start = performance.now()
  const client = await pool.connect()
  const connectTime = performance.now() - start

  if (connectTime > 50) {
    logPerf('db.connect', connectTime)
  }

  try {
    const queryStart = performance.now()
    const result = await callback(client)
    const queryTime = performance.now() - queryStart

    if (operationName) {
      logPerf(`db.${operationName}`, queryTime)
    }

    return result
  } finally {
    client.release()
  }
}

// Initialize database connection (replaces initDatabase)
export async function initDatabase() {
  try {
    const client = await pool.connect()
    console.log('✅ Connected to PostgreSQL database')
    client.release()
  } catch (err) {
    console.error('❌ Database connection failed:', err)
    throw err
  }
}

// User operations
export const getUserByEmail = async (email: string): Promise<User | null> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )
    return result.rows[0] || null
  })
}

export const getUserByUsername = async (username: string): Promise<User | null> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    )
    return result.rows[0] || null
  })
}

export const createUser = async (userData: {
  email: string
  username: string
  passwordHash: string
  role?: string
}): Promise<User> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      `INSERT INTO users (email, username, password_hash, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [userData.email, userData.username, userData.passwordHash, userData.role || 'user']
    )
    return result.rows[0]
  })
}

export const getUserById = async (id: string): Promise<User | null> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    )
    return result.rows[0] || null
  })
}

export const updateUserLastLogin = async (userId: string): Promise<void> => {
  return withDatabase(async (client) => {
    await client.query(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    )
  })
}

// Sidewalk segment operations
export const getAllSegments = async (): Promise<SidewalkSegment[]> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      `SELECT s.*, u.username as created_by_username
       FROM sidewalk_segments s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.status = 'approved'
       ORDER BY s.created_at DESC`
    )
    return result.rows.map(row => ({
      ...row,
      coordinates: row.coordinates,
      special_marks: row.special_marks || [],
      specialMarks: row.special_marks || [], // Legacy compatibility
    }))
  }, 'getAllSegments')
}

export const getFilteredSegments = async (filters?: {
  contractor?: string
  year?: number
  street?: string
}): Promise<SidewalkSegment[]> => {
  return withDatabase(async (client) => {
    let query = `
      SELECT s.*, u.username as created_by_username
      FROM sidewalk_segments s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.status = 'approved'
    `
    const params: any[] = []
    let paramIndex = 1

    if (filters?.contractor) {
      query += ` AND s.contractor = $${paramIndex}`
      params.push(filters.contractor)
      paramIndex++
    }
    if (filters?.year) {
      query += ` AND s.year = $${paramIndex}`
      params.push(filters.year)
      paramIndex++
    }
    if (filters?.street) {
      query += ` AND s.street = $${paramIndex}`
      params.push(filters.street)
      paramIndex++
    }

    query += ' ORDER BY s.created_at DESC'

    const result = await client.query(query, params)
    return result.rows.map(row => ({
      ...row,
      coordinates: row.coordinates,
      special_marks: row.special_marks || [],
      specialMarks: row.special_marks || [],
    }))
  }, 'getFilteredSegments')
}

export const getSegmentById = async (id: string): Promise<SidewalkSegment | null> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      `SELECT s.*, u.username as created_by_username 
       FROM sidewalk_segments s 
       LEFT JOIN users u ON s.created_by = u.id 
       WHERE s.id = $1`,
      [id]
    )
    if (!result.rows[0]) return null
    
    const row = result.rows[0]
    return {
      ...row,
      coordinates: row.coordinates,
      special_marks: row.special_marks || [],
      specialMarks: row.special_marks || [],
    }
  })
}

export const createSegment = async (segmentData: {
  street: string
  block: string
  contractor: string
  year: number
  coordinates: [number, number][]
  specialMarks?: string[]
  notes?: string
  createdBy?: string
  status?: 'pending' | 'approved'
}): Promise<SidewalkSegment> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      `INSERT INTO sidewalk_segments 
       (street, block, contractor, year, coordinates, special_marks, notes, created_by, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        segmentData.street,
        segmentData.block,
        segmentData.contractor,
        segmentData.year,
        JSON.stringify(segmentData.coordinates),
        JSON.stringify(segmentData.specialMarks || []),
        segmentData.notes,
        segmentData.createdBy,
        segmentData.status || 'approved'
      ]
    )
    
    const row = result.rows[0]
    return {
      ...row,
      coordinates: row.coordinates,
      special_marks: row.special_marks || [],
      specialMarks: row.special_marks || [],
    }
  })
}

export const updateSegment = async (id: string, updates: Partial<SidewalkSegment>): Promise<SidewalkSegment | null> => {
  return withDatabase(async (client) => {
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'coordinates' || key === 'specialMarks' || key === 'special_marks') {
          setClauses.push(`${key} = $${paramIndex}`)
          values.push(JSON.stringify(value))
        } else {
          setClauses.push(`${key} = $${paramIndex}`)
          values.push(value)
        }
        paramIndex++
      }
    })

    if (setClauses.length === 0) return null

    values.push(id)
    const result = await client.query(
      `UPDATE sidewalk_segments 
       SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} 
       RETURNING *`,
      values
    )

    if (!result.rows[0]) return null
    
    const row = result.rows[0]
    return {
      ...row,
      coordinates: row.coordinates,
      special_marks: row.special_marks || [],
      specialMarks: row.special_marks || [],
    }
  })
}

export const deleteSegment = async (id: string): Promise<boolean> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      'DELETE FROM sidewalk_segments WHERE id = $1',
      [id]
    )
    return (result.rowCount || 0) > 0
  })
}

// Admin operations
export const getAdminSegments = async (status?: string): Promise<SidewalkSegment[]> => {
  return withDatabase(async (client) => {
    let query = `
      SELECT s.*, 
             cb.username as created_by_username,
             ab.username as approved_by_username
      FROM sidewalk_segments s 
      LEFT JOIN users cb ON s.created_by = cb.id 
      LEFT JOIN users ab ON s.approved_by = ab.id
    `
    const values = []
    
    if (status) {
      query += ' WHERE s.status = $1'
      values.push(status)
    }
    
    query += ' ORDER BY s.created_at DESC'
    
    const result = await client.query(query, values)
    return result.rows.map(row => ({
      ...row,
      coordinates: row.coordinates,
      special_marks: row.special_marks || [],
      specialMarks: row.special_marks || [],
    }))
  })
}

export const updateSegmentStatus = async (
  segmentId: string, 
  status: 'approved' | 'rejected', 
  approvedBy: string
): Promise<SidewalkSegment | null> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      `UPDATE sidewalk_segments 
       SET status = $1, approved_by = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 
       RETURNING *`,
      [status, approvedBy, segmentId]
    )
    
    if (!result.rows[0]) return null
    
    const row = result.rows[0]
    return {
      ...row,
      coordinates: row.coordinates,
      special_marks: row.special_marks || [],
      specialMarks: row.special_marks || [],
    }
  })
}

// Contractor operations
export const getAllContractors = async (): Promise<Contractor[]> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      'SELECT * FROM contractors ORDER BY name'
    )
    return result.rows
  })
}

export const updateContractorStats = async (): Promise<void> => {
  return withDatabase(async (client) => {
    await client.query(`
      INSERT INTO contractors (name, total_segments, first_year, last_year)
      SELECT 
        contractor,
        COUNT(*) as total_segments,
        MIN(year) as first_year,
        MAX(year) as last_year
      FROM sidewalk_segments 
      WHERE status = 'approved'
      GROUP BY contractor
      ON CONFLICT (name) DO UPDATE SET
        total_segments = EXCLUDED.total_segments,
        first_year = EXCLUDED.first_year,
        last_year = EXCLUDED.last_year,
        updated_at = CURRENT_TIMESTAMP
    `)
  })
}

// Photo operations
export const createPhoto = async (photoData: {
  sidewalkSegmentId: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  storageUrl: string
  uploadedBy?: string
}): Promise<any> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      `INSERT INTO photos (sidewalk_segment_id, filename, original_name, mimetype, size, storage_url, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [
        photoData.sidewalkSegmentId,
        photoData.filename,
        photoData.originalName,
        photoData.mimetype,
        photoData.size,
        photoData.storageUrl,
        photoData.uploadedBy
      ]
    )
    return result.rows[0]
  })
}

export const getPhotosBySegmentId = async (segmentId: string): Promise<any[]> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      'SELECT * FROM photos WHERE sidewalk_segment_id = $1 ORDER BY created_at DESC',
      [segmentId]
    )
    return result.rows
  })
}

export const deletePhoto = async (id: string): Promise<boolean> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      'DELETE FROM photos WHERE id = $1',
      [id]
    )
    return (result.rowCount || 0) > 0
  })
}

// Password reset operations
export const createPasswordResetToken = async (userId: string, token: string, expiresAt: Date): Promise<void> => {
  return withDatabase(async (client) => {
    await client.query(
      'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
      [userId, token, expiresAt]
    )
  })
}

export const getPasswordResetToken = async (token: string): Promise<any> => {
  return withDatabase(async (client) => {
    const result = await client.query(
      `SELECT prt.*, u.email, u.username 
       FROM password_reset_tokens prt 
       JOIN users u ON prt.user_id = u.id 
       WHERE prt.token = $1 AND prt.expires_at > CURRENT_TIMESTAMP AND prt.used_at IS NULL`,
      [token]
    )
    return result.rows[0] || null
  })
}

export const markPasswordResetTokenAsUsed = async (token: string): Promise<void> => {
  return withDatabase(async (client) => {
    await client.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    )
  })
}

export const updateUserPassword = async (userId: string, passwordHash: string): Promise<void> => {
  return withDatabase(async (client) => {
    await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, userId]
    )
  })
}

// Health check
export const healthCheck = async (): Promise<boolean> => {
  try {
    const client = await pool.connect()
    await client.query('SELECT 1')
    client.release()
    return true
  } catch {
    return false
  }
}

// Graceful shutdown
export const closeDatabase = async (): Promise<void> => {
  await pool.end()
}

// ============================================================================
// PostGIS Geospatial Functions
// ============================================================================

// PostGIS geometry conversion utilities
export function coordinatesToPostGIS(coordinates: [number, number][]): string {
  const points = coordinates.map(([lat, lng]) => `${lng} ${lat}`).join(',')
  return `SRID=4326;LINESTRING(${points})`
}

// Spatial query functions
export async function getNearbyReferenceSidewalks(
  point: [number, number],
  radiusMeters: number = 50
): Promise<any[]> {
  return withDatabase(async (client) => {
    const result = await client.query(
      `SELECT
        id, osm_id, street,
        ST_AsGeoJSON(geometry)::json as geometry,
        ST_Distance(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) as distance
      FROM reference_sidewalks
      WHERE ST_DWithin(
        geometry::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3
      )
      AND status = 'active'
      ORDER BY distance
      LIMIT 10`,
      [point[0], point[1], radiusMeters]
    )
    return result.rows
  })
}

export async function snapToNearestSidewalk(
  point: [number, number]
): Promise<{ snapped: [number, number]; referenceId: string; street: string | null; distance: number } | null> {
  return withDatabase(async (client) => {
    const result = await client.query(
      `SELECT
        id,
        street,
        ST_Y(ST_ClosestPoint(geometry, ST_SetSRID(ST_MakePoint($2, $1), 4326))) as lat,
        ST_X(ST_ClosestPoint(geometry, ST_SetSRID(ST_MakePoint($2, $1), 4326))) as lng,
        ST_Distance(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) as distance
      FROM reference_sidewalks
      WHERE ST_DWithin(
        geometry::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        50
      )
      AND status = 'active'
      ORDER BY distance
      LIMIT 1`,
      [point[0], point[1]]
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      snapped: [row.lat, row.lng],
      referenceId: row.id,
      street: row.street || null,
      distance: row.distance
    }
  })
}

export async function createReferenceSidewalk(data: {
  osmId: number
  osmType: string
  geometry: [number, number][]
  street?: string
  tags?: Record<string, string>
}): Promise<any> {
  return withDatabase(async (client) => {
    const geometryWKT = coordinatesToPostGIS(data.geometry)
    const result = await client.query(
      `INSERT INTO reference_sidewalks (osm_id, osm_type, geometry, street, tags)
       VALUES ($1, $2, ST_GeomFromText($3), $4, $5)
       ON CONFLICT (osm_id) DO UPDATE SET
         geometry = EXCLUDED.geometry,
         street = EXCLUDED.street,
         tags = EXCLUDED.tags,
         last_updated = CURRENT_TIMESTAMP
       RETURNING *`,
      [data.osmId, data.osmType, geometryWKT, data.street, JSON.stringify(data.tags || {})]
    )
    return result.rows[0]
  })
}

export async function getAllReferenceSidewalks(bounds?: {
  north: number
  south: number
  east: number
  west: number
}): Promise<any[]> {
  return withDatabase(async (client) => {
    let query = `
      SELECT
        id, osm_id, street,
        ST_AsGeoJSON(geometry)::json as geometry,
        tags
      FROM reference_sidewalks
      WHERE status = 'active'
    `
    const params: any[] = []

    if (bounds) {
      query += ` AND ST_Intersects(
        geometry,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )`
      params.push(bounds.west, bounds.south, bounds.east, bounds.north)
    }

    query += ' LIMIT 10000'

    const result = await client.query(query, params)
    return result.rows
  }, 'getAllReferenceSidewalks')
}

export async function updateReferenceSidewalk(
  id: string,
  updates: {
    geometry?: [number, number][]
    street?: string
    status?: string
  }
): Promise<any> {
  return withDatabase(async (client) => {
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (updates.geometry) {
      setClauses.push(`geometry = ST_GeomFromText($${paramIndex})`)
      values.push(coordinatesToPostGIS(updates.geometry))
      paramIndex++
    }
    if (updates.street) {
      setClauses.push(`street = $${paramIndex}`)
      values.push(updates.street)
      paramIndex++
    }
    if (updates.status) {
      setClauses.push(`status = $${paramIndex}`)
      values.push(updates.status)
      paramIndex++
    }

    if (setClauses.length === 0) return null

    values.push(id)
    const result = await client.query(
      `UPDATE reference_sidewalks
       SET ${setClauses.join(', ')}, last_updated = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )
    return result.rows[0]
  })
}

export async function deleteReferenceSidewalk(id: string): Promise<boolean> {
  return withDatabase(async (client) => {
    const result = await client.query(
      'UPDATE reference_sidewalks SET status = $1 WHERE id = $2',
      ['deleted', id]
    )
    return (result.rowCount || 0) > 0
  })
}

// ============================================================================
// Admin Segment Editing Functions
// ============================================================================

export async function adminUpdateSegment(
  id: string,
  updates: {
    coordinates?: [number, number][]
    contractor?: string
    year?: number
    street?: string
    block?: string
    notes?: string
    specialMarks?: string[]
    status?: 'pending' | 'approved' | 'rejected'
  },
  editedBy: string
): Promise<SidewalkSegment | null> {
  return withDatabase(async (client) => {
    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    // Build SET clauses dynamically
    if (updates.coordinates !== undefined) {
      setClauses.push(`coordinates = $${paramIndex}`)
      values.push(JSON.stringify(updates.coordinates))
      paramIndex++
    }
    if (updates.contractor !== undefined) {
      setClauses.push(`contractor = $${paramIndex}`)
      values.push(updates.contractor)
      paramIndex++
    }
    if (updates.year !== undefined) {
      setClauses.push(`year = $${paramIndex}`)
      values.push(updates.year)
      paramIndex++
    }
    if (updates.street !== undefined) {
      setClauses.push(`street = $${paramIndex}`)
      values.push(updates.street)
      paramIndex++
    }
    if (updates.block !== undefined) {
      setClauses.push(`block = $${paramIndex}`)
      values.push(updates.block)
      paramIndex++
    }
    if (updates.notes !== undefined) {
      setClauses.push(`notes = $${paramIndex}`)
      values.push(updates.notes)
      paramIndex++
    }
    if (updates.specialMarks !== undefined) {
      setClauses.push(`special_marks = $${paramIndex}`)
      values.push(JSON.stringify(updates.specialMarks))
      paramIndex++
    }
    if (updates.status !== undefined) {
      setClauses.push(`status = $${paramIndex}`)
      values.push(updates.status)
      paramIndex++
    }

    if (setClauses.length === 0) return null

    // Add audit trail
    setClauses.push(`edited_by = $${paramIndex}`)
    values.push(editedBy)
    paramIndex++

    setClauses.push(`edited_at = CURRENT_TIMESTAMP`)

    values.push(id)

    const result = await client.query(
      `UPDATE sidewalk_segments
       SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (!result.rows[0]) return null

    const row = result.rows[0]
    return {
      ...row,
      coordinates: row.coordinates,
      special_marks: row.special_marks || [],
      specialMarks: row.special_marks || [],
    }
  })
}

// ============================================================================
// Approved Segment Snapping Functions
// ============================================================================

export async function getApprovedSegmentGeometries(bounds?: {
  north: number
  south: number
  east: number
  west: number
}): Promise<any[]> {
  return withDatabase(async (client) => {
    // Check if geometry column exists
    const colCheck = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'sidewalk_segments' AND column_name = 'geometry'`
    )

    if (colCheck.rows.length === 0) {
      // Geometry column doesn't exist, return empty array
      return []
    }

    let query = `
      SELECT
        id, street, block, contractor, year,
        ST_AsGeoJSON(geometry)::json as geometry
      FROM sidewalk_segments
      WHERE status = 'approved'
        AND geometry IS NOT NULL
    `
    const params: any[] = []

    if (bounds) {
      query += ` AND ST_Intersects(
        geometry,
        ST_MakeEnvelope($1, $2, $3, $4, 4326)
      )`
      params.push(bounds.west, bounds.south, bounds.east, bounds.north)
    }

    query += ' LIMIT 5000'

    const result = await client.query(query, params)
    return result.rows
  })
}

export async function snapToNearestApprovedSegment(
  point: [number, number],
  radiusMeters: number = 10
): Promise<{ snapped: [number, number]; segmentId: string; street: string; distance: number } | null> {
  return withDatabase(async (client) => {
    // Check if geometry column exists
    const colCheck = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'sidewalk_segments' AND column_name = 'geometry'`
    )

    if (colCheck.rows.length === 0) {
      // Geometry column doesn't exist, skip approved segment snapping
      return null
    }

    const result = await client.query(
      `SELECT
        id,
        street,
        ST_Y(ST_ClosestPoint(geometry, ST_SetSRID(ST_MakePoint($2, $1), 4326))) as lat,
        ST_X(ST_ClosestPoint(geometry, ST_SetSRID(ST_MakePoint($2, $1), 4326))) as lng,
        ST_Distance(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) as distance
      FROM sidewalk_segments
      WHERE status = 'approved'
        AND geometry IS NOT NULL
        AND ST_DWithin(
          geometry::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
          $3
        )
      ORDER BY distance
      LIMIT 1`,
      [point[0], point[1], radiusMeters]
    )

    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      snapped: [row.lat, row.lng],
      segmentId: row.id,
      street: row.street,
      distance: row.distance
    }
  })
}

// ============================================================================
// Overlap Detection and Resolution Functions
// ============================================================================

export async function detectSegmentOverlaps(minOverlapMeters: number = 1): Promise<any[]> {
  return withDatabase(async (client) => {
    // First check if geometry column exists
    const colCheck = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'sidewalk_segments' AND column_name = 'geometry'`
    )

    if (colCheck.rows.length === 0) {
      console.warn('detectSegmentOverlaps: geometry column does not exist. Run database migration.')
      return []
    }

    const result = await client.query(
      `SELECT
        a.id as segment1_id,
        a.street as segment1_street,
        a.block as segment1_block,
        b.id as segment2_id,
        b.street as segment2_street,
        b.block as segment2_block,
        ST_AsGeoJSON(ST_Intersection(a.geometry, b.geometry))::json as overlap_geometry,
        ST_Length(ST_Intersection(a.geometry, b.geometry)::geography) as overlap_meters
      FROM sidewalk_segments a
      JOIN sidewalk_segments b ON ST_Intersects(a.geometry, b.geometry)
      WHERE a.id < b.id
        AND a.status = 'approved'
        AND b.status = 'approved'
        AND a.geometry IS NOT NULL
        AND b.geometry IS NOT NULL
        AND ST_Length(ST_Intersection(a.geometry, b.geometry)::geography) > $1
      ORDER BY overlap_meters DESC`,
      [minOverlapMeters]
    )
    return result.rows
  })
}

export async function getSegmentConflicts(status?: string): Promise<any[]> {
  return withDatabase(async (client) => {
    // Check if segment_conflicts table exists
    const tableCheck = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'segment_conflicts'
      )`
    )

    if (!tableCheck.rows[0].exists) {
      console.warn('getSegmentConflicts: segment_conflicts table does not exist. Run database migration.')
      return []
    }

    let query = `
      SELECT
        c.*,
        s1.street as segment1_street,
        s1.block as segment1_block,
        s1.contractor as segment1_contractor,
        s2.street as segment2_street,
        s2.block as segment2_block,
        s2.contractor as segment2_contractor,
        u.username as resolved_by_username
      FROM segment_conflicts c
      JOIN sidewalk_segments s1 ON c.segment1_id = s1.id
      JOIN sidewalk_segments s2 ON c.segment2_id = s2.id
      LEFT JOIN users u ON c.resolved_by = u.id
    `
    const params: any[] = []

    if (status) {
      query += ' WHERE c.status = $1'
      params.push(status)
    }

    query += ' ORDER BY c.created_at DESC'

    const result = await client.query(query, params)
    return result.rows
  })
}

export async function createSegmentConflict(data: {
  segment1Id: string
  segment2Id: string
  overlapLengthMeters: number
}): Promise<any> {
  return withDatabase(async (client) => {
    // Check if segment_conflicts table exists
    const tableCheck = await client.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'segment_conflicts'
      )`
    )

    if (!tableCheck.rows[0].exists) {
      console.warn('createSegmentConflict: segment_conflicts table does not exist. Run database migration.')
      throw new Error('Database migration required: segment_conflicts table does not exist')
    }

    const result = await client.query(
      `INSERT INTO segment_conflicts (segment1_id, segment2_id, overlap_length_meters)
       VALUES ($1, $2, $3)
       ON CONFLICT (segment1_id, segment2_id) DO UPDATE SET
         overlap_length_meters = EXCLUDED.overlap_length_meters,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [data.segment1Id, data.segment2Id, data.overlapLengthMeters]
    )
    return result.rows[0]
  })
}

export async function resolveSegmentConflict(
  conflictId: string,
  action: string,
  resolvedBy: string
): Promise<any> {
  return withDatabase(async (client) => {
    const result = await client.query(
      `UPDATE segment_conflicts
       SET status = 'resolved', resolution_action = $1, resolved_by = $2, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [action, resolvedBy, conflictId]
    )
    return result.rows[0]
  })
}

export async function acceptSegmentConflict(
  conflictId: string,
  resolvedBy: string
): Promise<any> {
  return withDatabase(async (client) => {
    const result = await client.query(
      `UPDATE segment_conflicts
       SET status = 'accepted', resolution_action = 'accept_overlap', resolved_by = $1, resolved_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [resolvedBy, conflictId]
    )
    return result.rows[0]
  })
}

// ============================================================================
// Batch Correction Functions
// ============================================================================

export async function getSegmentsForCorrection(filters?: {
  street?: string
  yearMin?: number
  yearMax?: number
}): Promise<SidewalkSegment[]> {
  return withDatabase(async (client) => {
    let query = `
      SELECT s.*, u.username as created_by_username
      FROM sidewalk_segments s
      LEFT JOIN users u ON s.created_by = u.id
      WHERE s.status = 'approved' AND s.geometry IS NOT NULL
    `
    const params: any[] = []
    let paramIndex = 1

    if (filters?.street) {
      query += ` AND s.street ILIKE $${paramIndex}`
      params.push(`%${filters.street}%`)
      paramIndex++
    }
    if (filters?.yearMin) {
      query += ` AND s.year >= $${paramIndex}`
      params.push(filters.yearMin)
      paramIndex++
    }
    if (filters?.yearMax) {
      query += ` AND s.year <= $${paramIndex}`
      params.push(filters.yearMax)
      paramIndex++
    }

    query += ' ORDER BY s.street, s.block'

    const result = await client.query(query, params)
    return result.rows.map(row => ({
      ...row,
      coordinates: row.coordinates,
      special_marks: row.special_marks || [],
      specialMarks: row.special_marks || [],
    }))
  })
}

export async function createSegmentCorrection(data: {
  segmentId: string
  originalCoordinates: [number, number][]
  correctedCoordinates: [number, number][]
  maxDistanceMeters: number
  correctedBy: string
  correctionType?: 'batch' | 'manual'
}): Promise<any> {
  return withDatabase(async (client) => {
    const result = await client.query(
      `INSERT INTO segment_corrections
       (segment_id, original_coordinates, corrected_coordinates, max_distance_meters, corrected_by, correction_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.segmentId,
        JSON.stringify(data.originalCoordinates),
        JSON.stringify(data.correctedCoordinates),
        data.maxDistanceMeters,
        data.correctedBy,
        data.correctionType || 'batch'
      ]
    )
    return result.rows[0]
  })
}

export async function getSegmentCorrections(segmentId?: string): Promise<any[]> {
  return withDatabase(async (client) => {
    let query = `
      SELECT c.*, s.street, s.block, u.username as corrected_by_username
      FROM segment_corrections c
      JOIN sidewalk_segments s ON c.segment_id = s.id
      LEFT JOIN users u ON c.corrected_by = u.id
    `
    const params: any[] = []

    if (segmentId) {
      query += ' WHERE c.segment_id = $1'
      params.push(segmentId)
    }

    query += ' ORDER BY c.corrected_at DESC'

    const result = await client.query(query, params)
    return result.rows
  })
}

// ============================================================================
// Segment Edit History Functions
// ============================================================================

export async function createSegmentEditHistory(data: {
  segmentId: string
  editedBy?: string
  editedByUsername?: string
  editType: 'create' | 'update' | 'approve' | 'reject'
  fieldChanges: string[]
  previousValues?: Record<string, any>
  newValues?: Record<string, any>
  notes?: string
}): Promise<any> {
  return withDatabase(async (client) => {
    const result = await client.query(`
      INSERT INTO segment_edit_history (
        segment_id, edited_by, edited_by_username, edit_type,
        field_changes, previous_values, new_values, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      data.segmentId,
      data.editedBy,
      data.editedByUsername,
      data.editType,
      JSON.stringify(data.fieldChanges),
      JSON.stringify(data.previousValues || {}),
      JSON.stringify(data.newValues || {}),
      data.notes
    ])
    return result.rows[0]
  })
}

export async function getSegmentEditHistory(segmentId: string): Promise<any[]> {
  return withDatabase(async (client) => {
    const result = await client.query(`
      SELECT h.*, s.street, s.block
      FROM segment_edit_history h
      JOIN sidewalk_segments s ON h.segment_id = s.id
      WHERE h.segment_id = $1
      ORDER BY h.created_at DESC
    `, [segmentId])
    return result.rows
  })
}

export async function getRecentEditHistory(limit: number = 50): Promise<any[]> {
  return withDatabase(async (client) => {
    const result = await client.query(`
      SELECT h.*, s.street, s.block, s.contractor
      FROM segment_edit_history h
      JOIN sidewalk_segments s ON h.segment_id = s.id
      ORDER BY h.created_at DESC
      LIMIT $1
    `, [limit])
    return result.rows
  })
}

// ============================================================================
// Segment Comments Functions
// ============================================================================

export async function createSegmentComment(data: {
  segmentId: string
  userId?: string
  username?: string
  content: string
  parentId?: string
}): Promise<any> {
  return withDatabase(async (client) => {
    const result = await client.query(`
      INSERT INTO segment_comments (
        segment_id, user_id, username, content, parent_id
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      data.segmentId,
      data.userId,
      data.username,
      data.content,
      data.parentId
    ])
    return result.rows[0]
  })
}

export async function getSegmentComments(segmentId: string): Promise<any[]> {
  return withDatabase(async (client) => {
    const result = await client.query(`
      SELECT c.*, u.username as user_username
      FROM segment_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.segment_id = $1
      ORDER BY c.created_at ASC
    `, [segmentId])
    return result.rows
  })
}

export async function updateSegmentComment(
  commentId: string,
  content: string
): Promise<any> {
  return withDatabase(async (client) => {
    const result = await client.query(`
      UPDATE segment_comments
      SET content = $1, is_edited = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [content, commentId])
    return result.rows[0]
  })
}

export async function deleteSegmentComment(commentId: string): Promise<boolean> {
  return withDatabase(async (client) => {
    const result = await client.query(
      'DELETE FROM segment_comments WHERE id = $1',
      [commentId]
    )
    return (result.rowCount ?? 0) > 0
  })
}

export async function getCommentById(commentId: string): Promise<any> {
  return withDatabase(async (client) => {
    const result = await client.query(
      'SELECT * FROM segment_comments WHERE id = $1',
      [commentId]
    )
    return result.rows[0]
  })
}

export default {
  initDatabase,
  getUserByEmail,
  getUserByUsername,
  createUser,
  getUserById,
  updateUserLastLogin,
  getAllSegments,
  getFilteredSegments,
  getSegmentById,
  createSegment,
  updateSegment,
  deleteSegment,
  getAdminSegments,
  updateSegmentStatus,
  getAllContractors,
  updateContractorStats,
  createPhoto,
  getPhotosBySegmentId,
  deletePhoto,
  createPasswordResetToken,
  getPasswordResetToken,
  markPasswordResetTokenAsUsed,
  updateUserPassword,
  healthCheck,
  closeDatabase,
  // PostGIS functions
  coordinatesToPostGIS,
  getNearbyReferenceSidewalks,
  snapToNearestSidewalk,
  createReferenceSidewalk,
  getAllReferenceSidewalks,
  updateReferenceSidewalk,
  deleteReferenceSidewalk,
  // Admin editing functions
  adminUpdateSegment,
  // Approved segment snapping
  getApprovedSegmentGeometries,
  snapToNearestApprovedSegment,
  // Overlap detection
  detectSegmentOverlaps,
  getSegmentConflicts,
  createSegmentConflict,
  resolveSegmentConflict,
  acceptSegmentConflict,
  // Batch correction
  getSegmentsForCorrection,
  createSegmentCorrection,
  getSegmentCorrections,
  // Edit history
  createSegmentEditHistory,
  getSegmentEditHistory,
  getRecentEditHistory,
  // Comments
  createSegmentComment,
  getSegmentComments,
  updateSegmentComment,
  deleteSegmentComment,
  getCommentById,
}