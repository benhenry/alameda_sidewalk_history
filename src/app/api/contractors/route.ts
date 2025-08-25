import { NextRequest, NextResponse } from 'next/server'
import { getAllContractors } from '@/lib/database'
import { Contractor } from '@/types/sidewalk'

export async function GET() {
  try {
    const contractors = await getAllContractors()
    return NextResponse.json(contractors)
  } catch (error) {
    console.error('Error fetching contractors:', error)
    return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 })
  }
}