import { analyzeSegmentForCorrection, batchAnalyzeSegments } from '../batch-correction'
import { SidewalkSegment } from '@/types/sidewalk'

jest.mock('../database', () => ({
  snapToNearestSidewalk: jest.fn(),
}))

import { snapToNearestSidewalk } from '../database'

const mockSnap = snapToNearestSidewalk as jest.Mock

function makeSegment(overrides: Partial<SidewalkSegment> = {}): SidewalkSegment {
  return {
    id: 'seg-1',
    coordinates: [[37.765, -122.241], [37.766, -122.242]] as [number, number][],
    contractor: 'Test Co',
    year: 1925,
    street: 'Park Street',
    block: '1400',
    specialMarks: [],
    notes: '',
    status: 'approved',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('batch-correction', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('analyzeSegmentForCorrection', () => {
    it('should return no corrections when all points are within threshold', async () => {
      mockSnap
        .mockResolvedValueOnce({ snapped: [37.765, -122.241] as [number, number], distance: 2, street: 'Park Street' })
        .mockResolvedValueOnce({ snapped: [37.766, -122.242] as [number, number], distance: 3, street: 'Park Street' })

      const result = await analyzeSegmentForCorrection(makeSegment(), 5)

      expect(result.needsCorrection).toBe(false)
      expect(result.corrections).toHaveLength(0)
      expect(result.maxDistance).toBe(0)
      expect(result.segmentId).toBe('seg-1')
    })

    it('should flag corrections when points exceed threshold', async () => {
      mockSnap
        .mockResolvedValueOnce({ snapped: [37.7651, -122.2411] as [number, number], distance: 10, street: 'Park Street' })
        .mockResolvedValueOnce({ snapped: [37.766, -122.242] as [number, number], distance: 2, street: 'Park Street' })

      const result = await analyzeSegmentForCorrection(makeSegment(), 5)

      expect(result.needsCorrection).toBe(true)
      expect(result.corrections).toHaveLength(1)
      expect(result.corrections[0].pointIndex).toBe(0)
      expect(result.corrections[0].distance).toBe(10)
      expect(result.maxDistance).toBe(10)
    })

    it('should keep original coordinates when no nearby sidewalk found', async () => {
      mockSnap
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)

      const segment = makeSegment()
      const result = await analyzeSegmentForCorrection(segment, 5)

      expect(result.needsCorrection).toBe(false)
      expect(result.correctedCoordinates).toEqual(segment.coordinates)
    })

    it('should use snapped coordinates for points within threshold', async () => {
      const snapped: [number, number] = [37.7651, -122.2411]
      mockSnap
        .mockResolvedValueOnce({ snapped, distance: 3, street: 'Park Street' })
        .mockResolvedValueOnce(null)

      const segment = makeSegment()
      const result = await analyzeSegmentForCorrection(segment, 5)

      expect(result.correctedCoordinates[0]).toEqual(snapped)
      expect(result.correctedCoordinates[1]).toEqual(segment.coordinates[1])
    })

    it('should use default threshold of 5', async () => {
      mockSnap
        .mockResolvedValueOnce({ snapped: [37.765, -122.241] as [number, number], distance: 6, street: 'Park Street' })

      const segment = makeSegment({ coordinates: [[37.765, -122.241]] as [number, number][] })
      const result = await analyzeSegmentForCorrection(segment)

      expect(result.needsCorrection).toBe(true)
    })

    it('should track max distance across all corrections', async () => {
      mockSnap
        .mockResolvedValueOnce({ snapped: [37.765, -122.241] as [number, number], distance: 15, street: 'Park Street' })
        .mockResolvedValueOnce({ snapped: [37.766, -122.242] as [number, number], distance: 20, street: 'Park Street' })

      const result = await analyzeSegmentForCorrection(makeSegment(), 5)

      expect(result.maxDistance).toBe(20)
    })

    it('should include street and block from segment', async () => {
      mockSnap.mockResolvedValue(null)

      const result = await analyzeSegmentForCorrection(makeSegment({ street: 'Oak Street', block: '200' }), 5)

      expect(result.street).toBe('Oak Street')
      expect(result.block).toBe('200')
    })
  })

  describe('batchAnalyzeSegments', () => {
    it('should return only segments that need correction', async () => {
      // First segment: needs correction
      mockSnap
        .mockResolvedValueOnce({ snapped: [37.765, -122.241] as [number, number], distance: 10, street: 'Park Street' })
        .mockResolvedValueOnce({ snapped: [37.766, -122.242] as [number, number], distance: 2, street: 'Park Street' })
      // Second segment: within threshold
        .mockResolvedValueOnce({ snapped: [37.767, -122.243] as [number, number], distance: 1, street: 'Oak Street' })
        .mockResolvedValueOnce({ snapped: [37.768, -122.244] as [number, number], distance: 2, street: 'Oak Street' })

      const segments = [
        makeSegment({ id: 'seg-1' }),
        makeSegment({ id: 'seg-2' }),
      ]
      const results = await batchAnalyzeSegments(segments, 5)

      expect(results).toHaveLength(1)
      expect(results[0].segmentId).toBe('seg-1')
    })

    it('should handle errors gracefully and continue processing', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // First segment errors
      mockSnap.mockRejectedValueOnce(new Error('DB error'))
      // Second segment succeeds with correction needed
      mockSnap
        .mockResolvedValueOnce({ snapped: [37.767, -122.243] as [number, number], distance: 10, street: 'Oak Street' })
        .mockResolvedValueOnce({ snapped: [37.768, -122.244] as [number, number], distance: 2, street: 'Oak Street' })

      const segments = [
        makeSegment({ id: 'seg-1', coordinates: [[37.765, -122.241]] as [number, number][] }),
        makeSegment({ id: 'seg-2' }),
      ]
      const results = await batchAnalyzeSegments(segments, 5)

      expect(results).toHaveLength(1)
      expect(results[0].segmentId).toBe('seg-2')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('seg-1'), expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should return empty array when no segments need correction', async () => {
      mockSnap.mockResolvedValue({ snapped: [37.765, -122.241] as [number, number], distance: 1, street: 'Park Street' })

      const results = await batchAnalyzeSegments([makeSegment()], 5)
      expect(results).toHaveLength(0)
    })

    it('should return empty array for empty input', async () => {
      const results = await batchAnalyzeSegments([], 5)
      expect(results).toHaveLength(0)
    })
  })
})
