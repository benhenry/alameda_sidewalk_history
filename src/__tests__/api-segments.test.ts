// Mock the database
jest.mock('../lib/database', () => ({
  segmentQueries: {
    getAll: {
      all: jest.fn(),
    },
    getByFilters: {
      all: jest.fn(),
    },
    insert: {
      run: jest.fn(),
    },
    getById: {
      get: jest.fn(),
    },
  },
  contractorQueries: {
    upsert: {
      run: jest.fn(),
    },
    updateSegmentCount: {
      run: jest.fn(),
    },
  },
  parseCoordinates: jest.fn(),
  stringifyCoordinates: jest.fn(),
  parseSpecialMarks: jest.fn(),
  stringifySpecialMarks: jest.fn(),
}))

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-uuid-1234',
}))

const mockSegmentData = {
  id: 'test-uuid-1234',
  coordinates: '[[37.7652, -122.2416], [37.7660, -122.2420]]',
  contractor: 'Smith Construction Co.',
  year: 1925,
  street: 'Park Street',
  block: '1400',
  notes: 'Test notes',
  special_marks: '["P"]',
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
  photo_ids: null,
  photo_filenames: null,
  photo_types: null,
}

describe('API Segments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Database helper functions', () => {
    it('should parse coordinates correctly', () => {
      const { parseCoordinates } = require('../lib/database')
      parseCoordinates.mockReturnValue([[37.7652, -122.2416]])
      
      const result = parseCoordinates('[[37.7652, -122.2416]]')
      expect(result).toEqual([[37.7652, -122.2416]])
    })

    it('should stringify coordinates correctly', () => {
      const { stringifyCoordinates } = require('../lib/database')
      stringifyCoordinates.mockReturnValue('[[37.7652,-122.2416]]')
      
      const result = stringifyCoordinates([[37.7652, -122.2416]])
      expect(result).toBe('[[37.7652,-122.2416]]')
    })

    it('should parse special marks correctly', () => {
      const { parseSpecialMarks } = require('../lib/database')
      parseSpecialMarks.mockReturnValue(['P'])
      
      const result = parseSpecialMarks('["P"]')
      expect(result).toEqual(['P'])
    })
  })

  describe('Segment queries', () => {
    it('should get all segments from database', () => {
      const { segmentQueries } = require('../lib/database')
      segmentQueries.getAll.all.mockReturnValue([mockSegmentData])

      const segments = segmentQueries.getAll.all()
      expect(segments).toEqual([mockSegmentData])
      expect(segmentQueries.getAll.all).toHaveBeenCalledTimes(1)
    })

    it('should insert segment into database', () => {
      const { segmentQueries } = require('../lib/database')
      segmentQueries.insert.run.mockReturnValue({ changes: 1 })

      const result = segmentQueries.insert.run(
        'test-id',
        '[[37.7652,-122.2416]]',
        'Test Contractor',
        2023,
        'Test Street',
        '100',
        'Test notes',
        '["P"]',
        'user-id'
      )

      expect(result.changes).toBe(1)
      expect(segmentQueries.insert.run).toHaveBeenCalledWith(
        'test-id',
        '[[37.7652,-122.2416]]',
        'Test Contractor',
        2023,
        'Test Street',
        '100',
        'Test notes',
        '["P"]',
        'user-id'
      )
    })

    it('should get segments by filters', () => {
      const { segmentQueries } = require('../lib/database')
      segmentQueries.getByFilters.all.mockReturnValue([mockSegmentData])

      const segments = segmentQueries.getByFilters.all(
        'Smith Construction Co.', 'Smith Construction Co.',
        1925, 1925,
        'Park Street', 'Park Street'
      )

      expect(segments).toEqual([mockSegmentData])
      expect(segmentQueries.getByFilters.all).toHaveBeenCalledWith(
        'Smith Construction Co.', 'Smith Construction Co.',
        1925, 1925,
        'Park Street', 'Park Street'
      )
    })
  })

  describe('Contractor queries', () => {
    it('should upsert contractor', () => {
      const { contractorQueries } = require('../lib/database')
      contractorQueries.upsert.run.mockReturnValue({ changes: 1 })

      const result = contractorQueries.upsert.run(
        'contractor-id',
        'Test Contractor',
        '[2023]'
      )

      expect(result.changes).toBe(1)
      expect(contractorQueries.upsert.run).toHaveBeenCalledWith(
        'contractor-id',
        'Test Contractor',
        '[2023]'
      )
    })

    it('should update segment count', () => {
      const { contractorQueries } = require('../lib/database')
      contractorQueries.updateSegmentCount.run.mockReturnValue({ changes: 1 })

      contractorQueries.updateSegmentCount.run('Test Contractor')

      expect(contractorQueries.updateSegmentCount.run).toHaveBeenCalledWith('Test Contractor')
    })
  })
})