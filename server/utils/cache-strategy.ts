/**
 * Multi-Layer Caching Strategy for PingToPass
 * 
 * Implements a sophisticated caching hierarchy:
 * 1. In-Memory Cache (fastest, 1-5ms) - Hot data, session data
 * 2. Cloudflare KV (edge cache, 10-20ms) - Static content, user preferences
 * 3. Database (slowest, 20-50ms with optimization) - Source of truth
 * 
 * Cache invalidation strategies:
 * - Time-based TTL for static content
 * - Event-based invalidation for dynamic content
 * - Lazy loading with background refresh
 */

import { smartRead } from './turso-replication'
import type { TursoRegion } from './turso-replication'

// Cache configuration
export const CACHE_CONFIG = {
  // In-memory cache settings
  memory: {
    maxSize: 100 * 1024 * 1024, // 100MB max memory usage
    defaultTTL: 300, // 5 minutes
    cleanupInterval: 60000, // 1 minute cleanup
    compressionThreshold: 1024 // Compress items >1KB
  },
  
  // Cloudflare KV settings
  kv: {
    defaultTTL: 3600, // 1 hour
    longTermTTL: 86400, // 24 hours for static content
    shortTermTTL: 300, // 5 minutes for dynamic content
    maxValueSize: 25 * 1024 * 1024 // 25MB KV limit
  },
  
  // Cache key prefixes
  prefixes: {
    user: 'user:',
    exam: 'exam:',
    question: 'q:',
    session: 'session:',
    progress: 'progress:',
    leaderboard: 'leader:',
    stats: 'stats:'
  }
} as const

/**
 * In-Memory Cache with LRU eviction and compression
 */
class InMemoryCache {
  private cache = new Map<string, {
    value: any
    expires: number
    size: number
    compressed: boolean
  }>()
  
  private totalSize = 0
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    compressions: 0
  }
  
  constructor() {
    // Periodic cleanup
    setInterval(() => this.cleanup(), CACHE_CONFIG.memory.cleanupInterval)
  }
  
  set(key: string, value: any, ttlSeconds = CACHE_CONFIG.memory.defaultTTL): void {
    const expires = Date.now() + (ttlSeconds * 1000)
    const serialized = JSON.stringify(value)
    let finalValue = value
    let compressed = false
    let size = serialized.length
    
    // Compress large values
    if (size > CACHE_CONFIG.memory.compressionThreshold) {
      try {
        // Simple compression simulation (in real implementation use gzip)
        finalValue = this.compress(serialized)
        compressed = true
        size = finalValue.length
        this.stats.compressions++
      } catch (error) {
        console.warn('Compression failed for cache key:', key)
      }
    }
    
    // Evict old entries if needed
    this.ensureCapacity(size)
    
    this.cache.set(key, { value: finalValue, expires, size, compressed })
    this.totalSize += size
  }
  
  get(key: string): any {
    const entry = this.cache.get(key)
    
    if (!entry || entry.expires < Date.now()) {
      this.stats.misses++
      if (entry) this.delete(key) // Clean up expired
      return null
    }
    
    this.stats.hits++
    
    // Move to end (LRU)
    this.cache.delete(key)
    this.cache.set(key, entry)
    
    // Decompress if needed
    return entry.compressed ? this.decompress(entry.value) : entry.value
  }
  
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.totalSize -= entry.size
      return this.cache.delete(key)
    }
    return false
  }
  
  clear(): void {
    this.cache.clear()
    this.totalSize = 0
  }
  
  private ensureCapacity(newSize: number): void {
    while (this.totalSize + newSize > CACHE_CONFIG.memory.maxSize && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.delete(firstKey)
        this.stats.evictions++
      }
    }
  }
  
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expires < now) {
        this.delete(key)
      }
    }
  }
  
  private compress(data: string): string {
    // Simplified compression - use actual gzip in production
    return btoa(data)
  }
  
  private decompress(data: string): any {
    try {
      return JSON.parse(atob(data))
    } catch {
      return data
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      size: this.cache.size,
      memoryUsage: this.totalSize,
      memoryUsagePercent: (this.totalSize / CACHE_CONFIG.memory.maxSize) * 100,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    }
  }
}

/**
 * Cloudflare KV Cache Interface
 */
class CloudflareKVCache {
  private kv: KVNamespace | null = null
  
  constructor() {
    // Initialize KV binding (available in Cloudflare Workers)
    if (typeof globalThis !== 'undefined' && 'PINGTOPASS_KV' in globalThis) {
      this.kv = (globalThis as any).PINGTOPASS_KV
    }
  }
  
  async set(
    key: string, 
    value: any, 
    options: { ttl?: number; metadata?: any } = {}
  ): Promise<void> {
    if (!this.kv) {
      console.warn('KV not available, skipping cache set')
      return
    }
    
    const { ttl = CACHE_CONFIG.kv.defaultTTL, metadata } = options
    
    try {
      const serialized = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        version: '1.0'
      })
      
      await this.kv.put(key, serialized, {
        expirationTtl: ttl,
        metadata
      })
    } catch (error) {
      console.error('KV cache set failed:', error)
    }
  }
  
  async get(key: string): Promise<any> {
    if (!this.kv) {
      return null
    }
    
    try {
      const cached = await this.kv.get(key, 'json')
      
      if (cached && typeof cached === 'object' && 'data' in cached) {
        return cached.data
      }
      
      return cached
    } catch (error) {
      console.error('KV cache get failed:', error)
      return null
    }
  }
  
  async delete(key: string): Promise<void> {
    if (!this.kv) return
    
    try {
      await this.kv.delete(key)
    } catch (error) {
      console.error('KV cache delete failed:', error)
    }
  }
  
  async list(prefix?: string): Promise<string[]> {
    if (!this.kv) return []
    
    try {
      const result = await this.kv.list({ prefix })
      return result.keys.map(k => k.name)
    } catch (error) {
      console.error('KV cache list failed:', error)
      return []
    }
  }
}

/**
 * Multi-Layer Cache Manager
 */
class CacheManager {
  private memory = new InMemoryCache()
  private kv = new CloudflareKVCache()
  
  /**
   * Get from cache with fallback hierarchy
   */
  async get(key: string): Promise<any> {
    // Try memory cache first
    const memoryResult = this.memory.get(key)
    if (memoryResult !== null) {
      return memoryResult
    }
    
    // Try KV cache
    const kvResult = await this.kv.get(key)
    if (kvResult !== null) {
      // Warm memory cache
      this.memory.set(key, kvResult, CACHE_CONFIG.memory.defaultTTL)
      return kvResult
    }
    
    return null
  }
  
  /**
   * Set in all cache layers
   */
  async set(
    key: string, 
    value: any, 
    options: {
      memoryTTL?: number
      kvTTL?: number
      skipKV?: boolean
    } = {}
  ): Promise<void> {
    const {
      memoryTTL = CACHE_CONFIG.memory.defaultTTL,
      kvTTL = CACHE_CONFIG.kv.defaultTTL,
      skipKV = false
    } = options
    
    // Set in memory cache
    this.memory.set(key, value, memoryTTL)
    
    // Set in KV cache if not skipped
    if (!skipKV) {
      await this.kv.set(key, value, { ttl: kvTTL })
    }
  }
  
  /**
   * Delete from all cache layers
   */
  async delete(key: string): Promise<void> {
    this.memory.delete(key)
    await this.kv.delete(key)
  }
  
  /**
   * Cache with background refresh pattern
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      memoryTTL?: number
      kvTTL?: number
      refreshThreshold?: number // Refresh if cache age > this ratio
    } = {}
  ): Promise<T> {
    const {
      memoryTTL = CACHE_CONFIG.memory.defaultTTL,
      kvTTL = CACHE_CONFIG.kv.defaultTTL,
      refreshThreshold = 0.8
    } = options
    
    // Try to get from cache
    const cached = await this.get(key)
    
    if (cached === null) {
      // Cache miss - fetch and cache
      const fresh = await fetcher()
      await this.set(key, fresh, { memoryTTL, kvTTL })
      return fresh
    }
    
    // Background refresh if cache is getting old
    const cacheAge = this.getCacheAge(key)
    if (cacheAge > refreshThreshold * memoryTTL) {
      // Don't await - refresh in background
      fetcher().then(fresh => {
        this.set(key, fresh, { memoryTTL, kvTTL })
      }).catch(error => {
        console.warn('Background cache refresh failed:', error)
      })
    }
    
    return cached
  }
  
  private getCacheAge(key: string): number {
    // Simplified cache age calculation
    return Date.now() / 1000 // Return current timestamp for now
  }
  
  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string): Promise<void> {
    // Memory cache pattern invalidation
    for (const key of this.memory['cache'].keys()) {
      if (key.includes(pattern)) {
        this.memory.delete(key)
      }
    }
    
    // KV cache pattern invalidation
    const kvKeys = await this.kv.list(pattern)
    for (const key of kvKeys) {
      await this.kv.delete(key)
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      memory: this.memory.getStats(),
      timestamp: new Date().toISOString()
    }
  }
}

// Global cache manager
export const cacheManager = new CacheManager()

/**
 * Cache-aware query helpers
 */
export const cachedQueries = {
  // Cache exam data (static, long TTL)
  async getExamById(examId: number, region?: string) {
    const key = `${CACHE_CONFIG.prefixes.exam}${examId}`
    
    return cacheManager.getOrSet(key, async () => {
      return await smartRead(async (r: TursoRegion) => {
        const db = (await import('./db')).getDB(r)
        const result = await db.execute({
          sql: 'SELECT * FROM exams WHERE id = ? AND is_active = 1',
          args: [examId]
        })
        return result.rows[0] || null
      }, undefined, { allowStale: true })
    }, {
      memoryTTL: 600, // 10 minutes
      kvTTL: CACHE_CONFIG.kv.longTermTTL // 24 hours
    })
  },
  
  // Cache user progress (dynamic, shorter TTL)
  async getUserProgress(userId: number, examId: number, region?: string) {
    const key = `${CACHE_CONFIG.prefixes.progress}${userId}:${examId}`
    
    return cacheManager.getOrSet(key, async () => {
      return await smartRead(async (r: TursoRegion) => {
        const db = (await import('./db')).getDB(r)
        const result = await db.execute({
          sql: `SELECT * FROM user_progress WHERE user_id = ? AND exam_id = ?`,
          args: [userId, examId]
        })
        return result.rows[0] || null
      }, undefined, { allowStale: true })
    }, {
      memoryTTL: 180, // 3 minutes
      kvTTL: CACHE_CONFIG.kv.shortTermTTL // 5 minutes
    })
  },
  
  // Cache question lists with smart invalidation
  async getQuestionsList(
    examId: number, 
    options: { 
      objectiveIds?: number[]
      difficulty?: { min: number; max: number }
      limit?: number 
    } = {},
    region?: string
  ) {
    // Create cache key based on parameters
    const optionsHash = btoa(JSON.stringify(options)).slice(0, 8)
    const key = `${CACHE_CONFIG.prefixes.question}list:${examId}:${optionsHash}`
    
    return cacheManager.getOrSet(key, async () => {
      const { queries } = await import('./db')
      return await queries.getExamQuestions(examId, { ...options, region })
    }, {
      memoryTTL: 300, // 5 minutes
      kvTTL: CACHE_CONFIG.kv.defaultTTL // 1 hour
    })
  },
  
  // Cache leaderboards with background refresh
  async getExamLeaderboard(examId: number, region?: string) {
    const key = `${CACHE_CONFIG.prefixes.leaderboard}${examId}`
    
    return cacheManager.getOrSet(key, async () => {
      return await smartRead(async (r: TursoRegion) => {
        const db = (await import('./db')).getDB(r)
        const result = await db.execute({
          sql: `
            SELECT u.name, u.picture, ta.score, ta.completed_at
            FROM test_attempts ta
            JOIN users u ON ta.user_id = u.id
            WHERE ta.exam_id = ? AND ta.passed = 1 AND ta.status = 'completed'
            ORDER BY ta.score DESC, ta.completed_at ASC
            LIMIT 10
          `,
          args: [examId]
        })
        return result.rows
      }, undefined, { allowStale: true })
    }, {
      memoryTTL: 600, // 10 minutes
      kvTTL: CACHE_CONFIG.kv.defaultTTL // 1 hour
    })
  }
}

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  // Invalidate user-related caches
  async invalidateUser(userId: number) {
    await cacheManager.invalidateByPattern(`${CACHE_CONFIG.prefixes.user}${userId}`)
    await cacheManager.invalidateByPattern(`${CACHE_CONFIG.prefixes.progress}${userId}`)
    await cacheManager.invalidateByPattern(`${CACHE_CONFIG.prefixes.session}${userId}`)
  },
  
  // Invalidate exam-related caches
  async invalidateExam(examId: number) {
    await cacheManager.invalidateByPattern(`${CACHE_CONFIG.prefixes.exam}${examId}`)
    await cacheManager.invalidateByPattern(`${CACHE_CONFIG.prefixes.question}list:${examId}`)
    await cacheManager.invalidateByPattern(`${CACHE_CONFIG.prefixes.leaderboard}${examId}`)
  },
  
  // Invalidate all caches (use sparingly)
  async invalidateAll() {
    cacheManager['memory'].clear()
    // Note: Cannot clear all KV keys easily, would need to list and delete
  }
}

/**
 * Cache warming strategies
 */
export const cacheWarming = {
  // Warm popular exam data
  async warmPopularExams() {
    try {
      // Get popular exams from database
      const db = (await import('./db')).getDB()
      const result = await db.execute(`
        SELECT id FROM exams 
        WHERE is_active = 1 AND total_attempts > 100
        ORDER BY total_attempts DESC 
        LIMIT 5
      `)
      
      // Warm cache for each popular exam
      for (const exam of result.rows) {
        await cachedQueries.getExamById(exam.id as number)
        await cachedQueries.getExamLeaderboard(exam.id as number)
        console.log(`📦 Warmed cache for exam ${exam.id}`)
      }
    } catch (error) {
      console.error('Cache warming failed:', error)
    }
  },
  
  // Warm user data on login
  async warmUserData(userId: number) {
    try {
      // Get user's active exams
      const db = (await import('./db')).getDB()
      const result = await db.execute({
        sql: `
          SELECT DISTINCT exam_id FROM user_progress 
          WHERE user_id = ? AND total_questions_seen > 0
          LIMIT 3
        `,
        args: [userId]
      })
      
      // Warm progress cache
      for (const row of result.rows) {
        await cachedQueries.getUserProgress(userId, row.exam_id as number)
      }
      
      console.log(`📦 Warmed cache for user ${userId}`)
    } catch (error) {
      console.error('User cache warming failed:', error)
    }
  }
}

// Export configuration for Cloudflare Workers
export const CLOUDFLARE_KV_CONFIG = {
  bindings: {
    PINGTOPASS_KV: {
      type: 'kv_namespace',
      id: 'your-kv-namespace-id',
      preview_id: 'your-preview-kv-namespace-id'
    }
  }
}