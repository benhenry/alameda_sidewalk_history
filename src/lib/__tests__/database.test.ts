import {
  parseCoordinates,
  stringifyCoordinates,
  parseSpecialMarks,
  stringifySpecialMarks,
  getNearbyReferenceSidewalks,
  snapToNearestSidewalk,
  createReferenceSidewalk,
  getAllReferenceSidewalks,
  updateReferenceSidewalk,
  deleteReferenceSidewalk,
  adminUpdateSegment,
  getApprovedSegmentGeometries,
  snapToNearestApprovedSegment,
  detectSegmentOverlaps,
  getSegmentConflicts,
  createSegmentConflict,
  resolveSegmentConflict,
  acceptSegmentConflict,
  getSegmentsForCorrection,
  createSegmentCorrection,
  getSegmentCorrections,
  getFilteredSegments,
} from '../database'

// Mock the database modules
jest.mock('../database-postgres', () => ({}), { virtual: true })
jest.mock('../database-sqlite-async', () => ({
  getAllSegments: jest.fn().mockResolvedValue([]),
  getFilteredSegments: jest.fn().mockResolvedValue([]),
  updateSegment: jest.fn().mockResolvedValue({ id: 'test' }),
}), { virtual: true })

describe('Database utility functions', () => {
  describe('parseCoordinates', () => {
    it('should parse valid coordinate string', () => {
      const coordStr = '[[37.7652, -122.2416], [37.7660, -122.2420]]'
      const result = parseCoordinates(coordStr)
      expect(result).toEqual([[37.7652, -122.2416], [37.7660, -122.2420]])
    })

    it('should return empty array for invalid JSON', () => {
      const result = parseCoordinates('invalid json')
      expect(result).toEqual([])
    })

    it('should return empty array for empty string', () => {
      const result = parseCoordinates('')
      expect(result).toEqual([])
    })
  })

  describe('stringifyCoordinates', () => {
    it('should stringify coordinates array', () => {
      const coords: [number, number][] = [[37.7652, -122.2416], [37.7660, -122.2420]]
      const result = stringifyCoordinates(coords)
      expect(result).toBe('[[37.7652,-122.2416],[37.766,-122.242]]')
    })

    it('should handle empty array', () => {
      const result = stringifyCoordinates([])
      expect(result).toBe('[]')
    })
  })

  describe('parseSpecialMarks', () => {
    it('should parse valid JSON array', () => {
      const marksStr = '["P", "Custom design"]'
      const result = parseSpecialMarks(marksStr)
      expect(result).toEqual(['P', 'Custom design'])
    })

    it('should parse comma-separated string', () => {
      const marksStr = 'P, Custom design, Another mark'
      const result = parseSpecialMarks(marksStr)
      expect(result).toEqual(['P', 'Custom design', 'Another mark'])
    })

    it('should return empty array for null input', () => {
      const result = parseSpecialMarks(null)
      expect(result).toEqual([])
    })

    it('should filter out empty strings', () => {
      const marksStr = 'P, , Custom design, '
      const result = parseSpecialMarks(marksStr)
      expect(result).toEqual(['P', 'Custom design'])
    })
  })

  describe('stringifySpecialMarks', () => {
    it('should stringify marks array', () => {
      const marks = ['P', 'Custom design']
      const result = stringifySpecialMarks(marks)
      expect(result).toBe('["P","Custom design"]')
    })

    it('should handle empty array', () => {
      const result = stringifySpecialMarks([])
      expect(result).toBe('[]')
    })
  })

  // PostGIS fallback tests - when functions aren't available in the db module
  describe('PostGIS fallback paths', () => {
    it('getNearbyReferenceSidewalks should return empty array when not in db module', async () => {
      const result = await getNearbyReferenceSidewalks([37.76, -122.24])
      expect(result).toEqual([])
    })

    it('snapToNearestSidewalk should return null when not in db module', async () => {
      const result = await snapToNearestSidewalk([37.76, -122.24])
      expect(result).toBeNull()
    })

    it('createReferenceSidewalk should throw when not in db module', async () => {
      await expect(createReferenceSidewalk({ data: 'test' }))
        .rejects.toThrow('PostGIS not available')
    })

    it('getAllReferenceSidewalks should return empty array when not in db module', async () => {
      const result = await getAllReferenceSidewalks()
      expect(result).toEqual([])
    })

    it('updateReferenceSidewalk should return null when not in db module', async () => {
      const result = await updateReferenceSidewalk('1', {})
      expect(result).toBeNull()
    })

    it('deleteReferenceSidewalk should return false when not in db module', async () => {
      const result = await deleteReferenceSidewalk('1')
      expect(result).toBe(false)
    })

    it('getApprovedSegmentGeometries should return empty array when not in db module', async () => {
      const result = await getApprovedSegmentGeometries()
      expect(result).toEqual([])
    })

    it('snapToNearestApprovedSegment should return null when not in db module', async () => {
      const result = await snapToNearestApprovedSegment([37.76, -122.24])
      expect(result).toBeNull()
    })

    it('detectSegmentOverlaps should return empty array when not in db module', async () => {
      const result = await detectSegmentOverlaps()
      expect(result).toEqual([])
    })

    it('getSegmentConflicts should return empty array when not in db module', async () => {
      const result = await getSegmentConflicts()
      expect(result).toEqual([])
    })

    it('createSegmentConflict should return null when not in db module', async () => {
      const result = await createSegmentConflict({ segment1Id: 's1', segment2Id: 's2', overlapLengthMeters: 5 })
      expect(result).toBeNull()
    })

    it('resolveSegmentConflict should return null when not in db module', async () => {
      const result = await resolveSegmentConflict('c1', 'accept', 'admin')
      expect(result).toBeNull()
    })

    it('acceptSegmentConflict should return null when not in db module', async () => {
      const result = await acceptSegmentConflict('c1', 'admin')
      expect(result).toBeNull()
    })

    it('createSegmentCorrection should return null when not in db module', async () => {
      const result = await createSegmentCorrection({
        segmentId: 's1',
        originalCoordinates: [[37.76, -122.24]],
        correctedCoordinates: [[37.761, -122.241]],
        maxDistanceMeters: 10,
        correctedBy: 'admin'
      })
      expect(result).toBeNull()
    })

    it('getSegmentCorrections should return empty array when not in db module', async () => {
      const result = await getSegmentCorrections()
      expect(result).toEqual([])
    })
  })

  describe('delegation functions', () => {
    it('adminUpdateSegment should fallback to updateSegment when adminUpdateSegment not in db', async () => {
      const result = await adminUpdateSegment('test-id', { contractor: 'Test' }, 'admin')
      // Should fallback to regular updateSegment which we mocked
      expect(result).toBeDefined()
    })

    it('getSegmentsForCorrection should fallback to getAllSegments', async () => {
      const result = await getSegmentsForCorrection()
      expect(result).toEqual([])
    })

    it('getFilteredSegments should delegate to db module', async () => {
      const result = await getFilteredSegments({ contractor: 'Smith' })
      expect(result).toEqual([])
    })
  })
})