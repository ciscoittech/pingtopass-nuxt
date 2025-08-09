/**
 * Vitest Setup File
 * Global configuration and mocks for unit tests
 */

import { vi } from 'vitest'
import type { MockedFunction } from 'vitest'

// Make Vue composables globally available
import * as vue from 'vue'
Object.assign(globalThis, vue)

// Mock environment variables for tests
process.env.NODE_ENV = 'test'
process.env.TURSO_DATABASE_URL = 'test-db-url'
process.env.TURSO_AUTH_TOKEN = 'test-auth-token'
process.env.JWT_SECRET = 'test-jwt-secret'

// Mock Nuxt runtime config
vi.mock('#imports', () => ({
  useRuntimeConfig: vi.fn(() => ({
    turso: {
      databaseUrl: 'test-db-url',
      authToken: 'test-auth-token'
    },
    jwtSecret: 'test-jwt-secret',
    public: {
      siteUrl: 'http://localhost:3000'
    }
  })),
  setHeader: vi.fn(),
  setResponseStatus: vi.fn(),
  setResponseHeaders: vi.fn(),
  getHeaders: vi.fn(() => ({})),
  getRequestURL: vi.fn(() => ({
    pathname: '/test',
    search: '',
    href: 'http://localhost:3000/test'
  })),
  getQuery: vi.fn(() => ({})),
  createError: vi.fn((options) => {
    const error = new Error(options.statusMessage || 'Test Error')
    error.statusCode = options.statusCode || 500
    return error
  })
}))

// Mock H3 event object for tests
export const createMockEvent = (overrides: Partial<any> = {}) => ({
  node: {
    req: {
      method: 'GET',
      url: '/test',
      headers: {},
      socket: {
        remoteAddress: '127.0.0.1'
      }
    },
    res: {
      statusCode: 200,
      setHeader: vi.fn(),
      writeHead: vi.fn(),
      end: vi.fn()
    }
  },
  context: {
    startTime: Date.now(),
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    }
  },
  ...overrides
})

// Global test utilities
global.createMockEvent = createMockEvent

// Extend expect matchers
expect.extend({
  toBeValidResponse(received) {
    const pass = received && 
      typeof received === 'object' && 
      'status' in received &&
      'timestamp' in received

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid response`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid response with status and timestamp`,
        pass: false,
      }
    }
  },
})

// Type augmentation for custom matchers
interface CustomMatchers<R = unknown> {
  toBeValidResponse(): R
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// Global setup before all tests
beforeAll(() => {
  // Setup global test state
  vi.clearAllMocks()
})

// Setup before each test
beforeEach(() => {
  // Reset mocks between tests
  vi.resetAllMocks()
})

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks()
})