// Street name normalization and validation for Alameda

// Common street name abbreviations and their standardized forms
const STREET_ABBREVIATIONS: Record<string, string> = {
  // Directions
  'N': 'North',
  'S': 'South', 
  'E': 'East',
  'W': 'West',
  'NE': 'Northeast',
  'NW': 'Northwest',
  'SE': 'Southeast', 
  'SW': 'Southwest',
  
  // Street types
  'St': 'Street',
  'Ave': 'Avenue',
  'Blvd': 'Boulevard',
  'Dr': 'Drive',
  'Rd': 'Road',
  'Ln': 'Lane',
  'Ct': 'Court',
  'Pl': 'Place',
  'Way': 'Way',
  'Cir': 'Circle',
  'Pkwy': 'Parkway',
  'Ter': 'Terrace',
  'Sq': 'Square',
}

// Alameda street names for validation and suggestions
// This is not exhaustive but covers major streets - unknown streets will be allowed with warnings
const ALAMEDA_STREETS = [
  // Major arterials and numbered streets
  'Park Street', 'Webster Street', 'Central Avenue', 'High Street', 'Lincoln Avenue',
  'Santa Clara Avenue', 'Encinal Avenue', 'Grand Street', 'Alameda Avenue',
  
  // Tree streets (east side)
  'Oak Street', 'Walnut Street', 'Chestnut Street', 'Willow Street', 'Maple Street', 
  'Elm Street', 'Birch Street', 'Pine Street', 'Cedar Street', 'Poplar Street', 'Hazel Street',
  
  // Bay-facing streets
  'Bay Street', 'Shoreline Drive', 'Shore Line Drive', 'Crown Beach',
  
  // West end streets  
  'Buena Vista Avenue', 'Clinton Avenue', 'Eagle Avenue', 'Fernside Boulevard',
  'Otis Drive', 'Atlantic Avenue', 'Pacific Avenue', 'Union Street', 'Taylor Street',
  
  // East end and island areas
  'San Antonio Avenue', 'San Jose Avenue', 'Versailles Avenue', 'Marina Village Parkway',
  'Island Drive', 'Westline Drive', 'Willie Stargell Avenue', 'Constitution Way',
  
  // Additional major streets
  'Fairview Avenue', 'Carroll Avenue', 'Benton Street', 'Broadway', 'Clement Avenue',
  'Dayton Avenue', 'Everett Avenue', 'Francisco Street', 'Golden Gate Avenue',
  'Hanford Street', 'Heeger Avenue', 'Juanita Avenue', 'Kitty Hawk Road',
  'Lafayette Street', 'Marshall Way', 'Nautilus Road', 'Orion Street',
  'Paru Street', 'Polaris Avenue', 'Robert Davey Jr Drive', 'Singleton Avenue',
  'Stone Street', 'Thompson Avenue', 'Tilden Way', 'Valley Street', 'Willis Avenue'
]

export function normalizeStreetName(streetName: string): string {
  if (!streetName) return ''
  
  // Basic cleanup
  let normalized = streetName.trim()
  
  // Split into words for processing
  const words = normalized.split(/\s+/)
  
  // Normalize each word
  const normalizedWords = words.map((word, index) => {
    // Remove periods
    const cleanWord = word.replace(/\./g, '')
    
    // Check if it's an abbreviation we should expand
    if (STREET_ABBREVIATIONS[cleanWord]) {
      return STREET_ABBREVIATIONS[cleanWord]
    }
    
    // Capitalize first letter of each word
    return cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1).toLowerCase()
  })
  
  return normalizedWords.join(' ')
}

export function normalizeBlockNumber(block: string): string {
  if (!block) return ''
  
  // Remove extra spaces and normalize
  return block.trim()
}

/**
 * Validates street names with a permissive approach:
 * - Requires basic street format (must include street type)  
 * - Known streets in database: no warnings
 * - Unknown streets: allowed with warning message
 * - Similar matches: suggestions offered
 * This prevents blocking valid Alameda streets not in our database
 */
export function validateStreetName(streetName: string): { isValid: boolean; suggestion?: string; message?: string; isWarning?: boolean } {
  const normalized = normalizeStreetName(streetName)
  
  if (!normalized) {
    return { isValid: false, message: 'Street name is required' }
  }
  
  // Basic format validation - must contain street type
  const hasStreetType = /\b(street|avenue|boulevard|drive|road|lane|court|place|way|circle|parkway|terrace|square|ave|st|blvd|dr|rd|ln|ct|pl|cir|pkwy|ter|sq)\b/i.test(normalized)
  
  if (!hasStreetType) {
    return { 
      isValid: false, 
      message: 'Please include a street type (e.g., Street, Avenue, Drive)' 
    }
  }
  
  // Check if it's a known Alameda street
  const isKnownStreet = ALAMEDA_STREETS.some(street => 
    street.toLowerCase() === normalized.toLowerCase()
  )
  
  if (isKnownStreet) {
    return { isValid: true }
  }
  
  // Try to find a close match for suggestions
  const suggestion = ALAMEDA_STREETS.find(street => 
    street.toLowerCase().includes(normalized.toLowerCase()) ||
    normalized.toLowerCase().includes(street.toLowerCase())
  )
  
  if (suggestion) {
    return { 
      isValid: true, // Allow it but show suggestion
      suggestion,
      message: `Did you mean "${suggestion}"?`,
      isWarning: true
    }
  }
  
  // Allow unknown streets but show a warning
  return { 
    isValid: true, 
    message: 'Street not in our database. Please verify this is correct.',
    isWarning: true
  }
}

export function validateBlockNumber(block: string): { isValid: boolean; message?: string } {
  const normalized = normalizeBlockNumber(block)
  
  if (!normalized) {
    return { isValid: false, message: 'Block number is required' }
  }
  
  // Allow any non-empty text as a valid block identifier
  // This supports various formats like "2300", "2300-2310", "North side of 2300 block", etc.
  return { isValid: true }
}