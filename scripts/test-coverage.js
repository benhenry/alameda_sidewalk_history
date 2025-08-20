#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

// Read coverage data
const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json')

if (!fs.existsSync(coveragePath)) {
  console.error('❌ Coverage file not found. Run npm run test:coverage first.')
  process.exit(1)
}

const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
const total = coverage.total

const metrics = ['lines', 'functions', 'statements', 'branches']
const threshold = 85

console.log('\n📊 Test Coverage Report\n')
console.log('─'.repeat(50))

let allPassed = true

metrics.forEach(metric => {
  const pct = total[metric].pct
  const covered = total[metric].covered
  const totalCount = total[metric].total
  const status = pct >= threshold ? '✅' : '❌'
  
  if (pct < threshold) {
    allPassed = false
  }
  
  console.log(`${status} ${metric.padEnd(12)} ${pct.toFixed(1)}% (${covered}/${totalCount})`)
})

console.log('─'.repeat(50))

if (allPassed) {
  console.log('🎉 All coverage thresholds met!')
  console.log(`✅ Minimum threshold: ${threshold}%`)
} else {
  console.log('⚠️  Some coverage thresholds not met')
  console.log(`❌ Minimum threshold: ${threshold}%`)
  console.log('\n💡 Tips to improve coverage:')
  console.log('  • Add tests for untested functions')
  console.log('  • Test error paths and edge cases')
  console.log('  • Test component interactions')
  console.log('  • Add integration tests')
}

console.log('\n📁 Detailed report: ./coverage/lcov-report/index.html')

process.exit(allPassed ? 0 : 1)