import { NextRequest, NextResponse } from 'next/server'
import { contractorQueries } from '@/lib/database'
import { Contractor } from '@/types/sidewalk'

export async function GET() {
  try {
    const contractors = contractorQueries.getAll.all()
    
    const formattedContractors: Contractor[] = contractors.map(contractor => ({
      id: contractor.id,
      name: contractor.name,
      yearsActive: contractor.years_active ? JSON.parse(contractor.years_active) : [],
      totalSegments: contractor.total_segments || 0
    }))

    return NextResponse.json(formattedContractors)
  } catch (error) {
    console.error('Error fetching contractors:', error)
    return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 })
  }
}