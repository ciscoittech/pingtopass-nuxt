/**
 * E2E tests for Health Endpoints
 * Critical path: Application monitoring and uptime verification
 */

import { test, expect } from '@playwright/test'

test.describe('Health Endpoints', () => {
  test.describe('Basic Health Check', () => {
    test('should return healthy status from /api/health', async ({ page }) => {
      const response = await page.goto('/api/health')
      
      expect(response?.status()).toBe(200)
      
      const healthData = await response?.json()
      expect(healthData).toHaveProperty('status', 'healthy')
      expect(healthData).toHaveProperty('timestamp')
      expect(healthData).toHaveProperty('uptime')
      expect(healthData).toHaveProperty('environment')
      expect(healthData).toHaveProperty('version')
      expect(healthData).toHaveProperty('checks')
      
      // Verify checks object structure
      expect(healthData.checks).toHaveProperty('server', 'ok')
      expect(healthData.checks).toHaveProperty('responseTime')
      expect(healthData.checks).toHaveProperty('memory')
      
      // Verify memory info
      expect(healthData.checks.memory).toHaveProperty('used')
      expect(healthData.checks.memory).toHaveProperty('total')
      expect(healthData.checks.memory).toHaveProperty('external')
    })

    test('should have proper cache headers', async ({ page }) => {
      const response = await page.goto('/api/health')
      
      expect(response?.status()).toBe(200)
      
      const headers = response?.headers()
      expect(headers?.['cache-control']).toBe('no-cache, no-store, must-revalidate')
      expect(headers?.['pragma']).toBe('no-cache')
      expect(headers?.['expires']).toBe('0')
    })

    test('should have reasonable response time', async ({ page }) => {
      const startTime = Date.now()
      const response = await page.goto('/api/health')
      const endTime = Date.now()
      
      expect(response?.status()).toBe(200)
      
      const responseTime = endTime - startTime
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
    })
  })

  test.describe('Database Health Check', () => {
    test('should check database connectivity at /api/health/database', async ({ page }) => {
      const response = await page.goto('/api/health/database')
      
      // Response should be either healthy (200) or service unavailable (503)
      expect([200, 503]).toContain(response?.status())
      
      const healthData = await response?.json()
      expect(healthData).toHaveProperty('status')
      expect(healthData).toHaveProperty('timestamp')
      expect(healthData).toHaveProperty('database')
      expect(healthData).toHaveProperty('responseTime')
      expect(healthData).toHaveProperty('checks')
      
      if (response?.status() === 200) {
        expect(healthData.status).toBe('healthy')
        expect(healthData.database).toBe('connected')
        expect(healthData.checks.connectivity).toBe('ok')
        expect(healthData.checks.query).toBe('ok')
      } else {
        expect(healthData.status).toBe('unhealthy')
        expect(healthData.database).toBe('disconnected')
        expect(healthData).toHaveProperty('error')
      }
    })

    test('should have cache control headers', async ({ page }) => {
      const response = await page.goto('/api/health/database')
      
      if (response?.status() === 200) {
        const headers = response?.headers()
        expect(headers?.['cache-control']).toBe('no-cache, no-store, must-revalidate')
      }
    })
  })

  test.describe('Detailed Health Check', () => {
    test('should provide detailed system status at /api/monitoring/health', async ({ page }) => {
      const response = await page.goto('/api/monitoring/health')
      
      expect(response?.status()).toBe(200)
      
      const healthData = await response?.json()
      expect(healthData).toHaveProperty('timestamp')
      expect(healthData).toHaveProperty('status')
      expect(healthData).toHaveProperty('responseTime')
      expect(healthData).toHaveProperty('version')
      expect(healthData).toHaveProperty('environment')
      expect(healthData).toHaveProperty('checks')
      expect(healthData).toHaveProperty('summary')
      
      // Verify checks include all expected categories
      expect(healthData.checks).toHaveProperty('database')
      expect(healthData.checks).toHaveProperty('system')
      expect(healthData.checks).toHaveProperty('errors')
      expect(healthData.checks).toHaveProperty('environment')
      expect(healthData.checks).toHaveProperty('configuration')
      
      // Verify summary provides counts
      expect(healthData.summary).toHaveProperty('healthy')
      expect(healthData.summary).toHaveProperty('degraded')
      expect(healthData.summary).toHaveProperty('critical')
      expect(healthData.summary).toHaveProperty('total')
      
      // Total should be sum of all statuses
      const { healthy, degraded, critical, total } = healthData.summary
      expect(total).toBe(healthy + degraded + critical)
    })
  })

  test.describe('Performance Requirements', () => {
    test('should meet performance targets', async ({ page }) => {
      // Test multiple requests to ensure consistency
      const times: number[] = []
      
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now()
        const response = await page.goto('/api/health')
        const endTime = Date.now()
        
        expect(response?.status()).toBe(200)
        times.push(endTime - startTime)
      }
      
      const averageTime = times.reduce((a, b) => a + b) / times.length
      const maxTime = Math.max(...times)
      
      // Performance targets
      expect(averageTime).toBeLessThan(200) // Average under 200ms
      expect(maxTime).toBeLessThan(500)     // Max under 500ms
    })

    test('should handle concurrent requests', async ({ browser }) => {
      const context = await browser.newContext()
      
      // Create multiple pages for concurrent requests
      const pages = await Promise.all([
        context.newPage(),
        context.newPage(),
        context.newPage(),
        context.newPage(),
        context.newPage()
      ])
      
      // Make concurrent requests
      const requests = pages.map(page => page.goto('/api/health'))
      const responses = await Promise.all(requests)
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response?.status()).toBe(200)
      })
      
      await context.close()
    })
  })

  test.describe('Error Handling', () => {
    test('should return 404 for unknown health endpoints', async ({ page }) => {
      const response = await page.goto('/api/health/nonexistent')
      
      expect(response?.status()).toBe(404)
    })

    test('should gracefully handle malformed requests', async ({ page }) => {
      // Test with invalid HTTP methods or malformed URLs
      const response = await page.goto('/api/health?invalid=param&malformed[]=test')
      
      // Should still return valid health data regardless of query params
      expect(response?.status()).toBe(200)
      
      const healthData = await response?.json()
      expect(healthData).toHaveProperty('status')
    })
  })
})