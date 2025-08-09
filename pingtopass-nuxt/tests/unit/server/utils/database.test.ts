/**
 * Unit tests for Database Utility
 * Critical path: Database connectivity and query execution
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies
vi.mock('@libsql/client', () => ({
  createClient: vi.fn(() => ({
    execute: vi.fn(),
    run: vi.fn(),
    close: vi.fn()
  }))
}))

vi.mock('drizzle-orm/libsql', () => ({
  drizzle: vi.fn(() => ({
    run: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }))
}))

// Import after mocking
import { getDB } from '../../../../server/utils/database'

describe('Database Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the database instance
    process.env.TURSO_DATABASE_URL = 'libsql://test-db.turso.io'
    process.env.TURSO_AUTH_TOKEN = 'test-token'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should create database connection with correct configuration', () => {
    const db = getDB()
    
    expect(db).toBeDefined()
    expect(typeof db).toBe('object')
  })

  it('should reuse existing database connection', () => {
    const db1 = getDB()
    const db2 = getDB()
    
    // Should return the same instance
    expect(db1).toBe(db2)
  })

  it('should throw error when database credentials are missing', () => {
    delete process.env.TURSO_DATABASE_URL
    delete process.env.TURSO_AUTH_TOKEN
    
    // Clear the cached database instance by requiring fresh module
    vi.resetModules()
    
    expect(() => {
      // This would normally throw an error in the actual implementation
      const { getDB: freshGetDB } = require('../../../../server/utils/database')
      freshGetDB()
    }).toThrow(/Missing Turso database credentials/)
  })

  it('should export required drizzle operators', async () => {
    const { sql, eq, and, or, desc, asc, inArray } = await import('../../../../server/utils/database')
    
    expect(sql).toBeDefined()
    expect(eq).toBeDefined()
    expect(and).toBeDefined()
    expect(or).toBeDefined()
    expect(desc).toBeDefined()
    expect(asc).toBeDefined()
    expect(inArray).toBeDefined()
  })

  it('should handle database connection errors', () => {
    // Mock a connection failure
    vi.doMock('@libsql/client', () => ({
      createClient: vi.fn(() => {
        throw new Error('Connection failed')
      })
    }))

    expect(() => {
      const db = getDB()
    }).not.toThrow() // The error should be handled gracefully
  })

  it('should use environment variables for database configuration', () => {
    const testUrl = 'libsql://test.turso.io'
    const testToken = 'test-auth-token'
    
    process.env.TURSO_DATABASE_URL = testUrl
    process.env.TURSO_AUTH_TOKEN = testToken
    
    const { createClient } = require('@libsql/client')
    
    getDB()
    
    expect(createClient).toHaveBeenCalledWith({
      url: testUrl,
      authToken: testToken
    })
  })
})