/**
 * Health Endpoint Unit Tests
 * Tests for system health monitoring and performance metrics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import healthHandler from '~/server/api/health.get'
import { setupTestDatabase } from '~/tests/helpers/db'

// Mock the runtime config
vi.mock('~/server/utils/db', async () => {
  const actual = await vi.importActual('~/server/utils/db')
  return {
    ...actual,
    useRuntimeConfig: () => ({
      tursoUrl: ':memory:',
      tursoToken: '',
      public: {
        siteUrl: 'http://localhost:3000'
      }
    })
  }
})

describe('Health Endpoint', () => {
  beforeEach(async () => {
    await setupTestDatabase()
  })

  describe('GET /api/health', () => {
    it('should return healthy status with all metrics', async () => {
      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      const response = await healthHandler(mockEvent)

      // Basic health check
      expect(response.status).toBe('healthy')
      expect(response.timestamp).toBeDefined()
      expect(response.responseTime).toMatch(/\d+ms/)

      // Database health
      expect(response.database).toBeDefined()
      expect(response.database.healthy).toBe(true)
      expect(response.database.success).toBe(true)

      // Environment info
      expect(response.environment).toBeDefined()
      expect(response.environment.siteUrl).toBe('http://localhost:3000')
      expect(response.environment.tursoUrl).toBe('configured')

      // Performance metrics
      expect(response.performance).toBeDefined()
      expect(response.performance.status).toMatch(/✅ FAST|⚠️ SLOW/)
      expect(response.performance.target).toBe('<200ms')
    })

    it('should complete health check under 200ms', async () => {
      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      const start = Date.now()
      const response = await healthHandler(mockEvent)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(200)
      expect(response.performance.totalLatency).toBeLessThan(200)
      expect(response.performance.status).toBe('✅ FAST')
    })

    it('should include database statistics', async () => {
      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      const response = await healthHandler(mockEvent)

      expect(response.database.stats).toBeDefined()
      expect(typeof response.database.stats.users).toBe('number')
      expect(typeof response.database.stats.exams).toBe('number')
      expect(typeof response.database.stats.questions).toBe('number')
      expect(typeof response.database.stats.study_sessions).toBe('number')
    })

    it('should handle database connection errors gracefully', async () => {
      // Mock database failure
      vi.doMock('~/server/utils/db', () => ({
        checkDBHealth: vi.fn().mockResolvedValue({
          healthy: false,
          error: 'Connection failed'
        }),
        testConnection: vi.fn().mockResolvedValue({
          success: false,
          error: 'Connection failed'
        }),
        getQueryStats: vi.fn().mockResolvedValue(null)
      }))

      // Re-import the health handler with mocked dependencies
      const { default: healthHandlerMocked } = await import('~/server/api/health.get')

      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      const response = await healthHandlerMocked(mockEvent)

      expect(response.status).toBe('unhealthy')
      expect(response.database.healthy).toBe(false)
      expect(response.error).toBeDefined()
    })

    it('should track performance trends', async () => {
      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      // Run multiple health checks to test consistency
      const responses = await Promise.all([
        healthHandler(mockEvent),
        healthHandler(mockEvent),
        healthHandler(mockEvent)
      ])

      // All should be healthy
      responses.forEach(response => {
        expect(response.status).toBe('healthy')
        expect(response.performance.totalLatency).toBeLessThan(200)
      })

      // Performance should be consistent
      const latencies = responses.map(r => r.performance.totalLatency)
      const maxLatency = Math.max(...latencies)
      const minLatency = Math.min(...latencies)
      expect(maxLatency - minLatency).toBeLessThan(100) // Max 100ms variance
    })

    it('should include database table information', async () => {
      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      const response = await healthHandler(mockEvent)

      expect(response.database.tables).toBeDefined()
      expect(Array.isArray(response.database.tables)).toBe(true)
      
      // Should include essential tables
      const tableNames = response.database.tables
      expect(tableNames).toContain('users')
      expect(tableNames).toContain('exams')
      expect(tableNames).toContain('questions')
      expect(tableNames).toContain('study_sessions')
    })
  })

  describe('Performance Benchmarks', () => {
    it('should meet sub-200ms response time requirement', async () => {
      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      // Test multiple times to ensure consistency
      const results = []
      for (let i = 0; i < 5; i++) {
        const start = Date.now()
        const response = await healthHandler(mockEvent)
        const duration = Date.now() - start
        
        results.push({ response, duration })
      }

      // All requests should be under 200ms
      results.forEach(({ response, duration }) => {
        expect(duration).toBeLessThan(200)
        expect(response.status).toBe('healthy')
        expect(response.performance.status).toBe('✅ FAST')
      })

      // Average should be well under target
      const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
      expect(avgDuration).toBeLessThan(150)
    })

    it('should handle concurrent health checks efficiently', async () => {
      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      // Simulate 10 concurrent health checks
      const concurrentChecks = Array(10).fill(null).map(() => healthHandler(mockEvent))

      const start = Date.now()
      const responses = await Promise.all(concurrentChecks)
      const totalDuration = Date.now() - start

      // All should succeed
      expect(responses).toHaveLength(10)
      responses.forEach(response => {
        expect(response.status).toBe('healthy')
      })

      // Total time should be reasonable (not 10x single request time)
      expect(totalDuration).toBeLessThan(500) // Should be faster than sequential
    })
  })

  describe('Error Handling', () => {
    it('should handle partial database failures', async () => {
      // Mock partial failure (health check works, stats fail)
      vi.doMock('~/server/utils/db', async () => {
        const actual = await vi.importActual('~/server/utils/db')
        return {
          ...actual,
          getQueryStats: vi.fn().mockResolvedValue(null) // Stats fail
        }
      })

      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      const response = await healthHandler(mockEvent)

      // Should still report as healthy if core functionality works
      expect(response.status).toBe('healthy')
      expect(response.database.stats).toBeNull()
    })

    it('should handle timeout scenarios', async () => {
      // Mock slow database response
      vi.doMock('~/server/utils/db', () => ({
        checkDBHealth: vi.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve({
            healthy: true,
            latency: 150,
            timestamp: new Date().toISOString()
          }), 100))
        ),
        testConnection: vi.fn().mockResolvedValue({
          success: true,
          tables: ['users', 'exams']
        }),
        getQueryStats: vi.fn().mockResolvedValue({
          users: 0, exams: 0, questions: 0, study_sessions: 0
        })
      }))

      const mockEvent = {
        context: {},
        node: { req: { headers: {} } }
      }

      const start = Date.now()
      const response = await healthHandler(mockEvent)
      const duration = Date.now() - start

      expect(response.status).toBe('healthy')
      // Should complete even with slower database
      expect(duration).toBeLessThan(300)
    })
  })
})