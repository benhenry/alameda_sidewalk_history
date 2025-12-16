// Database configuration switcher
// Uses SQLite for development, PostgreSQL for production
import { SidewalkSegment, Contractor } from '@/types/sidewalk'
import { User } from '@/types/auth'

const usePostgres = process.env.DATABASE_URL?.startsWith('postgresql') || process.env.PGHOST || process.env.NODE_ENV === 'production'

// Dynamic import helper
async function getDbModule() {
  if (usePostgres) {
    return await import('./database-postgres')
  } else {
    // Use SQLite for development only
    return await import('./database-sqlite-async')
  }
}

// Re-export all database functions with proper typing
export async function initDatabase(): Promise<void> {
  const dbModule = await getDbModule()
  return dbModule.initDatabase()
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const dbModule = await getDbModule()
  return dbModule.getUserByEmail(email)
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const dbModule = await getDbModule()
  return dbModule.getUserByUsername(username)
}

export async function createUser(userData: {
  email: string
  username: string
  passwordHash: string
  role?: string
}): Promise<User> {
  const dbModule = await getDbModule()
  return dbModule.createUser(userData)
}

export async function getUserById(id: string): Promise<User | null> {
  const dbModule = await getDbModule()
  return dbModule.getUserById(id)
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  const dbModule = await getDbModule()
  return dbModule.updateUserLastLogin(userId)
}

export async function getAllSegments(): Promise<SidewalkSegment[]> {
  const dbModule = await getDbModule()
  return dbModule.getAllSegments()
}

export async function getSegmentById(id: string): Promise<SidewalkSegment | null> {
  const dbModule = await getDbModule()
  return dbModule.getSegmentById(id)
}

export async function createSegment(segmentData: {
  street: string
  block: string
  contractor: string
  year: number
  coordinates: [number, number][]
  specialMarks?: string[]
  notes?: string
  createdBy?: string
  status?: 'pending' | 'approved'
}): Promise<SidewalkSegment> {
  const dbModule = await getDbModule()
  return dbModule.createSegment(segmentData)
}

export async function updateSegment(id: string, updates: Partial<SidewalkSegment>): Promise<SidewalkSegment | null> {
  const dbModule = await getDbModule()
  return dbModule.updateSegment(id, updates)
}

export async function deleteSegment(id: string): Promise<boolean> {
  const dbModule = await getDbModule()
  return dbModule.deleteSegment(id)
}

export async function getAdminSegments(status?: string): Promise<SidewalkSegment[]> {
  const dbModule = await getDbModule()
  return dbModule.getAdminSegments(status)
}

export async function updateSegmentStatus(
  segmentId: string,
  status: 'approved' | 'rejected',
  approvedBy: string
): Promise<SidewalkSegment | null> {
  const dbModule = await getDbModule()
  return dbModule.updateSegmentStatus(segmentId, status, approvedBy)
}

export async function getAllContractors(): Promise<Contractor[]> {
  const dbModule = await getDbModule()
  return dbModule.getAllContractors()
}

export async function updateContractorStats(): Promise<void> {
  const dbModule = await getDbModule()
  return dbModule.updateContractorStats()
}

export async function createPhoto(photoData: {
  sidewalkSegmentId: string
  filename: string
  originalName: string
  mimetype: string
  size: number
  storageUrl: string
  uploadedBy?: string
}): Promise<any> {
  const dbModule = await getDbModule()
  return dbModule.createPhoto(photoData)
}

export async function getPhotosBySegmentId(segmentId: string): Promise<any[]> {
  const dbModule = await getDbModule()
  return dbModule.getPhotosBySegmentId(segmentId)
}

export async function deletePhoto(id: string): Promise<boolean> {
  const dbModule = await getDbModule()
  return dbModule.deletePhoto(id)
}

export async function createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  const dbModule = await getDbModule()
  return dbModule.createPasswordResetToken(userId, token, expiresAt)
}

export async function getPasswordResetToken(token: string): Promise<any> {
  const dbModule = await getDbModule()
  return dbModule.getPasswordResetToken(token)
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  const dbModule = await getDbModule()
  return dbModule.markPasswordResetTokenAsUsed(token)
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  const dbModule = await getDbModule()
  return dbModule.updateUserPassword(userId, passwordHash)
}

export async function healthCheck(): Promise<boolean> {
  const dbModule = await getDbModule()
  return dbModule.healthCheck()
}

export async function closeDatabase(): Promise<void> {
  const dbModule = await getDbModule()
  return dbModule.closeDatabase()
}

// ============================================================================
// PostGIS Geospatial Functions
// ============================================================================

export async function getNearbyReferenceSidewalks(
  point: [number, number],
  radiusMeters?: number
): Promise<any[]> {
  const dbModule = await getDbModule()
  if ('getNearbyReferenceSidewalks' in dbModule) {
    return dbModule.getNearbyReferenceSidewalks(point, radiusMeters)
  }
  return []
}

export async function snapToNearestSidewalk(
  point: [number, number]
): Promise<{ snapped: [number, number]; referenceId: string; distance: number } | null> {
  const dbModule = await getDbModule()
  if ('snapToNearestSidewalk' in dbModule) {
    return dbModule.snapToNearestSidewalk(point)
  }
  return null
}

export async function createReferenceSidewalk(data: any): Promise<any> {
  const dbModule = await getDbModule()
  if ('createReferenceSidewalk' in dbModule) {
    return dbModule.createReferenceSidewalk(data)
  }
  throw new Error('PostGIS not available')
}

export async function getAllReferenceSidewalks(bounds?: any): Promise<any[]> {
  const dbModule = await getDbModule()
  if ('getAllReferenceSidewalks' in dbModule) {
    return dbModule.getAllReferenceSidewalks(bounds)
  }
  return []
}

export async function updateReferenceSidewalk(id: string, updates: any): Promise<any> {
  const dbModule = await getDbModule()
  if ('updateReferenceSidewalk' in dbModule) {
    return dbModule.updateReferenceSidewalk(id, updates)
  }
  return null
}

export async function deleteReferenceSidewalk(id: string): Promise<boolean> {
  const dbModule = await getDbModule()
  if ('deleteReferenceSidewalk' in dbModule) {
    return dbModule.deleteReferenceSidewalk(id)
  }
  return false
}

// Utility functions with fallbacks
export function parseCoordinates(str: string): [number, number][] {
  try {
    return JSON.parse(str)
  } catch {
    return []
  }
}

export function stringifyCoordinates(coords: [number, number][]): string {
  return JSON.stringify(coords)
}

export function parseSpecialMarks(str: string | null): string[] {
  if (!str) return []
  try {
    return JSON.parse(str)
  } catch {
    return str.split(',').map(mark => mark.trim()).filter(Boolean)
  }
}

export function stringifySpecialMarks(marks: string[]): string {
  return JSON.stringify(marks)
}

// For legacy compatibility
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