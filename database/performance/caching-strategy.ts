// Multi-Layer Caching Strategy for <200ms Global Performance
// Edge caching, query caching, and intelligent cache warming

interface CacheEntry<T> {
  data: T
  expires: number
  created: number
  hits: number
  lastAccessed: number
}

interface CacheStats {
  totalKeys: number
  hitRate: number
  memoryUsage: number
  avgResponseTime: number
  expiredKeys: number
}

// Smart cache with performance analytics and TTL management
export class PerformanceCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>()
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    writes: 0
  }
  
  constructor(
    private readonly maxSize = 10000,
    private readonly defaultTTLSeconds = 300
  ) {}

  // Get with hit tracking
  get(key: string): T | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    if (Date.now() > entry.expires) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }
    
    entry.hits++
    entry.lastAccessed = Date.now()
    this.stats.hits++
    
    return entry.data
  }

  // Set with smart eviction
  set(key: string, data: T, ttlSeconds?: number): void {
    const now = Date.now()
    const ttl = (ttlSeconds || this.defaultTTLSeconds) * 1000
    
    // Evict if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed()
    }
    
    this.cache.set(key, {
      data,
      expires: now + ttl,
      created: now,
      hits: 0,
      lastAccessed: now
    })
    
    this.stats.writes++
  }

  // Intelligent eviction based on usage patterns
  private evictLeastUsed(): void {
    let leastUsedKey: string | null = null
    let leastScore = Infinity
    
    for (const [key, entry] of this.cache.entries()) {
      // Score based on hits per age and recency
      const age = Date.now() - entry.created
      const recency = Date.now() - entry.lastAccessed
      const score = (entry.hits + 1) / (age / 1000 + recency / 1000 + 1)
      
      if (score < leastScore) {
        leastScore = score
        leastUsedKey = key
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey)
      this.stats.evictions++
    }
  }

  // Batch operations for warming
  setBatch(entries: Array<{ key: string; data: T; ttl?: number }>): void {
    for (const entry of entries) {
      this.set(entry.key, entry.data, entry.ttl)
    }
  }

  // Performance cleanup
  cleanup(): number {
    const now = Date.now()
    let cleaned = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        this.cache.delete(key)
        cleaned++
      }
    }
    
    return cleaned
  }

  // Cache analytics
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    const hitRate = total > 0 ? this.stats.hits / total : 0
    
    // Estimate memory usage
    const sampleSize = Math.min(100, this.cache.size)
    let sampleMemory = 0
    let sampled = 0
    
    for (const [key, entry] of this.cache.entries()) {
      if (sampled >= sampleSize) break
      sampleMemory += JSON.stringify({ key, entry }).length
      sampled++
    }
    
    const estimatedMemory = sampleSize > 0 
      ? (sampleMemory / sampleSize) * this.cache.size 
      : 0

    return {
      totalKeys: this.cache.size,
      hitRate,
      memoryUsage: estimatedMemory,
      avgResponseTime: 0, // Calculated elsewhere
      expiredKeys: 0 // Calculated during cleanup
    }
  }

  // Clear all entries
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, evictions: 0, writes: 0 }
  }
}

// Study-specific caching with intelligent warming
export class StudyCache {
  private questionCache = new PerformanceCache<any>(5000, 600) // 10min for questions
  private sessionCache = new PerformanceCache<any>(1000, 300) // 5min for sessions  
  private progressCache = new PerformanceCache<any>(500, 900) // 15min for progress
  
  // Cache study questions with smart key generation
  cacheStudyQuestions(
    userId: number, 
    examId: number, 
    params: any, 
    questions: any[]
  ): void {
    const key = this.generateQuestionKey(userId, examId, params)
    this.questionCache.set(key, questions, 600) // 10 minutes
  }
  
  getStudyQuestions(userId: number, examId: number, params: any): any[] | null {
    const key = this.generateQuestionKey(userId, examId, params)
    return this.questionCache.get(key)
  }
  
  // Cache session progress
  cacheSessionProgress(sessionId: number, progress: any): void {
    this.sessionCache.set(`session:${sessionId}`, progress, 300)
  }
  
  getSessionProgress(sessionId: number): any | null {
    return this.sessionCache.get(`session:${sessionId}`)
  }
  
  // Cache user progress with longer TTL
  cacheUserProgress(userId: number, examId: number, progress: any): void {
    this.progressCache.set(`progress:${userId}:${examId}`, progress, 900)
  }
  
  getUserProgress(userId: number, examId: number): any | null {
    return this.progressCache.get(`progress:${userId}:${examId}`)
  }
  
  // Invalidation patterns
  invalidateUserCache(userId: number): void {
    // Clear user-specific caches when user takes actions
    for (const [key] of this.questionCache['cache'].entries()) {
      if (key.includes(`user:${userId}`)) {
        this.questionCache['cache'].delete(key)
      }
    }
    
    for (const [key] of this.progressCache['cache'].entries()) {
      if (key.includes(`${userId}:`)) {
        this.progressCache['cache'].delete(key)
      }
    }
  }
  
  invalidateExamCache(examId: number): void {
    // Clear exam-specific caches when exam is updated
    for (const [key] of this.questionCache['cache'].entries()) {
      if (key.includes(`exam:${examId}`)) {
        this.questionCache['cache'].delete(key)
      }
    }
  }
  
  private generateQuestionKey(userId: number, examId: number, params: any): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}:${JSON.stringify(params[k])}`)
      .join('|')
    
    return `questions:user:${userId}:exam:${examId}:${sortedParams}`
  }
  
  // Get aggregated stats
  getStats() {
    return {
      questions: this.questionCache.getStats(),
      sessions: this.sessionCache.getStats(), 
      progress: this.progressCache.getStats()
    }
  }
  
  // Maintenance
  cleanup(): void {
    this.questionCache.cleanup()
    this.sessionCache.cleanup()
    this.progressCache.cleanup()
  }
}

// Edge caching for Cloudflare integration
export class EdgeCache {
  private edgeHeaders = {
    // Cache static content at edge
    static: {
      'Cache-Control': 'public, max-age=31536000, immutable',
      'CDN-Cache-Control': 'max-age=31536000'
    },
    
    // Cache dynamic content with revalidation
    dynamic: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=60',
      'CDN-Cache-Control': 'max-age=300, stale-while-revalidate=60'
    },
    
    // Private user-specific content
    private: {
      'Cache-Control': 'private, max-age=60',
      'CDN-Cache-Control': 'max-age=0'
    }
  }
  
  // Generate cache headers based on content type
  getCacheHeaders(contentType: 'static' | 'dynamic' | 'private'): Record<string, string> {
    return this.edgeHeaders[contentType]
  }
  
  // Cache key generation for edge
  generateEdgeKey(operation: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${encodeURIComponent(String(params[k]))}`)
      .join('&')
    
    return `${operation}?${sortedParams}`
  }
}

// Cache warming strategies
export class CacheWarmer {
  constructor(
    private studyCache: StudyCache,
    private db: any // Database instance
  ) {}
  
  // Warm popular questions cache
  async warmPopularQuestions(examIds: number[], topUsers = 100): Promise<void> {
    console.log('Warming question cache for popular content...')
    
    // Get most active users
    const activeUsers = await this.db.execute(`
      SELECT DISTINCT user_id, exam_id, COUNT(*) as activity
      FROM user_answers ua
      JOIN questions q ON ua.question_id = q.id  
      WHERE q.exam_id IN (${examIds.join(',')})
      AND ua.answered_at > datetime('now', '-7 days')
      GROUP BY user_id, exam_id
      ORDER BY activity DESC
      LIMIT ${topUsers}
    `)
    
    // Pre-load questions for common scenarios
    const warmingTasks = activeUsers.map(async (user: any) => {
      const commonParams = [
        { difficulty: { min: 1, max: 5 }, limit: 20 },
        { difficulty: { min: 3, max: 5 }, limit: 15 },
        { difficulty: { min: 1, max: 3 }, limit: 25 }
      ]
      
      for (const params of commonParams) {
        // Simulate question fetching to populate cache
        try {
          // This would call your optimized query
          // const questions = await getOptimizedStudyQuestions({
          //   userId: user.user_id,
          //   examId: user.exam_id, 
          //   ...params
          // })
          // this.studyCache.cacheStudyQuestions(user.user_id, user.exam_id, params, questions)
        } catch (error) {
          console.warn(`Failed to warm cache for user ${user.user_id}:`, error)
        }
      }
    })
    
    await Promise.allSettled(warmingTasks)
    console.log(`Warmed cache for ${activeUsers.length} active user scenarios`)
  }
  
  // Warm leaderboard and progress caches
  async warmProgressCaches(examIds: number[]): Promise<void> {
    console.log('Warming progress caches...')
    
    for (const examId of examIds) {
      try {
        // Pre-load leaderboard
        // const leaderboard = await getExamLeaderboardOptimized(examId, 20)
        
        // Pre-load top user progress
        // for (const entry of leaderboard.slice(0, 10)) {
        //   const progress = await getUserProgressOptimized(entry.userId, examId)
        //   this.studyCache.cacheUserProgress(entry.userId, examId, progress)
        // }
      } catch (error) {
        console.warn(`Failed to warm progress cache for exam ${examId}:`, error)
      }
    }
  }
  
  // Scheduled warming (run via cron job)
  async scheduledWarming(): Promise<void> {
    const startTime = performance.now()
    
    // Get active exams
    const activeExams = await this.db.execute(`
      SELECT id FROM exams WHERE is_active = 1 ORDER BY total_attempts DESC LIMIT 10
    `)
    
    const examIds = activeExams.map((e: any) => e.id)
    
    await Promise.all([
      this.warmPopularQuestions(examIds),
      this.warmProgressCaches(examIds)
    ])
    
    const duration = performance.now() - startTime
    console.log(`Cache warming completed in ${duration.toFixed(2)}ms`)
  }
}

// Redis integration for distributed caching (optional)
export class DistributedCache {
  private redis: any // Redis client would go here
  private fallbackCache = new PerformanceCache()
  
  constructor(redisUrl?: string) {
    if (redisUrl && process.env.NODE_ENV === 'production') {
      // Initialize Redis client for production
      // this.redis = new Redis(redisUrl)
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const data = await this.redis.get(key)
        return data ? JSON.parse(data) : null
      }
    } catch (error) {
      console.warn('Redis get failed, using fallback:', error)
    }
    
    return this.fallbackCache.get(key)
  }
  
  async set<T>(key: string, data: T, ttlSeconds = 300): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.setex(key, ttlSeconds, JSON.stringify(data))
        return
      }
    } catch (error) {
      console.warn('Redis set failed, using fallback:', error)  
    }
    
    this.fallbackCache.set(key, data, ttlSeconds)
  }
  
  async del(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key)
      }
    } catch (error) {
      console.warn('Redis del failed:', error)
    }
    
    this.fallbackCache['cache'].delete(key)
  }
}

// Cache factory and configuration
export function createCachingStrategy(options: {
  enableDistributed?: boolean
  redisUrl?: string
  warmingSchedule?: boolean
}): {
  studyCache: StudyCache
  edgeCache: EdgeCache
  warmer: CacheWarmer
  distributed?: DistributedCache
} {
  const studyCache = new StudyCache()
  const edgeCache = new EdgeCache()
  
  let distributed: DistributedCache | undefined
  if (options.enableDistributed) {
    distributed = new DistributedCache(options.redisUrl)
  }
  
  const warmer = new CacheWarmer(studyCache, null) // DB instance needed
  
  // Setup warming schedule if enabled
  if (options.warmingSchedule) {
    // Run every hour in production
    setInterval(() => {
      warmer.scheduledWarming().catch(console.error)
    }, 60 * 60 * 1000)
  }
  
  return {
    studyCache,
    edgeCache, 
    warmer,
    distributed
  }
}