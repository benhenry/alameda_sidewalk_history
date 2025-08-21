// Sidewalk validation using OpenStreetMap data
import { distance, point } from '@turf/turf'

interface OSMElement {
  type: string
  id: number
  lat?: number
  lon?: number
  nodes?: number[]
  tags: Record<string, string>
}

interface OSMData {
  elements: OSMElement[]
}

// Cache for sidewalk data to avoid repeated API calls
let sidewalkCache: { 
  data: [number, number][] | null, 
  expiry: number 
} = { data: null, expiry: 0 }

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes
const ALAMEDA_BOUNDS = {
  south: 37.75,
  west: -122.32,
  north: 37.78,
  east: -122.22
}

/**
 * Fetch sidewalk data from OpenStreetMap for Alameda, CA
 */
export async function fetchSidewalkData(): Promise<[number, number][]> {
  // Check cache first
  if (sidewalkCache.data && Date.now() < sidewalkCache.expiry) {
    return sidewalkCache.data
  }

  try {
    // Simplified Overpass query for Alameda sidewalks and footways
    const overpassQuery = `[out:json][timeout:30];
(
  way["highway"="footway"](bbox:${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
  way["highway"="path"]["foot"!="no"](bbox:${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
  way["footway"="sidewalk"](bbox:${ALAMEDA_BOUNDS.south},${ALAMEDA_BOUNDS.west},${ALAMEDA_BOUNDS.north},${ALAMEDA_BOUNDS.east});
);
(._;>;);
out geom;`

    console.log('Overpass query:', overpassQuery)

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(overpassQuery)}`
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Overpass API error response:', errorText)
      throw new Error(`Overpass API error: ${response.status} - ${errorText}`)
    }

    const data: OSMData = await response.json()
    
    // Extract coordinates from ways
    const sidewalkCoordinates: [number, number][] = []
    
    // First, collect all nodes
    const nodeMap = new Map<number, [number, number]>()
    data.elements.forEach(element => {
      if (element.type === 'node' && element.lat && element.lon) {
        nodeMap.set(element.id, [element.lat, element.lon])
      }
    })
    
    // Then process ways
    data.elements.forEach(element => {
      if (element.type === 'way' && element.nodes) {
        const wayCoords: [number, number][] = []
        element.nodes.forEach(nodeId => {
          const coord = nodeMap.get(nodeId)
          if (coord) {
            wayCoords.push(coord)
          }
        })
        if (wayCoords.length > 1) {
          sidewalkCoordinates.push(...wayCoords)
        }
      }
    })

    // Cache the result
    sidewalkCache = {
      data: sidewalkCoordinates,
      expiry: Date.now() + CACHE_DURATION
    }

    return sidewalkCoordinates
  } catch (error) {
    console.error('Error fetching sidewalk data:', error)
    // Return empty array on error, validation will be skipped
    return []
  }
}

/**
 * Validate if given coordinates are near known sidewalk locations
 */
export async function validateSidewalkCoordinates(
  coordinates: [number, number][],
  bufferDistanceMeters: number = 10
): Promise<{ isValid: boolean; invalidCoordinates: [number, number][] }> {
  // Skip validation on server-side rendering (allow all coordinates)
  if (typeof window === 'undefined') {
    return { isValid: true, invalidCoordinates: [] }
  }

  try {
    const sidewalkData = await fetchSidewalkData()
    
    // If no sidewalk data available, allow all coordinates (fallback)
    if (sidewalkData.length === 0) {
      return { isValid: true, invalidCoordinates: [] }
    }

    const invalidCoordinates: [number, number][] = []
    
    // Check each coordinate against sidewalk data
    for (const coord of coordinates) {
      const coordPoint = point([coord[1], coord[0]]) // [lng, lat] for Turf
      let isNearSidewalk = false
      
      // Check if coordinate is within buffer distance of any sidewalk point
      for (const sidewalkCoord of sidewalkData) {
        const sidewalkPoint = point([sidewalkCoord[1], sidewalkCoord[0]])
        const distanceKm = distance(coordPoint, sidewalkPoint, { units: 'kilometers' })
        const distanceMeters = distanceKm * 1000
        
        if (distanceMeters <= bufferDistanceMeters) {
          isNearSidewalk = true
          break
        }
      }
      
      if (!isNearSidewalk) {
        invalidCoordinates.push(coord)
      }
    }
    
    return {
      isValid: invalidCoordinates.length === 0,
      invalidCoordinates
    }
  } catch (error) {
    console.error('Error validating coordinates:', error)
    // Allow coordinates on validation error (fallback)
    return { isValid: true, invalidCoordinates: [] }
  }
}

/**
 * Get nearby sidewalk suggestions for invalid coordinates
 */
export async function getSidewalkSuggestions(
  coordinate: [number, number],
  maxDistanceMeters: number = 50
): Promise<[number, number][]> {
  // Skip on server-side rendering
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const sidewalkData = await fetchSidewalkData()
    const coordPoint = point([coordinate[1], coordinate[0]])
    
    const suggestions: Array<{ coord: [number, number]; distance: number }> = []
    
    for (const sidewalkCoord of sidewalkData) {
      const sidewalkPoint = point([sidewalkCoord[1], sidewalkCoord[0]])
      const distanceKm = distance(coordPoint, sidewalkPoint, { units: 'kilometers' })
      const distanceMeters = distanceKm * 1000
      
      if (distanceMeters <= maxDistanceMeters) {
        suggestions.push({
          coord: sidewalkCoord,
          distance: distanceMeters
        })
      }
    }
    
    // Sort by distance and return top 5 suggestions
    return suggestions
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
      .map(s => s.coord)
  } catch (error) {
    console.error('Error getting sidewalk suggestions:', error)
    return []
  }
}