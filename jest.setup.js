import '@testing-library/jest-dom'

// Mock Leaflet
global.L = {
  Icon: {
    Default: {
      prototype: {
        _getIconUrl: jest.fn(),
      },
      mergeOptions: jest.fn(),
    },
  },
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}))

// Mock fetch
global.fetch = jest.fn()

// Mock file reading APIs (only in jsdom environment)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'FileReader', {
    writable: true,
    value: jest.fn().mockImplementation(() => ({
      readAsDataURL: jest.fn(),
      addEventListener: jest.fn(),
      result: 'data:image/jpeg;base64,test',
    })),
  })
}

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-1234',
  },
})

// Mock Next.js Request/Response for API routes
global.Request = class MockRequest {
  constructor(url, options = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this._body = options.body
  }

  json() {
    return Promise.resolve(JSON.parse(this._body || '{}'))
  }

  get(name) {
    return this.headers.get(name)
  }
}

global.Response = class MockResponse {
  constructor(body, options = {}) {
    this.body = body
    this.status = options.status || 200
    this.headers = new Map(Object.entries(options.headers || {}))
  }

  json() {
    return Promise.resolve(JSON.parse(this.body))
  }

  static json(data, options = {}) {
    return new MockResponse(JSON.stringify(data), options)
  }
}

// Mock console.error to avoid noise in tests
const originalError = console.error
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
     args[0].includes('Error fetching') ||
     args[0].includes('Failed to'))
  ) {
    return
  }
  originalError.call(console, ...args)
}