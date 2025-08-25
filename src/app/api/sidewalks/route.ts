import { NextResponse } from 'next/server'
import { fetchSidewalkData } from '@/lib/sidewalk-validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sidewalkCoordinates = await fetchSidewalkData()
    
    return NextResponse.json({
      coordinates: sidewalkCoordinates,
      count: sidewalkCoordinates.length
    })
  } catch (error) {
    console.error('Error fetching sidewalk data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sidewalk data', coordinates: [] }, 
      { status: 500 }
    )
  }
}