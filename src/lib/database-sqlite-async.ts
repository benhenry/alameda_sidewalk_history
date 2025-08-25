// SQLite database wrapper with async interface to match PostgreSQL
import { SidewalkSegment, Contractor } from '@/types/sidewalk'
import { User } from '@/types/auth'
import { v4 as uuidv4 } from 'uuid'

// Import all the SQLite functions and queries
import * as sqliteDb from './database-sqlite'

// Async wrapper functions to match PostgreSQL interface
export async function initDatabase(): Promise<void> {
  return sqliteDb.initDatabase()
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const user = sqliteDb.userQueries.getByEmail.get(email) as User | undefined
  return user || null
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const user = sqliteDb.userQueries.getByUsername.get(username) as User | undefined
  return user || null
}

export async function createUser(userData: {
  email: string
  username: string
  passwordHash: string
  role?: string
}): Promise<User> {
  const id = uuidv4()
  const role = userData.role || 'user'
  
  sqliteDb.userQueries.create.run(id, userData.email, userData.username, userData.passwordHash, role)
  
  const user = sqliteDb.userQueries.getById.get(id)
  return user as User
}

export async function getUserById(id: string): Promise<User | null> {
  const user = sqliteDb.userQueries.getById.get(id) as User | undefined
  return user || null
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  sqliteDb.userQueries.updateLastLogin.run(userId)
}

export async function getAllSegments(): Promise<SidewalkSegment[]> {
  const segments = sqliteDb.segmentQueries.getAll.all()
  return segments.map(formatSegmentRow)
}

export async function getSegmentById(id: string): Promise<SidewalkSegment | null> {
  const segment = sqliteDb.segmentQueries.getById.get(id)
  return segment ? formatSegmentRow(segment) : null
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
  const id = uuidv4()
  const coordinates = sqliteDb.stringifyCoordinates(segmentData.coordinates)
  const specialMarks = sqliteDb.stringifySpecialMarks(segmentData.specialMarks || [])
  const status = segmentData.status || 'approved'
  
  sqliteDb.segmentQueries.insert.run(
    id,
    coordinates,
    segmentData.contractor,
    segmentData.year,
    segmentData.street,
    segmentData.block,
    segmentData.notes,
    specialMarks,
    segmentData.createdBy,
    status
  )
  
  const segment = await getSegmentById(id)
  return segment!
}

export async function updateSegment(id: string, updates: Partial<SidewalkSegment>): Promise<SidewalkSegment | null> {
  const existing = await getSegmentById(id)
  if (!existing) return null
  
  const coordinates = updates.coordinates ? sqliteDb.stringifyCoordinates(updates.coordinates) : existing.coordinates
  const specialMarks = updates.specialMarks ? sqliteDb.stringifySpecialMarks(updates.specialMarks) : existing.specialMarks
  
  sqliteDb.segmentQueries.update.run(
    coordinates,
    updates.contractor || existing.contractor,
    updates.year || existing.year,
    updates.street || existing.street,
    updates.block || existing.block,
    updates.notes !== undefined ? updates.notes : existing.notes,
    specialMarks,
    id
  )
  
  return await getSegmentById(id)
}

export async function deleteSegment(id: string): Promise<boolean> {
  const result = sqliteDb.segmentQueries.delete.run(id)
  return result.changes > 0
}

export async function getAdminSegments(status?: string): Promise<SidewalkSegment[]> {
  let segments
  if (status === 'pending') {
    segments = sqliteDb.segmentQueries.getPending.all()
  } else {
    segments = sqliteDb.segmentQueries.getAllWithStatus.all()
  }
  return segments.map(formatSegmentRow)
}

export async function updateSegmentStatus(
  segmentId: string,
  status: 'approved' | 'rejected',
  approvedBy: string
): Promise<SidewalkSegment | null> {
  if (status === 'approved') {
    sqliteDb.segmentQueries.approve.run(approvedBy, segmentId)
  } else {
    sqliteDb.segmentQueries.reject.run(approvedBy, segmentId)
  }
  
  return await getSegmentById(segmentId)
}

export async function getAllContractors(): Promise<Contractor[]> {
  const contractors = sqliteDb.contractorQueries.getAll.all()
  return contractors as Contractor[]
}

export async function updateContractorStats(): Promise<void> {
  // SQLite version doesn't need this - stats are calculated on-the-fly
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
  const id = uuidv4()
  
  sqliteDb.photoQueries.insert.run(
    id,
    photoData.sidewalkSegmentId,
    photoData.filename,
    null, // caption
    'general', // type
    null // coordinates
  )
  
  return { id, ...photoData }
}

export async function getPhotosBySegmentId(segmentId: string): Promise<any[]> {
  const photos = sqliteDb.photoQueries.getBySegmentId.all(segmentId)
  return photos
}

export async function deletePhoto(id: string): Promise<boolean> {
  const result = sqliteDb.photoQueries.delete.run(id)
  return result.changes > 0
}

export async function createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  const id = uuidv4()
  sqliteDb.passwordResetQueries.create.run(id, userId, token, expiresAt.toISOString())
}

export async function getPasswordResetToken(token: string): Promise<any> {
  const result = sqliteDb.passwordResetQueries.getByToken.get(token)
  return result || null
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  sqliteDb.passwordResetQueries.markAsUsed.run(token)
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  sqliteDb.userQueries.updatePassword.run(passwordHash, userId)
}

export async function healthCheck(): Promise<boolean> {
  try {
    sqliteDb.userQueries.getAll.all()
    return true
  } catch {
    return false
  }
}

export async function closeDatabase(): Promise<void> {
  // SQLite database will close automatically
}

// Helper function to format segment rows
function formatSegmentRow(row: any): SidewalkSegment {
  return {
    ...row,
    coordinates: sqliteDb.parseCoordinates(row.coordinates),
    specialMarks: sqliteDb.parseSpecialMarks(row.special_marks),
    special_marks: sqliteDb.parseSpecialMarks(row.special_marks), // For compatibility
  }
}

// Re-export utilities
export const parseCoordinates = sqliteDb.parseCoordinates
export const stringifyCoordinates = sqliteDb.stringifyCoordinates
export const parseSpecialMarks = sqliteDb.parseSpecialMarks
export const stringifySpecialMarks = sqliteDb.stringifySpecialMarks

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