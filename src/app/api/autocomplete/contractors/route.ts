/*
 * Copyright (c) 2025 Ben Henry
 * Licensed under the MIT License
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAllSegments } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.toLowerCase() || ''
    
    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    // Get all segments and extract unique contractors
    const segments = await getAllSegments()
    const contractors = new Set<string>()
    
    segments.forEach(segment => {
      if (segment.contractor && segment.contractor.toLowerCase().includes(query)) {
        contractors.add(segment.contractor)
      }
    })

    // Convert to array and sort
    const contractorList = Array.from(contractors)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .slice(0, 10) // Limit to 10 suggestions

    return NextResponse.json(contractorList)
  } catch (error) {
    console.error('Error fetching contractors:', error)
    return NextResponse.json({ error: 'Failed to fetch contractors' }, { status: 500 })
  }
}