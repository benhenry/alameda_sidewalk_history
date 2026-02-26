const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/app/layout.tsx',
    '!src/app/globals.css',
    // Exclude files requiring live DB connections or external services (untestable in unit tests)
    '!src/lib/database-postgres.ts',
    '!src/lib/database-sqlite.ts',
    '!src/lib/database-sqlite-async.ts',
    '!src/lib/database-sqlite-stub.ts',
    '!src/lib/email.ts',
    '!src/components/GooglePlacesInput.tsx',
    // Exclude page-level components (integration test territory)
    '!src/app/page.tsx',
    '!src/app/admin/page.tsx',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/', '<rootDir>/e2e/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-leaflet$': '<rootDir>/__mocks__/react-leaflet.js',
    '^leaflet$': '<rootDir>/__mocks__/leaflet.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-leaflet|@turf|next-auth|@auth)/)'
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
}

module.exports = createJestConfig(customJestConfig)