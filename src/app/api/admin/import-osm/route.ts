import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { auth } from '@/auth'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/import-osm
 *
 * Admin-only endpoint to trigger OpenStreetMap sidewalk data import.
 * Runs the import script which fetches data from Overpass API and
 * imports it into the reference_sidewalks table.
 *
 * Requires admin role via Auth.js session.
 */
export async function POST(request: NextRequest) {
  // Authenticate using Auth.js session
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Check admin role
  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Unauthorized. Admin access required.' },
      { status: 403 }
    )
  }

  try {
    console.log('🔄 Starting OSM import...')

    // Run the import script with timeout
    const { stdout, stderr } = await execAsync('npm run import-osm', {
      cwd: process.cwd(),
      env: { ...process.env },
      timeout: 300000, // 5 minute timeout
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer for output
    })

    console.log('✅ OSM import completed')

    return NextResponse.json({
      success: true,
      stdout,
      stderr
    })
  } catch (error: any) {
    console.error('❌ Import error:', error)

    return NextResponse.json({
      success: false,
      error: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || ''
    }, { status: 500 })
  }
}
