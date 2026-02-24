/**
 * Performance logging utility for debugging slow operations
 */

const SLOW_THRESHOLD_MS = 100 // Log anything slower than 100ms

export interface PerfEntry {
  operation: string
  duration: number
  timestamp: Date
  metadata?: Record<string, any>
}

// Store recent slow operations for debugging
const recentSlowOps: PerfEntry[] = []
const MAX_STORED_OPS = 50

export function logPerf(operation: string, durationMs: number, metadata?: Record<string, any>) {
  const entry: PerfEntry = {
    operation,
    duration: Math.round(durationMs * 100) / 100,
    timestamp: new Date(),
    metadata
  }

  if (durationMs >= SLOW_THRESHOLD_MS) {
    console.warn(`[PERF] SLOW: ${operation} took ${entry.duration}ms`, metadata || '')
    recentSlowOps.push(entry)
    if (recentSlowOps.length > MAX_STORED_OPS) {
      recentSlowOps.shift()
    }
  } else if (process.env.PERF_LOG_ALL === 'true') {
    console.log(`[PERF] ${operation}: ${entry.duration}ms`)
  }
}

export function getRecentSlowOps(): PerfEntry[] {
  return [...recentSlowOps]
}

export function clearPerfLogs() {
  recentSlowOps.length = 0
}

/**
 * Wrapper to time an async function
 */
export async function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const duration = performance.now() - start
    logPerf(operation, duration, metadata)
    return result
  } catch (error) {
    const duration = performance.now() - start
    logPerf(`${operation} (ERROR)`, duration, { ...metadata, error: String(error) })
    throw error
  }
}

/**
 * Wrapper to time a sync function
 */
export function withTimingSync<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  const start = performance.now()
  try {
    const result = fn()
    const duration = performance.now() - start
    logPerf(operation, duration, metadata)
    return result
  } catch (error) {
    const duration = performance.now() - start
    logPerf(`${operation} (ERROR)`, duration, { ...metadata, error: String(error) })
    throw error
  }
}
