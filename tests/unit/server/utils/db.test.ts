/**
 * Database Utility Unit Tests
 * Tests for connection management, health checks, and query performance
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { 
  getDB, 
  checkDBHealth, 
  testConnection,
  getConnectionStats,
  setDatabaseEnvironment,
  getDatabaseEnvironment
} from '~/server/utils/db'
import { setupTestDatabase, teardownTestDatabase } from '~/tests/helpers/db'

describe('Database Connection Management', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  afterEach(async () => {
    vi.clearAllMocks()
  })

  describe('getDB', () => {
    it('should return a database connection', () => {
      const db = getDB()
      expect(db).toBeDefined()
      expect(typeof db.execute).toBe('function')
    })

    it('should return the same connection instance (singleton)', () => {
      const db1 = getDB()
      const db2 = getDB()
      expect(db1).toBe(db2)
    })

    it('should handle test environment correctly', () => {
      setDatabaseEnvironment('test')
      const env = getDatabaseEnvironment()
      expect(env).toBe('test')
    })
  })

  describe('checkDBHealth', () => {
    it('should return healthy status with latency under 100ms', async () => {
      const health = await checkDBHealth()
      
      expect(health.healthy).toBe(true)
      expect(health.latency).toBeTypeOf('number')
      expect(health.latency).toBeLessThan(100)
      expect(health.timestamp).toBeDefined()
    })

    it('should measure query performance consistently', async () => {
      const results = await Promise.all([
        checkDBHealth(),
        checkDBHealth(),
        checkDBHealth()
      ])
      
      // All should be healthy
      results.forEach(result => {
        expect(result.healthy).toBe(true)
        expect(result.latency).toBeLessThan(100)
      })
      
      // Latency should be consistent (within reasonable bounds)
      const latencies = results.map(r => r.latency)
      const maxLatency = Math.max(...latencies)
      const minLatency = Math.min(...latencies)
      expect(maxLatency - minLatency).toBeLessThan(50) // Max 50ms variance
    })

    it('should handle connection errors gracefully', async () => {
      // Mock a connection error
      const originalExecute = getDB().execute
      getDB().execute = vi.fn().mockRejectedValue(new Error('Connection failed'))
      
      const health = await checkDBHealth()
      
      expect(health.healthy).toBe(false)
      expect(health.error).toBe('Connection failed')
      expect(health.timestamp).toBeDefined()
      
      // Restore original function
      getDB().execute = originalExecute
    })
  })

  describe('testConnection', () => {
    it('should validate database connection and schema', async () => {
      const result = await testConnection()
      
      expect(result.success).toBe(true)
      expect(result.tables).toBeDefined()
      expect(result.tables.length).toBeGreaterThan(0)
      expect(result.message).toBe('Database connection and schema validated')
      
      // Check for essential tables
      expect(result.tables).toContain('users')
      expect(result.tables).toContain('exams')
      expect(result.tables).toContain('questions')
      expect(result.tables).toContain('study_sessions')
    })

    it('should return failure status on connection error', async () => {
      // Mock connection failure
      const originalExecute = getDB().execute
      getDB().execute = vi.fn().mockRejectedValue(new Error('Schema error'))
      
      const result = await testConnection()
      
      expect(result.success).toBe(false)
      expect(result.error).toBe('Schema error')
      expect(result.message).toBe('Database connection failed')
      
      // Restore original function
      getDB().execute = originalExecute
    })
  })

  describe('Connection Statistics', () => {
    it('should provide connection pool statistics', () => {
      const stats = getConnectionStats()
      
      expect(stats).toBeDefined()
      expect(typeof stats.activeConnections).toBe('number')
      expect(typeof stats.maxConnections).toBe('number')
      expect(Array.isArray(stats.regions)).toBe(true)
    })
  })

  describe('Environment Management', () => {
    it('should switch database environments correctly', () => {
      // Test environment switching
      setDatabaseEnvironment('development')
      expect(getDatabaseEnvironment()).toBe('development')
      
      setDatabaseEnvironment('production')
      expect(getDatabaseEnvironment()).toBe('production')
      
      setDatabaseEnvironment('test')
      expect(getDatabaseEnvironment()).toBe('test')
    })
  })
})

describe('Database Performance Benchmarks', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  it('should execute simple queries under 10ms', async () => {
    const start = Date.now()
    await getDB().execute('SELECT 1 as test')
    const duration = Date.now() - start
    
    expect(duration).toBeLessThan(10)
  })

  it('should handle concurrent queries efficiently', async () => {
    const concurrentQueries = Array(10).fill(null).map(() =>
      getDB().execute('SELECT COUNT(*) FROM users')
    )
    
    const start = Date.now()
    const results = await Promise.all(concurrentQueries)
    const duration = Date.now() - start
    
    // All queries should succeed
    expect(results).toHaveLength(10)
    results.forEach(result => {
      expect(result.rows).toBeDefined()
    })
    
    // Total time for 10 concurrent queries should be reasonable
    expect(duration).toBeLessThan(50)
  })

  it('should perform table joins efficiently', async () => {
    // Create test data for join performance
    const userId = await getDB().execute({
      sql: 'INSERT INTO users (email, name) VALUES (?, ?) RETURNING id',
      args: ['join-test@example.com', 'Join Test User']
    }).then(r => r.rows[0].id)

    const examId = await getDB().execute({
      sql: 'INSERT INTO exams (vendor_id, code, name) VALUES (?, ?, ?) RETURNING id',
      args: ['test', 'JOIN-001', 'Join Test Exam']
    }).then(r => r.rows[0].id)

    // Test complex join query performance
    const start = Date.now()
    const result = await getDB().execute({
      sql: `
        SELECT u.name, e.name as exam_name, COUNT(q.id) as question_count
        FROM users u
        CROSS JOIN exams e
        LEFT JOIN questions q ON e.id = q.exam_id
        WHERE u.id = ? AND e.id = ?
        GROUP BY u.id, e.id
      `,
      args: [userId, examId]
    })
    const duration = Date.now() - start
    
    expect(result.rows).toHaveLength(1)
    expect(duration).toBeLessThan(20) // Join should be fast on small dataset
  })
})

describe('Database Transaction Support', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  it('should handle successful transactions', async () => {
    const db = getDB()
    
    // Start transaction
    await db.execute('BEGIN TRANSACTION')
    
    try {
      // Insert test user
      const result = await db.execute({
        sql: 'INSERT INTO users (email, name) VALUES (?, ?) RETURNING id',
        args: ['transaction-test@example.com', 'Transaction Test']
      })
      
      const userId = result.rows[0].id
      expect(userId).toBeDefined()
      
      // Commit transaction
      await db.execute('COMMIT')
      
      // Verify data was committed
      const user = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [userId]
      })
      
      expect(user.rows).toHaveLength(1)
      expect(user.rows[0].email).toBe('transaction-test@example.com')
    } catch (error) {
      await db.execute('ROLLBACK')
      throw error
    }
  })

  it('should handle transaction rollbacks on error', async () => {
    const db = getDB()
    
    // Count users before transaction
    const beforeCount = await db.execute('SELECT COUNT(*) as count FROM users')
    const initialCount = beforeCount.rows[0].count
    
    // Start transaction
    await db.execute('BEGIN TRANSACTION')
    
    try {
      // Insert valid user
      await db.execute({
        sql: 'INSERT INTO users (email, name) VALUES (?, ?)',
        args: ['rollback-test@example.com', 'Rollback Test']
      })
      
      // Try to insert invalid user (duplicate email)
      await db.execute({
        sql: 'INSERT INTO users (email, name) VALUES (?, ?)',
        args: ['rollback-test@example.com', 'Duplicate User'] // This should fail
      })
      
      await db.execute('COMMIT')
    } catch (error) {
      // Rollback on error
      await db.execute('ROLLBACK')
      
      // Verify rollback worked
      const afterCount = await db.execute('SELECT COUNT(*) as count FROM users')
      expect(afterCount.rows[0].count).toBe(initialCount)
    }
  })
})