/**
 * Test Setup and Configuration
 * Global test environment setup for Vitest
 */

import { beforeAll, beforeEach, afterAll, afterEach } from 'vitest'
import { setDatabaseEnvironment } from '~/server/utils/db'
import { setupTestDatabase, teardownTestDatabase } from './db'

/**
 * Global setup for all tests
 */
beforeAll(async () => {
  // Set test environment
  setDatabaseEnvironment('test')
  
  // Setup test database
  await setupTestDatabase()
  
  console.log('🧪 Test environment initialized')
})

/**
 * Cleanup after all tests
 */
afterAll(async () => {
  await teardownTestDatabase()
  console.log('🧹 Test environment cleaned up')
})

/**
 * Reset test data before each test
 */
beforeEach(async () => {
  // Individual tests can override this if needed
})

/**
 * Cleanup after each test
 */
afterEach(async () => {
  // Individual tests can add cleanup here
})

// Mock runtime config for tests
global.useRuntimeConfig = () => ({
  tursoUrl: ':memory:',
  tursoToken: '',
  jwtSecret: 'test-jwt-secret',
  public: {
    siteUrl: 'http://localhost:3000'
  }
})

// Mock Nuxt's createError
global.createError = (error: any) => {
  const err = new Error(error.statusMessage || 'Test error')
  err['statusCode'] = error.statusCode || 500
  err['statusMessage'] = error.statusMessage || 'Test error'
  return err
}

// Mock console for cleaner test output
const originalConsole = console
global.console = {
  ...originalConsole,
  log: process.env.TEST_VERBOSE ? originalConsole.log : () => {},
  info: process.env.TEST_VERBOSE ? originalConsole.info : () => {},
  warn: process.env.TEST_VERBOSE ? originalConsole.warn : () => {},
  error: originalConsole.error // Always show errors
}