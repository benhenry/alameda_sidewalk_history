// PostgreSQL database configuration for Google Cloud deployment
// This replaces the SQLite database.ts for production use

import { Pool, PoolClient } from 'pg'
import { SidewalkSegment, Contractor } from '@/types/sidewalk'
import { User } from '@/types/auth'

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Connection wrapper for better error handling
async function withDatabase<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    return await callback(client)
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
  })
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

export default {
  initDatabase,
  getUserByEmail,
  getUserByUsername,
  createUser,
  getUserById,
  updateUserLastLogin,
  getAllSegments,
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
}