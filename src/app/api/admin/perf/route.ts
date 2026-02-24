import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getRecentSlowOps, clearPerfLogs } from '@/lib/perf-logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/perf
 * Returns recent slow operations for debugging
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const slowOps = getRecentSlowOps()

    return NextResponse.json({
      slowOperations: slowOps,
      count: slowOps.length,
      summary: {
        totalOps: slowOps.length,
        avgDuration: slowOps.length > 0
          ? Math.round(slowOps.reduce((sum, op) => sum + op.duration, 0) / slowOps.length)
          : 0,
        maxDuration: slowOps.length > 0
          ? Math.max(...slowOps.map(op => op.duration))
          : 0,
        byOperation: slowOps.reduce((acc, op) => {
          const key = op.operation
          if (!acc[key]) {
            acc[key] = { count: 0, totalMs: 0, maxMs: 0 }
          }
          acc[key].count++
          acc[key].totalMs += op.duration
          acc[key].maxMs = Math.max(acc[key].maxMs, op.duration)
          return acc
        }, {} as Record<string, { count: number; totalMs: number; maxMs: number }>)
      }
    })
  } catch (error) {
    console.error('Error fetching perf logs:', error)
    return NextResponse.json({ error: 'Failed to fetch perf logs' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/perf
 * Clears perf logs
 */
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    clearPerfLogs()
    return NextResponse.json({ message: 'Perf logs cleared' })
  } catch (error) {
    console.error('Error clearing perf logs:', error)
    return NextResponse.json({ error: 'Failed to clear perf logs' }, { status: 500 })
  }
}
