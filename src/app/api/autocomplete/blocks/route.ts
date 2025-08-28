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
    const street = searchParams.get('street')?.toLowerCase()
    const query = searchParams.get('q')?.toLowerCase() || ''
    
    if (!query || query.length < 1) {
      return NextResponse.json([])
    }

    // Get all segments and extract unique blocks
    const segments = await getAllSegments()
    const blocks = new Set<string>()
    
    segments.forEach(segment => {
      // If street is provided, filter by street first
      const streetMatch = !street || segment.street.toLowerCase().includes(street)
      const blockMatch = segment.block && segment.block.toLowerCase().includes(query)
      
      if (streetMatch && blockMatch) {
        blocks.add(segment.block)
      }
    })

    // Convert to array and sort
    const blockList = Array.from(blocks)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .slice(0, 10) // Limit to 10 suggestions

    return NextResponse.json(blockList)
  } catch (error) {
    console.error('Error fetching blocks:', error)
    return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 })
  }
}