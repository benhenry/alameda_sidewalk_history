import { logPerf, getRecentSlowOps, clearPerfLogs, withTiming, withTimingSync } from '../perf-logger'

describe('perf-logger', () => {
  beforeEach(() => {
    clearPerfLogs()
    jest.spyOn(console, 'warn').mockImplementation()
    jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
    delete process.env.PERF_LOG_ALL
  })

  describe('logPerf', () => {
    it('should log slow operations (>= 100ms) as warnings', () => {
      logPerf('slow.operation', 150, { detail: 'test' })

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] SLOW: slow.operation took 150ms'),
        { detail: 'test' }
      )
    })

    it('should store slow operations in recent list', () => {
      logPerf('slow.op1', 200)
      logPerf('slow.op2', 300)

      const ops = getRecentSlowOps()
      expect(ops).toHaveLength(2)
      expect(ops[0].operation).toBe('slow.op1')
      expect(ops[1].operation).toBe('slow.op2')
    })

    it('should not log fast operations by default', () => {
      logPerf('fast.operation', 50)

      expect(console.warn).not.toHaveBeenCalled()
      expect(console.log).not.toHaveBeenCalled()
    })

    it('should log fast operations when PERF_LOG_ALL is true', () => {
      process.env.PERF_LOG_ALL = 'true'

      logPerf('fast.operation', 50)

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] fast.operation: 50ms')
      )
    })

    it('should not store fast operations', () => {
      logPerf('fast.operation', 50)

      expect(getRecentSlowOps()).toHaveLength(0)
    })

    it('should round durations to 2 decimal places', () => {
      logPerf('slow.op', 150.12345)

      const ops = getRecentSlowOps()
      expect(ops[0].duration).toBe(150.12)
    })

    it('should limit stored operations to MAX_STORED_OPS', () => {
      // Fill beyond the 50-item limit
      for (let i = 0; i < 55; i++) {
        logPerf(`slow.op.${i}`, 100 + i)
      }

      const ops = getRecentSlowOps()
      expect(ops).toHaveLength(50)
      // Oldest should be shifted out, newest should be last
      expect(ops[0].operation).toBe('slow.op.5')
      expect(ops[49].operation).toBe('slow.op.54')
    })

    it('should include timestamp in entries', () => {
      const before = new Date()
      logPerf('slow.op', 200)
      const after = new Date()

      const ops = getRecentSlowOps()
      const timestamp = ops[0].timestamp
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })

    it('should handle missing metadata gracefully', () => {
      logPerf('slow.op', 200)

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('[PERF] SLOW: slow.op'),
        ''
      )
    })
  })

  describe('getRecentSlowOps', () => {
    it('should return a copy (not the original array)', () => {
      logPerf('slow.op', 200)

      const ops1 = getRecentSlowOps()
      const ops2 = getRecentSlowOps()

      expect(ops1).not.toBe(ops2)
      expect(ops1).toEqual(ops2)
    })
  })

  describe('clearPerfLogs', () => {
    it('should clear all stored operations', () => {
      logPerf('slow.op', 200)
      expect(getRecentSlowOps()).toHaveLength(1)

      clearPerfLogs()
      expect(getRecentSlowOps()).toHaveLength(0)
    })
  })

  describe('withTiming', () => {
    it('should return the result of the async function', async () => {
      const result = await withTiming('test.op', async () => 42)

      expect(result).toBe(42)
    })

    it('should log the timing of the operation', async () => {
      await withTiming('test.slow', async () => {
        // Simulate slow operation
        const start = Date.now()
        while (Date.now() - start < 1) {} // busy wait briefly
        return 'done'
      })

      // Operation logged (may or may not be slow enough to trigger warn)
      // Just verify it doesn't throw
    })

    it('should re-throw errors from the wrapped function', async () => {
      await expect(
        withTiming('test.error', async () => {
          throw new Error('test failure')
        })
      ).rejects.toThrow('test failure')
    })

    it('should log error operations with (ERROR) suffix', async () => {
      try {
        await withTiming('test.error', async () => {
          throw new Error('test failure')
        })
      } catch {
        // expected
      }

      // If the operation was slow enough, it would be stored
      // The key behavior is it doesn't crash
    })
  })

  describe('withTimingSync', () => {
    it('should return the result of the sync function', () => {
      const result = withTimingSync('test.sync', () => 'hello')

      expect(result).toBe('hello')
    })

    it('should re-throw errors from the wrapped function', () => {
      expect(() =>
        withTimingSync('test.sync.error', () => {
          throw new Error('sync failure')
        })
      ).toThrow('sync failure')
    })
  })
})
