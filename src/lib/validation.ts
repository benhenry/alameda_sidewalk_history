import DOMPurify from 'isomorphic-dompurify'

// Input validation schemas
export const validationRules = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    maxLength: 254,
    required: true
  },
  username: {
    pattern: /^[a-zA-Z0-9_-]{3,30}$/,
    maxLength: 30,
    minLength: 3,
    required: true
  },
  password: {
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/,
    maxLength: 128,
    minLength: 8,
    required: true
  },
  contractor: {
    pattern: /^[a-zA-Z0-9\s\-\.\&\,]{1,100}$/,
    maxLength: 100,
    minLength: 1,
    required: true
  },
  street: {
    pattern: /^[a-zA-Z0-9\s\-\.]{1,100}$/,
    maxLength: 100,
    minLength: 1,
    required: true
  },
  block: {
    pattern: /^[a-zA-Z0-9\s\-]{1,20}$/,
    maxLength: 20,
    minLength: 1,
    required: true
  },
  year: {
    min: 1850,
    max: new Date().getFullYear() + 1,
    required: true
  },
  coordinates: {
    lat: { min: 37.7, max: 37.8 }, // Alameda bounds
    lng: { min: -122.3, max: -122.2 }
  },
  notes: {
    maxLength: 1000,
    required: false
  },
  specialMark: {
    pattern: /^[a-zA-Z0-9\s\-]{1,10}$/,
    maxLength: 10,
    required: false
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedValue?: any
}

export function validateField(field: string, value: any): ValidationResult {
  const rules = validationRules[field as keyof typeof validationRules]
  if (!rules) {
    return { isValid: false, errors: ['Unknown field'] }
  }

  const errors: string[] = []

  // Check required
  if (rules.required && (value === null || value === undefined || value === '')) {
    errors.push(`${field} is required`)
    return { isValid: false, errors }
  }

  // Skip validation if field is optional and empty
  if (!rules.required && (value === null || value === undefined || value === '')) {
    return { isValid: true, errors: [], sanitizedValue: value }
  }

  // String validations
  if (typeof value === 'string') {
    // Sanitize HTML
    const sanitizedValue = DOMPurify.sanitize(value.trim())
    
    // Length checks
    if ('maxLength' in rules && sanitizedValue.length > rules.maxLength) {
      errors.push(`${field} must be no more than ${rules.maxLength} characters`)
    }
    if ('minLength' in rules && sanitizedValue.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`)
    }
    
    // Pattern check
    if ('pattern' in rules && !rules.pattern.test(sanitizedValue)) {
      errors.push(`${field} format is invalid`)
    }
    
    return { 
      isValid: errors.length === 0, 
      errors, 
      sanitizedValue: sanitizedValue
    }
  }

  // Number validations
  if (typeof value === 'number' || !isNaN(Number(value))) {
    const numValue = Number(value)
    
    if ('min' in rules && numValue < rules.min) {
      errors.push(`${field} must be at least ${rules.min}`)
    }
    if ('max' in rules && numValue > rules.max) {
      errors.push(`${field} must be no more than ${rules.max}`)
    }
    
    return { 
      isValid: errors.length === 0, 
      errors, 
      sanitizedValue: numValue
    }
  }

  return { isValid: false, errors: [`Invalid ${field} type`] }
}

export function validateCoordinates(coordinates: [number, number][]): ValidationResult {
  const errors: string[] = []
  
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    errors.push('At least one coordinate pair is required')
    return { isValid: false, errors }
  }

  if (coordinates.length > 50) {
    errors.push('Too many coordinates (maximum 50)')
    return { isValid: false, errors }
  }

  const validCoords: [number, number][] = []
  
  for (let i = 0; i < coordinates.length; i++) {
    const [lat, lng] = coordinates[i]
    
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      errors.push(`Coordinate ${i + 1}: Invalid coordinate format`)
      continue
    }
    
    if (lat < validationRules.coordinates.lat.min || lat > validationRules.coordinates.lat.max) {
      errors.push(`Coordinate ${i + 1}: Latitude must be within Alameda bounds`)
      continue
    }
    
    if (lng < validationRules.coordinates.lng.min || lng > validationRules.coordinates.lng.max) {
      errors.push(`Coordinate ${i + 1}: Longitude must be within Alameda bounds`)
      continue
    }
    
    validCoords.push([lat, lng])
  }
  
  return { 
    isValid: errors.length === 0, 
    errors, 
    sanitizedValue: validCoords
  }
}

export function validateSegmentData(data: any): ValidationResult {
  const errors: string[] = []
  const sanitized: any = {}

  // Validate each field
  const fields = ['contractor', 'year', 'street', 'block', 'notes']
  
  for (const field of fields) {
    const result = validateField(field, data[field])
    if (!result.isValid) {
      errors.push(...result.errors)
    } else {
      sanitized[field] = result.sanitizedValue
    }
  }

  // Validate coordinates
  const coordResult = validateCoordinates(data.coordinates)
  if (!coordResult.isValid) {
    errors.push(...coordResult.errors)
  } else {
    sanitized.coordinates = coordResult.sanitizedValue
  }

  // Validate special marks
  if (data.specialMarks && Array.isArray(data.specialMarks)) {
    const validMarks: string[] = []
    for (const mark of data.specialMarks) {
      const result = validateField('specialMark', mark)
      if (result.isValid) {
        validMarks.push(result.sanitizedValue)
      }
    }
    sanitized.specialMarks = validMarks
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedValue: sanitized
  }
}

// File upload validation
export function validateImageFile(file: File): ValidationResult {
  const errors: string[] = []
  
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    errors.push('File must be JPEG, PNG, or WebP format')
  }
  
  // Check file size (10MB limit)
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    errors.push('File size must be less than 10MB')
  }
  
  // Check filename
  const filename = file.name
  if (filename.length > 100) {
    errors.push('Filename too long')
  }
  
  if (!/^[a-zA-Z0-9\-_\.\s]+$/.test(filename)) {
    errors.push('Filename contains invalid characters')
  }
  
  return { isValid: errors.length === 0, errors }
}