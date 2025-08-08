/**
 * Database Performance Monitoring API
 * 
 * Provides comprehensive insights into:
 * - Query performance metrics
 * - Cache hit rates and efficiency
 * - Connection pool statistics
 * - Regional database health
 * - Index utilization
 */

import { 
  getPerformanceStats, 
  resetPerformanceStats,
  getConnectionStats 
} from '~/server/utils/db'
import { replicationManager } from '~/server/utils/turso-replication'
import { cacheManager } from '~/server/utils/cache-strategy'
import { optimizedQueries } from '~/server/utils/optimized-queries'

export default defineEventHandler(async (event) => {
  try {
    // Get query parameters
    const query = getQuery(event)
    const action = query.action as string
    const reset = query.reset === 'true'
    
    // Handle reset request
    if (reset) {
      resetPerformanceStats()
      return { message: 'Performance statistics reset successfully' }
    }
    
    // Collect comprehensive performance data
    const [
      queryStats,
      connectionStats,
      replicationStats,
      cacheStats
    ] = await Promise.all([
      getPerformanceStats(),
      Promise.resolve(getConnectionStats()),
      replicationManager.getReplicationStats(),
      Promise.resolve(cacheManager.getStats())
    ])
    
    // Get database table statistics
    const tableStats = await optimizedQueries.performance.getPerformanceMetrics()
    
    // Calculate performance scores
    const performanceScore = calculatePerformanceScore({
      queryStats,
      cacheStats,
      replicationStats
    })
    
    // Generate recommendations
    const recommendations = generateRecommendations({
      queryStats,
      cacheStats,
      replicationStats,
      performanceScore
    })
    
    return {
      timestamp: new Date().toISOString(),
      
      // Overall performance metrics
      performance: {
        score: performanceScore,
        status: getPerformanceStatus(performanceScore),
        recommendations
      },
      
      // Query performance
      queries: {
        ...queryStats,
        slowQueries: queryStats.queries.filter((q: any) => q.avgTime > 50),
        fastQueries: queryStats.queries.filter((q: any) => q.avgTime <= 20),
        totalQueries: queryStats.queries.reduce((sum: number, q: any) => sum + q.count, 0)
      },
      
      // Connection pooling
      connections: {
        ...connectionStats,
        efficiency: connectionStats.activeConnections / connectionStats.maxConnections,
        utilizationPercent: Math.round(
          (connectionStats.activeConnections / connectionStats.maxConnections) * 100
        )
      },
      
      // Regional replication
      replication: {
        ...replicationStats,
        healthyRegionCount: replicationStats.healthyRegions.length,
        totalRegionCount: Object.keys(replicationStats.regions).length,
        healthPercent: Math.round(
          (replicationStats.healthyRegions.length / Object.keys(replicationStats.regions).length) * 100
        )
      },
      
      // Caching efficiency
      cache: {
        ...cacheStats,
        efficiency: {
          hitRate: cacheStats.memory.hitRate,
          memoryUtilization: cacheStats.memory.memoryUsagePercent,
          compressionRate: cacheStats.memory.compressions / 
            (cacheStats.memory.hits + cacheStats.memory.misses) || 0
        }
      },
      
      // Database table information
      tables: tableStats,
      
      // System health indicators
      health: {
        database: replicationStats.healthyRegions.includes('us-east'),
        caching: cacheStats.memory.hitRate > 0.7,
        connections: connectionStats.activeConnections > 0,
        overall: performanceScore > 80
      }
    }
    
  } catch (error) {
    console.error('Database performance monitoring failed:', error)
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to retrieve performance metrics',
      data: { error: error.message }
    })
  }
})

/**
 * Calculate overall performance score (0-100)
 */
function calculatePerformanceScore(data: {
  queryStats: any
  cacheStats: any
  replicationStats: any
}): number {
  const { queryStats, cacheStats, replicationStats } = data
  
  let score = 100
  
  // Query performance (40% weight)
  const avgQueryTime = queryStats.queries.reduce(
    (sum: number, q: any, _, arr: any[]) => sum + q.avgTime / arr.length, 0
  )
  
  if (avgQueryTime > 100) score -= 30
  else if (avgQueryTime > 50) score -= 20
  else if (avgQueryTime > 25) score -= 10
  
  // Cache hit rate (25% weight)
  const hitRate = cacheStats.memory.hitRate
  if (hitRate < 0.5) score -= 25
  else if (hitRate < 0.7) score -= 15
  else if (hitRate < 0.8) score -= 5
  
  // Regional health (20% weight)
  const healthyPercent = replicationStats.healthyRegions.length / 
    Object.keys(replicationStats.regions).length
  
  if (healthyPercent < 0.5) score -= 20
  else if (healthyPercent < 0.75) score -= 10
  else if (healthyPercent < 0.9) score -= 5
  
  // Memory usage (15% weight)
  const memoryUsage = cacheStats.memory.memoryUsagePercent
  if (memoryUsage > 90) score -= 15
  else if (memoryUsage > 80) score -= 10
  else if (memoryUsage > 70) score -= 5
  
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Get performance status based on score
 */
function getPerformanceStatus(score: number): string {
  if (score >= 90) return 'excellent'
  if (score >= 80) return 'good'
  if (score >= 60) return 'fair'
  if (score >= 40) return 'poor'
  return 'critical'
}

/**
 * Generate performance recommendations
 */
function generateRecommendations(data: {
  queryStats: any
  cacheStats: any
  replicationStats: any
  performanceScore: number
}): string[] {
  const recommendations: string[] = []
  
  // Query performance recommendations
  const slowQueries = data.queryStats.queries.filter((q: any) => q.avgTime > 50)
  if (slowQueries.length > 0) {
    recommendations.push(`Optimize ${slowQueries.length} slow queries (>50ms average)`)
    recommendations.push('Consider adding missing indexes for frequently used queries')
  }
  
  // Cache recommendations
  if (data.cacheStats.memory.hitRate < 0.7) {
    recommendations.push('Improve cache hit rate by increasing TTL for stable data')
    recommendations.push('Implement cache warming for frequently accessed data')
  }
  
  if (data.cacheStats.memory.memoryUsagePercent > 80) {
    recommendations.push('Consider increasing memory cache size or implementing better eviction')
  }
  
  // Regional health recommendations
  const unhealthyRegions = Object.keys(data.replicationStats.regions).length - 
    data.replicationStats.healthyRegions.length
  
  if (unhealthyRegions > 0) {
    recommendations.push(`${unhealthyRegions} database regions are unhealthy - check connectivity`)
  }
  
  // Connection pool recommendations
  const connectionStats = data.queryStats.connections
  if (connectionStats && connectionStats.activeConnections === connectionStats.maxConnections) {
    recommendations.push('Connection pool is at capacity - consider increasing pool size')
  }
  
  // Performance score recommendations
  if (data.performanceScore < 80) {
    recommendations.push('Overall performance below target - review query patterns and caching strategy')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Performance is optimal - continue monitoring')
  }
  
  return recommendations
}