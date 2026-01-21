import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/reverse-geocode
 *
 * Reverse geocodes coordinates to get street address and block number.
 * Uses Google Geocoding API.
 *
 * Request Body:
 *   { lat: number, lng: number }
 *
 * Response:
 *   {
 *     street: string,
 *     block: string,
 *     formattedAddress: string
 *   }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lat, lng } = body

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates. Expected { lat: number, lng: number }' },
        { status: 400 }
      )
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error('Google Maps API key not configured')
      return NextResponse.json(
        { error: 'Geocoding service not available' },
        { status: 503 }
      )
    }

    // Call Google Geocoding API
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    const response = await fetch(geocodeUrl)

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return NextResponse.json({
        street: null,
        block: null,
        formattedAddress: null,
        error: 'No address found for these coordinates'
      })
    }

    // Parse the geocoding result
    const result = data.results[0]
    const addressComponents = result.address_components || []

    // Extract street number and street name
    let streetNumber = ''
    let streetName = ''

    for (const component of addressComponents) {
      const types = component.types || []
      if (types.includes('street_number')) {
        streetNumber = component.long_name
      }
      if (types.includes('route')) {
        streetName = component.long_name
      }
    }

    // Calculate block from street number (e.g., 2345 -> "2300")
    let block = ''
    if (streetNumber) {
      const num = parseInt(streetNumber, 10)
      if (!isNaN(num)) {
        // Round down to nearest 100
        block = (Math.floor(num / 100) * 100).toString()
      }
    }

    return NextResponse.json({
      street: streetName || null,
      block: block || null,
      formattedAddress: result.formatted_address || null
    })
  } catch (error) {
    console.error('Error in reverse geocoding:', error)
    return NextResponse.json(
      { error: 'Failed to reverse geocode coordinates' },
      { status: 500 }
    )
  }
}
