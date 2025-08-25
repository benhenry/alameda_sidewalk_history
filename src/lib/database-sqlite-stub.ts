// Stub file for SQLite functions when not available in production
import { SidewalkSegment, Contractor } from '@/types/sidewalk'
import { User } from '@/types/auth'

// This file should never be called in production, but provides
// type-safe fallbacks to prevent build errors

export async function initDatabase(): Promise<void> {
  throw new Error('SQLite not available in production')
}

export async function getUserByEmail(email: string): Promise<User | null> {
  throw new Error('SQLite not available in production')
}

export async function getUserByUsername(username: string): Promise<User | null> {
  throw new Error('SQLite not available in production')
}

export async function createUser(userData: {
  email: string
  username: string
  passwordHash: string
  role?: string
}): Promise<User> {
  throw new Error('SQLite not available in production')
}

export async function getUserById(id: string): Promise<User | null> {
  throw new Error('SQLite not available in production')
}

export async function updateUserLastLogin(userId: string): Promise<void> {
  throw new Error('SQLite not available in production')
}

export async function getAllSegments(): Promise<SidewalkSegment[]> {
  throw new Error('SQLite not available in production')
}

export async function getSegmentById(id: string): Promise<SidewalkSegment | null> {
  throw new Error('SQLite not available in production')
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
  throw new Error('SQLite not available in production')
}

export async function updateSegment(id: string, updates: Partial<SidewalkSegment>): Promise<SidewalkSegment | null> {
  throw new Error('SQLite not available in production')
}

export async function deleteSegment(id: string): Promise<boolean> {
  throw new Error('SQLite not available in production')
}

export async function getAdminSegments(status?: string): Promise<SidewalkSegment[]> {
  throw new Error('SQLite not available in production')
}

export async function updateSegmentStatus(
  segmentId: string,
  status: 'approved' | 'rejected',
  approvedBy: string
): Promise<SidewalkSegment | null> {
  throw new Error('SQLite not available in production')
}

export async function getAllContractors(): Promise<Contractor[]> {
  throw new Error('SQLite not available in production')
}

export async function updateContractorStats(): Promise<void> {
  throw new Error('SQLite not available in production')
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
  throw new Error('SQLite not available in production')
}

export async function getPhotosBySegmentId(segmentId: string): Promise<any[]> {
  throw new Error('SQLite not available in production')
}

export async function deletePhoto(id: string): Promise<boolean> {
  throw new Error('SQLite not available in production')
}

export async function createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
  throw new Error('SQLite not available in production')
}

export async function getPasswordResetToken(token: string): Promise<any> {
  throw new Error('SQLite not available in production')
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  throw new Error('SQLite not available in production')
}

export async function updateUserPassword(userId: string, passwordHash: string): Promise<void> {
  throw new Error('SQLite not available in production')
}

export async function healthCheck(): Promise<boolean> {
  throw new Error('SQLite not available in production')
}

export async function closeDatabase(): Promise<void> {
  throw new Error('SQLite not available in production')
}

// Utility functions
export const parseCoordinates = (str: string): [number, number][] => JSON.parse(str)
export const stringifyCoordinates = (coords: [number, number][]): string => JSON.stringify(coords)
export const parseSpecialMarks = (str: string | null): string[] => str ? JSON.parse(str) : []
export const stringifySpecialMarks = (marks: string[]): string => JSON.stringify(marks)

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