import { normalizeStreetName, normalizeBlockNumber, validateStreetName, validateBlockNumber } from '../street-validation'

describe('street-validation', () => {
  describe('normalizeStreetName', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeStreetName('')).toBe('')
    })

    it('should trim whitespace', () => {
      expect(normalizeStreetName('  Park Street  ')).toBe('Park Street')
    })

    it('should expand direction abbreviations', () => {
      expect(normalizeStreetName('N Park Street')).toBe('North Park Street')
      expect(normalizeStreetName('S Central Avenue')).toBe('South Central Avenue')
      expect(normalizeStreetName('E Grand Street')).toBe('East Grand Street')
      expect(normalizeStreetName('W Clement Avenue')).toBe('West Clement Avenue')
    })

    it('should expand compound direction abbreviations', () => {
      expect(normalizeStreetName('NE Shoreline Drive')).toBe('Northeast Shoreline Drive')
      expect(normalizeStreetName('NW Bay Street')).toBe('Northwest Bay Street')
      expect(normalizeStreetName('SE Oak Street')).toBe('Southeast Oak Street')
      expect(normalizeStreetName('SW Walnut Street')).toBe('Southwest Walnut Street')
    })

    it('should expand street type abbreviations', () => {
      expect(normalizeStreetName('Park St')).toBe('Park Street')
      expect(normalizeStreetName('Central Ave')).toBe('Central Avenue')
      expect(normalizeStreetName('Fernside Blvd')).toBe('Fernside Boulevard')
      expect(normalizeStreetName('Shoreline Dr')).toBe('Shoreline Drive')
      expect(normalizeStreetName('Kitty Hawk Rd')).toBe('Kitty Hawk Road')
      expect(normalizeStreetName('Maple Ln')).toBe('Maple Lane')
      expect(normalizeStreetName('Cedar Ct')).toBe('Cedar Court')
    })

    it('should expand more street type abbreviations', () => {
      expect(normalizeStreetName('Marshall Pl')).toBe('Marshall Place')
      expect(normalizeStreetName('Test Cir')).toBe('Test Circle')
      expect(normalizeStreetName('Marina Village Pkwy')).toBe('Marina Village Parkway')
      expect(normalizeStreetName('Test Ter')).toBe('Test Terrace')
      expect(normalizeStreetName('Test Sq')).toBe('Test Square')
    })

    it('should remove periods from abbreviations', () => {
      expect(normalizeStreetName('Park St.')).toBe('Park Street')
      expect(normalizeStreetName('Central Ave.')).toBe('Central Avenue')
      expect(normalizeStreetName('N. Park St.')).toBe('North Park Street')
    })

    it('should capitalize words properly', () => {
      expect(normalizeStreetName('park street')).toBe('Park Street')
      expect(normalizeStreetName('PARK STREET')).toBe('Park Street')
      expect(normalizeStreetName('pArK sTrEeT')).toBe('Park Street')
    })

    it('should handle multiple spaces between words', () => {
      expect(normalizeStreetName('Park   Street')).toBe('Park Street')
    })

    it('should not expand Way (it maps to itself)', () => {
      expect(normalizeStreetName('Constitution Way')).toBe('Constitution Way')
    })
  })

  describe('normalizeBlockNumber', () => {
    it('should return empty string for empty input', () => {
      expect(normalizeBlockNumber('')).toBe('')
    })

    it('should trim whitespace', () => {
      expect(normalizeBlockNumber('  1400  ')).toBe('1400')
    })

    it('should preserve various block formats', () => {
      expect(normalizeBlockNumber('2300')).toBe('2300')
      expect(normalizeBlockNumber('2300-2310')).toBe('2300-2310')
      expect(normalizeBlockNumber('North side of 2300 block')).toBe('North side of 2300 block')
    })
  })

  describe('validateStreetName', () => {
    it('should reject empty street name', () => {
      const result = validateStreetName('')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Street name is required')
    })

    it('should reject name without street type', () => {
      const result = validateStreetName('Park')
      expect(result.isValid).toBe(false)
      expect(result.message).toContain('street type')
    })

    it('should accept known Alameda streets', () => {
      const result = validateStreetName('Park Street')
      expect(result.isValid).toBe(true)
      expect(result.isWarning).toBeUndefined()
      expect(result.suggestion).toBeUndefined()
    })

    it('should accept known streets with abbreviations', () => {
      const result = validateStreetName('Park St')
      expect(result.isValid).toBe(true)
    })

    it('should accept known streets case-insensitively', () => {
      const result = validateStreetName('park street')
      expect(result.isValid).toBe(true)
    })

    it('should provide suggestion for partial matches', () => {
      // "Park Street North" contains "Park Street" as substring, should suggest it
      const result = validateStreetName('Park Street North')
      expect(result.isValid).toBe(true)
      expect(result.suggestion).toBe('Park Street')
      expect(result.isWarning).toBe(true)
      expect(result.message).toContain('Did you mean')
    })

    it('should allow unknown streets with warning', () => {
      const result = validateStreetName('Nonexistent Boulevard')
      expect(result.isValid).toBe(true)
      expect(result.isWarning).toBe(true)
      expect(result.message).toContain('not in our database')
    })

    it('should accept various street types in the pattern', () => {
      expect(validateStreetName('Test Avenue').isValid).toBe(true)
      expect(validateStreetName('Test Boulevard').isValid).toBe(true)
      expect(validateStreetName('Test Drive').isValid).toBe(true)
      expect(validateStreetName('Test Road').isValid).toBe(true)
      expect(validateStreetName('Test Lane').isValid).toBe(true)
      expect(validateStreetName('Test Court').isValid).toBe(true)
      expect(validateStreetName('Test Place').isValid).toBe(true)
      expect(validateStreetName('Test Circle').isValid).toBe(true)
      expect(validateStreetName('Test Parkway').isValid).toBe(true)
      expect(validateStreetName('Test Terrace').isValid).toBe(true)
      expect(validateStreetName('Test Square').isValid).toBe(true)
    })
  })

  describe('validateBlockNumber', () => {
    it('should reject empty block number', () => {
      const result = validateBlockNumber('')
      expect(result.isValid).toBe(false)
      expect(result.message).toBe('Block number is required')
    })

    it('should accept valid block numbers', () => {
      expect(validateBlockNumber('1400').isValid).toBe(true)
      expect(validateBlockNumber('2300-2310').isValid).toBe(true)
      expect(validateBlockNumber('North side of 2300 block').isValid).toBe(true)
    })
  })
})
