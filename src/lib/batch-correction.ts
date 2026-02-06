import { SidewalkSegment } from '@/types/sidewalk'
import { snapToNearestSidewalk } from './database'

interface CorrectionResult {
  segmentId: string
  street: string
  block: string
  originalCoordinates: [number, number][]
  correctedCoordinates: [number, number][]
  corrections: {
    pointIndex: number
    original: [number, number]
    corrected: [number, number]
    distance: number
    street: string | null
  }[]
  maxDistance: number
  needsCorrection: boolean
}

/**
 * Analyzes a segment and calculates potential corrections by snapping
 * each coordinate to the nearest reference sidewalk.
 *
 * @param segment The segment to analyze
 * @param threshold Distance threshold in meters (points farther than this will be corrected)
 * @returns Correction result with original and corrected coordinates
 */
export async function analyzeSegmentForCorrection(
  segment: SidewalkSegment,
  threshold: number = 5
): Promise<CorrectionResult> {
  const corrections: CorrectionResult['corrections'] = []
  const correctedCoordinates: [number, number][] = []
  let maxDistance = 0

  for (let i = 0; i < segment.coordinates.length; i++) {
    const coord = segment.coordinates[i]
    const result = await snapToNearestSidewalk(coord)

    if (result && result.distance > threshold) {
      // This point needs correction
      corrections.push({
        pointIndex: i,
        original: coord,
        corrected: result.snapped,
        distance: result.distance,
        street: result.street
      })
      correctedCoordinates.push(result.snapped)
      maxDistance = Math.max(maxDistance, result.distance)
    } else if (result) {
      // Point is within threshold but we'll use the snapped version
      correctedCoordinates.push(result.snapped)
    } else {
      // No nearby sidewalk, keep original
      correctedCoordinates.push(coord)
    }
  }

  return {
    segmentId: segment.id,
    street: segment.street,
    block: segment.block,
    originalCoordinates: segment.coordinates,
    correctedCoordinates,
    corrections,
    maxDistance,
    needsCorrection: corrections.length > 0
  }
}

/**
 * Batch analyze multiple segments for potential corrections.
 *
 * @param segments Segments to analyze
 * @param threshold Distance threshold in meters
 * @returns Array of correction results for segments that need correction
 */
export async function batchAnalyzeSegments(
  segments: SidewalkSegment[],
  threshold: number = 5
): Promise<CorrectionResult[]> {
  const results: CorrectionResult[] = []

  for (const segment of segments) {
    try {
      const result = await analyzeSegmentForCorrection(segment, threshold)
      if (result.needsCorrection) {
        results.push(result)
      }
    } catch (error) {
      console.error(`Error analyzing segment ${segment.id}:`, error)
    }
  }

  return results
}

export type { CorrectionResult }
