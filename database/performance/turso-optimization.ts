// Turso Edge Optimization for <200ms Global Performance
// Advanced connection pooling, caching, and edge configuration

import { drizzle } from 'drizzle-orm/libsql'
import { createClient, type Client } from '@libsql/client'
import * as schema from '../schema'

// Performance monitoring interface
interface PerformanceMetrics {
  queryTime: number
  connectionTime: number
  cacheHits: number
  cacheMisses: number
  activeConnections: number
  queuedRequests: number
}

// Enhanced Turso client configuration for edge performance
interface TursoConfig {
  url: string
  authToken: string
  region?: string
  syncUrl?: string
  encryptionKey?: string
  readYourWrites?: boolean
  intMode?: 'number' | 'bigint'
  concurrency?: number
}

// Connection pool with health monitoring
class TursoConnectionPool {
  private connections: Client[] = []
  private healthCheck: Map<Client, boolean> = new Map()
  private lastUsed: Map<Client, number> = new Map()
  private readonly maxConnections: number
  private readonly config: TursoConfig
  private metrics: PerformanceMetrics
  
  constructor(config: TursoConfig, maxConnections = 10) {
    this.config = config
    this.maxConnections = maxConnections
    this.metrics = {
      queryTime: 0,
      connectionTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      activeConnections: 0,
      queuedRequests: 0
    }
  }

  // Create optimized Turso client
  private createOptimizedClient(): Client {
    return createClient({
      url: this.config.url,
      authToken: this.config.authToken,
      
      // Edge optimization settings
      syncUrl: this.config.syncUrl || this.config.url,
      encryptionKey: this.config.encryptionKey,
      
      // Performance settings
      intMode: 'number', // Faster than bigint for our use case
      concurrency: this.config.concurrency || 20,
      
      // Connection settings for edge runtime
      syncInterval: process.env.NODE_ENV === 'production' ? 300 : 60, // 5min prod, 1min dev
      
      // Read-your-writes consistency for critical operations
      readYourWrites: this.config.readYourWrites ?? true
    })
  }

  // Get connection with load balancing
  async getConnection(): Promise<Client> {
    this.metrics.queuedRequests++
    
    try {
      // Find least recently used healthy connection
      let bestConnection: Client | null = null
      let oldestTime = Date.now()
      
      for (const conn of this.connections) {
        if (this.healthCheck.get(conn) !== false) {
          const lastUsed = this.lastUsed.get(conn) || 0
          if (lastUsed < oldestTime) {
            bestConnection = conn
            oldestTime = lastUsed
          }
        }
      }
      
      // Create new connection if needed and under limit
      if (!bestConnection && this.connections.length < this.maxConnections) {
        const startTime = performance.now()
        bestConnection = this.createOptimizedClient()
        this.connections.push(bestConnection)
        this.healthCheck.set(bestConnection, true)
        this.metrics.connectionTime = performance.now() - startTime
      }
      
      // Fall back to round-robin if all connections are busy
      if (!bestConnection) {
        const index = Math.floor(Math.random() * this.connections.length)
        bestConnection = this.connections[index]
      }
      
      if (bestConnection) {
        this.lastUsed.set(bestConnection, Date.now())
        this.metrics.activeConnections++
      }
      
      return bestConnection || this.createOptimizedClient()
      
    } finally {
      this.metrics.queuedRequests--
    }
  }

  // Release connection back to pool
  releaseConnection(connection: Client) {
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1)
    this.lastUsed.set(connection, Date.now())
  }

  // Health check for connections
  async healthCheck(): Promise<void> {
    const healthPromises = this.connections.map(async (conn) => {
      try {
        await conn.execute('SELECT 1')
        this.healthCheck.set(conn, true)
      } catch (error) {
        console.warn('Connection health check failed:', error)
        this.healthCheck.set(conn, false)
      }
    })
    
    await Promise.all(healthPromises)
  }

  // Get performance metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  // Cleanup connections
  async cleanup(): Promise<void> {
    for (const conn of this.connections) {
      try {
        await conn.close()
      } catch (error) {
        console.warn('Error closing connection:', error)
      }
    }
    this.connections = []
    this.healthCheck.clear()
    this.lastUsed.clear()
  }
}

// Query result caching with TTL
class QueryCache {
  private cache = new Map<string, { data: any; expires: number }>()
  private readonly defaultTTL: number

  constructor(defaultTTLSeconds = 300) { // 5 minutes default
    this.defaultTTL = defaultTTLSeconds * 1000
  }

  // Generate cache key from query and params
  private generateKey(query: string, params?: any[]): string {
    const paramStr = params ? JSON.stringify(params) : ''
    return `${query}:${paramStr}`
  }

  // Get cached result
  get(query: string, params?: any[]): any | null {
    const key = this.generateKey(query, params)
    const cached = this.cache.get(key)
    
    if (!cached) return null
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key)
      return null
    }
    
    return cached.data
  }

  // Set cached result with TTL
  set(query: string, data: any, params?: any[], ttlSeconds?: number): void {
    const key = this.generateKey(query, params)
    const ttl = (ttlSeconds || this.defaultTTL / 1000) * 1000
    
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl
    })
  }

  // Clear expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expires) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    const expired = Array.from(this.cache.values()).filter(v => now > v.expires).length
    
    return {
      totalEntries: this.cache.size,
      expiredEntries: expired,
      memoryUsage: JSON.stringify([...this.cache.entries()]).length
    }
  }
}

// Edge-optimized database class
export class EdgeOptimizedDatabase {
  private pool: TursoConnectionPool
  private cache: QueryCache
  private db: ReturnType<typeof drizzle>
  
  constructor(config: TursoConfig) {
    this.pool = new TursoConnectionPool(config, 
      process.env.NODE_ENV === 'production' ? 10 : 5
    )
    this.cache = new QueryCache(300) // 5 minute cache
    
    // Create primary database instance
    const client = this.pool.getConnection()
    this.db = drizzle(client, { 
      schema,
      logger: process.env.NODE_ENV === 'development'
    })
  }

  // Execute query with caching and performance monitoring
  async execute<T = any>(
    query: string, 
    params?: any[], 
    options: { 
      cache?: boolean, 
      ttl?: number,
      priority?: 'high' | 'normal' | 'low'
    } = {}
  ): Promise<T> {
    const startTime = performance.now()
    
    // Check cache first for read queries
    if (options.cache !== false && query.trim().toLowerCase().startsWith('select')) {
      const cached = this.cache.get(query, params)
      if (cached !== null) {
        this.pool.getMetrics().cacheHits++
        return cached
      }
      this.pool.getMetrics().cacheMisses++
    }
    
    try {
      const connection = await this.pool.getConnection()
      const result = await connection.execute(query, params || [])
      
      // Cache SELECT results
      if (options.cache !== false && query.trim().toLowerCase().startsWith('select')) {
        this.cache.set(query, result, params, options.ttl)
      }
      
      this.pool.releaseConnection(connection)
      this.pool.getMetrics().queryTime = performance.now() - startTime
      
      return result as T
      
    } catch (error) {
      console.error('Database query failed:', { query, params, error })
      throw error
    }
  }

  // Optimized batch operations
  async batch(statements: Array<{ sql: string; args?: any[] }>): Promise<any[]> {
    const connection = await this.pool.getConnection()
    
    try {
      // Use transaction for batch operations
      const results = await connection.batch(statements.map(stmt => ({
        sql: stmt.sql,
        args: stmt.args || []
      })))
      
      return results
    } finally {
      this.pool.releaseConnection(connection)
    }
  }

  // Transaction with connection reuse
  async transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const connection = await this.pool.getConnection()
    
    try {
      return await connection.transaction(fn)
    } finally {
      this.pool.releaseConnection(connection)
    }
  }

  // Get performance metrics
  getMetrics() {
    return {
      pool: this.pool.getMetrics(),
      cache: this.cache.getStats()
    }
  }

  // Maintenance operations
  async maintenance() {
    await this.pool.healthCheck()
    this.cache.cleanup()
    
    // Run SQLite optimization
    await this.execute('PRAGMA optimize')
  }

  // Cleanup resources
  async cleanup() {
    await this.pool.cleanup()
  }
}

// Edge-specific configuration based on region
export function getEdgeConfig(region?: string): TursoConfig {
  const baseUrl = process.env.TURSO_DATABASE_URL || ''
  const authToken = process.env.TURSO_AUTH_TOKEN || ''
  
  // Region-specific optimizations
  const regionConfig = {
    'us-east-1': { syncInterval: 30, concurrency: 25 },
    'eu-west-1': { syncInterval: 45, concurrency: 20 },
    'ap-southeast-1': { syncInterval: 60, concurrency: 15 },
    default: { syncInterval: 60, concurrency: 20 }
  }
  
  const config = regionConfig[region || 'default'] || regionConfig.default
  
  return {
    url: baseUrl,
    authToken,
    region,
    readYourWrites: true,
    concurrency: config.concurrency,
    intMode: 'number'
  }
}

// Create optimized database instance
export function createEdgeDatabase(region?: string): EdgeOptimizedDatabase {
  const config = getEdgeConfig(region)
  return new EdgeOptimizedDatabase(config)
}

// Connection health monitoring  
export async function monitorDatabaseHealth(db: EdgeOptimizedDatabase): Promise<{
  healthy: boolean
  metrics: any
  recommendations: string[]
}> {
  const startTime = performance.now()
  const recommendations: string[] = []
  
  try {
    // Test basic connectivity
    await db.execute('SELECT 1')
    
    const metrics = db.getMetrics()
    const responseTime = performance.now() - startTime
    
    // Performance analysis
    if (responseTime > 200) {
      recommendations.push('Consider adding more database replicas closer to users')
    }
    
    if (metrics.cache.expiredEntries > metrics.cache.totalEntries * 0.3) {
      recommendations.push('Consider reducing cache TTL or increasing cleanup frequency')  
    }
    
    if (metrics.pool.queuedRequests > 5) {
      recommendations.push('Consider increasing connection pool size')
    }
    
    return {
      healthy: responseTime < 500, // Healthy if under 500ms
      metrics: {
        ...metrics,
        responseTime,
        timestamp: new Date().toISOString()
      },
      recommendations
    }
    
  } catch (error) {
    return {
      healthy: false,
      metrics: { error: error.message },
      recommendations: ['Check database connectivity and credentials']
    }
  }
}