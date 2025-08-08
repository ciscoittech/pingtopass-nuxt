// Real-time Performance Monitoring and Alerting System
// Tracks query performance, identifies bottlenecks, and triggers alerts

interface QueryMetrics {
  query: string
  duration: number
  timestamp: number
  userId?: number
  examId?: number
  params?: any
  stackTrace?: string
  error?: string
}

interface PerformanceAlert {
  type: 'slow_query' | 'high_error_rate' | 'cache_miss_spike' | 'connection_pool_exhausted'
  severity: 'warning' | 'critical'
  message: string
  metrics: any
  timestamp: number
}

// Performance monitoring with real-time alerts
export class DatabaseMonitor {
  private queryMetrics: QueryMetrics[] = []
  private readonly maxMetricsHistory = 10000
  private alertThresholds = {
    slowQueryMs: 200,
    errorRatePercent: 5,
    cacheMissRatePercent: 70,
    connectionPoolUtilization: 80
  }
  private alertCallbacks: Array<(alert: PerformanceAlert) => void> = []

  // Record query performance
  recordQuery(metrics: QueryMetrics): void {
    this.queryMetrics.push({
      ...metrics,
      timestamp: Date.now()
    })

    // Keep only recent metrics
    if (this.queryMetrics.length > this.maxMetricsHistory) {
      this.queryMetrics = this.queryMetrics.slice(-this.maxMetricsHistory)
    }

    // Check for performance issues
    this.checkPerformanceThresholds(metrics)
  }

  // Performance threshold monitoring
  private checkPerformanceThresholds(metrics: QueryMetrics): void {
    // Slow query alert
    if (metrics.duration > this.alertThresholds.slowQueryMs) {
      this.triggerAlert({
        type: 'slow_query',
        severity: metrics.duration > this.alertThresholds.slowQueryMs * 2 ? 'critical' : 'warning',
        message: `Slow query detected: ${metrics.duration}ms`,
        metrics: {
          query: metrics.query.substring(0, 100),
          duration: metrics.duration,
          userId: metrics.userId,
          examId: metrics.examId
        },
        timestamp: Date.now()
      })
    }

    // Check error rate (last 100 queries)
    const recentMetrics = this.queryMetrics.slice(-100)
    const errorRate = recentMetrics.filter(m => m.error).length / recentMetrics.length * 100
    
    if (errorRate > this.alertThresholds.errorRatePercent) {
      this.triggerAlert({
        type: 'high_error_rate',
        severity: 'critical',
        message: `High error rate: ${errorRate.toFixed(1)}%`,
        metrics: { errorRate, sampleSize: recentMetrics.length },
        timestamp: Date.now()
      })
    }
  }

  // Trigger alert
  private triggerAlert(alert: PerformanceAlert): void {
    console.warn('Performance Alert:', alert)
    
    for (const callback of this.alertCallbacks) {
      try {
        callback(alert)
      } catch (error) {
        console.error('Alert callback failed:', error)
      }
    }
  }

  // Add alert handler
  onAlert(callback: (alert: PerformanceAlert) => void): void {
    this.alertCallbacks.push(callback)
  }

  // Get performance analytics
  getAnalytics(timeRange = 3600000): { // 1 hour default
    summary: any
    slowQueries: QueryMetrics[]
    queryPatterns: any[]
    recommendations: string[]
  } {
    const cutoff = Date.now() - timeRange
    const recentMetrics = this.queryMetrics.filter(m => m.timestamp > cutoff)
    
    if (recentMetrics.length === 0) {
      return {
        summary: {},
        slowQueries: [],
        queryPatterns: [],
        recommendations: []
      }
    }

    // Performance summary
    const durations = recentMetrics.map(m => m.duration)
    const errors = recentMetrics.filter(m => m.error)
    
    const summary = {
      totalQueries: recentMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      medianDuration: this.median(durations),
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      errorRate: errors.length / recentMetrics.length * 100,
      slowQueryCount: recentMetrics.filter(m => m.duration > this.alertThresholds.slowQueryMs).length
    }

    // Identify slow queries
    const slowQueries = recentMetrics
      .filter(m => m.duration > this.alertThresholds.slowQueryMs)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 20)

    // Query pattern analysis
    const queryPatterns = this.analyzeQueryPatterns(recentMetrics)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(summary, queryPatterns)

    return {
      summary,
      slowQueries,
      queryPatterns,
      recommendations
    }
  }

  // Analyze query patterns
  private analyzeQueryPatterns(metrics: QueryMetrics[]): any[] {
    const patterns = new Map<string, { count: number; totalDuration: number; avgDuration: number }>()
    
    for (const metric of metrics) {
      // Extract query pattern (remove specific values)
      const pattern = this.extractQueryPattern(metric.query)
      
      if (patterns.has(pattern)) {
        const existing = patterns.get(pattern)!
        existing.count++
        existing.totalDuration += metric.duration
        existing.avgDuration = existing.totalDuration / existing.count
      } else {
        patterns.set(pattern, {
          count: 1,
          totalDuration: metric.duration,
          avgDuration: metric.duration
        })
      }
    }
    
    return Array.from(patterns.entries())
      .map(([pattern, stats]) => ({ pattern, ...stats }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 10)
  }

  // Extract query pattern for analysis
  private extractQueryPattern(query: string): string {
    return query
      .replace(/\d+/g, '?') // Replace numbers with placeholders
      .replace(/'[^']*'/g, '?') // Replace string literals
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  // Generate performance recommendations
  private generateRecommendations(summary: any, patterns: any[]): string[] {
    const recommendations: string[] = []
    
    if (summary.p95Duration > 100) {
      recommendations.push('95th percentile response time exceeds 100ms - consider query optimization')
    }
    
    if (summary.errorRate > 2) {
      recommendations.push(`Error rate of ${summary.errorRate.toFixed(1)}% is high - investigate query failures`)
    }
    
    if (summary.slowQueryCount > summary.totalQueries * 0.1) {
      recommendations.push('More than 10% of queries are slow - review indexing strategy')
    }
    
    // Pattern-specific recommendations
    for (const pattern of patterns.slice(0, 3)) {
      if (pattern.avgDuration > 200) {
        recommendations.push(`Frequent slow pattern: "${pattern.pattern.substring(0, 50)}..." - avg ${pattern.avgDuration}ms`)
      }
    }
    
    return recommendations
  }

  // Utility functions
  private median(values: number[]): number {
    const sorted = values.slice().sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    return sorted.length % 2 === 0 
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid]
  }
  
  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b)
    const index = Math.ceil((p / 100) * sorted.length) - 1
    return sorted[Math.max(0, index)]
  }
}

// Query performance interceptor
export class PerformanceInterceptor {
  constructor(private monitor: DatabaseMonitor) {}

  // Wrap database operations with performance monitoring
  wrapDatabaseMethod<T extends any[], R>(
    method: (...args: T) => Promise<R>,
    context: { operation: string; table?: string }
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const startTime = performance.now()
      let error: string | undefined
      
      try {
        const result = await method(...args)
        return result
      } catch (err) {
        error = err instanceof Error ? err.message : String(err)
        throw err
      } finally {
        const duration = performance.now() - startTime
        
        this.monitor.recordQuery({
          query: `${context.operation}${context.table ? ` on ${context.table}` : ''}`,
          duration,
          timestamp: Date.now(),
          error,
          params: args.length > 0 ? args[0] : undefined
        })
      }
    }
  }
}

// Automated performance benchmarking
export class PerformanceBenchmark {
  private measurements: number[] = []
  private currentStart?: number
  
  start(): void {
    this.currentStart = performance.now()
  }
  
  end(): number {
    if (!this.currentStart) {
      throw new Error('Benchmark not started')
    }
    
    const duration = performance.now() - this.currentStart
    this.measurements.push(duration)
    this.currentStart = undefined
    
    return duration
  }
  
  getStats() {
    if (this.measurements.length === 0) {
      return { count: 0, avg: 0, min: 0, max: 0, median: 0 }
    }
    
    const sorted = this.measurements.slice().sort((a, b) => a - b)
    
    return {
      count: this.measurements.length,
      avg: this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }
  
  getAverage(): number {
    return this.measurements.length > 0 
      ? this.measurements.reduce((a, b) => a + b, 0) / this.measurements.length
      : 0
  }
  
  getMax(): number {
    return this.measurements.length > 0 
      ? Math.max(...this.measurements)
      : 0
  }
  
  reset(): void {
    this.measurements = []
  }
}

// Health check with comprehensive diagnostics
export class DatabaseHealthChecker {
  constructor(private db: any) {}

  async checkHealth(): Promise<{
    healthy: boolean
    checks: Record<string, { status: 'pass' | 'fail' | 'warn'; message: string; duration?: number }>
    recommendations: string[]
  }> {
    const checks: any = {}
    const recommendations: string[] = []

    // Basic connectivity
    try {
      const start = performance.now()
      await this.db.execute('SELECT 1')
      checks.connectivity = {
        status: 'pass',
        message: 'Database connection successful',
        duration: performance.now() - start
      }
    } catch (error) {
      checks.connectivity = {
        status: 'fail', 
        message: `Connection failed: ${error.message}`
      }
    }

    // Table availability
    try {
      const start = performance.now()
      const tables = await this.db.execute(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `)
      
      const expectedTables = ['users', 'exams', 'questions', 'user_answers', 'study_sessions']
      const tableNames = tables.map((t: any) => t.name)
      const missingTables = expectedTables.filter(t => !tableNames.includes(t))
      
      checks.tables = {
        status: missingTables.length === 0 ? 'pass' : 'fail',
        message: missingTables.length === 0 
          ? `All ${tableNames.length} tables available`
          : `Missing tables: ${missingTables.join(', ')}`,
        duration: performance.now() - start
      }
    } catch (error) {
      checks.tables = {
        status: 'fail',
        message: `Table check failed: ${error.message}`
      }
    }

    // Index utilization
    try {
      const start = performance.now()
      const indexes = await this.db.execute(`
        SELECT name, tbl_name 
        FROM sqlite_master 
        WHERE type='index' AND name NOT LIKE 'sqlite_%'
      `)
      
      checks.indexes = {
        status: indexes.length > 20 ? 'pass' : 'warn',
        message: `${indexes.length} custom indexes found`,
        duration: performance.now() - start
      }
      
      if (indexes.length < 20) {
        recommendations.push('Consider adding more indexes for query optimization')
      }
    } catch (error) {
      checks.indexes = {
        status: 'warn',
        message: `Index check failed: ${error.message}`
      }
    }

    // Query performance test
    try {
      const start = performance.now()
      await this.db.execute(`
        SELECT COUNT(*) FROM questions WHERE is_active = 1
      `)
      const duration = performance.now() - start
      
      checks.performance = {
        status: duration < 50 ? 'pass' : duration < 200 ? 'warn' : 'fail',
        message: `Sample query took ${duration.toFixed(2)}ms`,
        duration
      }
      
      if (duration > 100) {
        recommendations.push('Query performance is slower than target (<50ms for basic queries)')
      }
    } catch (error) {
      checks.performance = {
        status: 'fail',
        message: `Performance test failed: ${error.message}`
      }
    }

    // Determine overall health
    const hasFailures = Object.values(checks).some((check: any) => check.status === 'fail')
    const healthy = !hasFailures

    return {
      healthy,
      checks,
      recommendations
    }
  }
}

// Export factory for monitoring setup
export function createMonitoringSystem(db: any): {
  monitor: DatabaseMonitor
  interceptor: PerformanceInterceptor
  benchmark: PerformanceBenchmark
  healthChecker: DatabaseHealthChecker
} {
  const monitor = new DatabaseMonitor()
  const interceptor = new PerformanceInterceptor(monitor)
  const benchmark = new PerformanceBenchmark()
  const healthChecker = new DatabaseHealthChecker(db)

  // Setup basic alerting
  monitor.onAlert((alert) => {
    // In production, this would integrate with your alerting system
    console.warn(`🚨 Database Alert [${alert.severity}]: ${alert.message}`)
    
    // Could send to Slack, email, or monitoring service
    if (alert.severity === 'critical') {
      // sendCriticalAlert(alert)
    }
  })

  return {
    monitor,
    interceptor,
    benchmark,
    healthChecker
  }
}