import Database from 'better-sqlite3'
import { 
  parseCoordinates, 
  stringifyCoordinates, 
  parseSpecialMarks, 
  stringifySpecialMarks 
} from '../database'

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  const mockDb = {
    exec: jest.fn(),
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
    })),
  }
  return jest.fn(() => mockDb)
})

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
})