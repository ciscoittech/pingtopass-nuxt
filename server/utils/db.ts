import { createClient, type Client } from '@libsql/client'

// Safe runtime config getter that works in both Nuxt and standalone contexts
function getRuntimeConfig() {
  try {
    // In Nuxt server context
    if (typeof useRuntimeConfig === 'function') {
      return useRuntimeConfig()
    }
  } catch (error) {
    // Ignore and fall through to environment variables
  }
  
  // Fallback to environment variables
  return {
    tursoUrl: process.env.TURSO_DATABASE_URL,
    tursoToken: process.env.TURSO_AUTH_TOKEN
  }
}

// Environment types for database configuration
export type DatabaseEnvironment = 'development' | 'production' | 'test' | 'staging'

interface DatabaseConfig {
  url: string
  authToken: string
  syncInterval: number
  syncPeriod: number
  environment: DatabaseEnvironment
}

// Connection pool for edge performance optimization
class TursoConnectionPool {
  private connections: Map<string, Client> = new Map()
  private config: any = null
  private maxConnections = 10
  private connectionTimeout = 30000 // 30s timeout
  private currentEnvironment: DatabaseEnvironment

  constructor() {
    // Initialize runtime config if available
    this.initializeConfig()
    // Determine environment
    this.currentEnvironment = this.detectEnvironment()
    console.log(`🌍 Database environment: ${this.currentEnvironment}`)
  }

  private initializeConfig() {
    this.config = getRuntimeConfig()
  }

  private detectEnvironment(): DatabaseEnvironment {
    // Check for explicit test environment
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
      return 'test'
    }
    
    // Check for production
    if (process.env.NODE_ENV === 'production') {
      return 'production'
    }
    
    // Check for staging
    if (process.env.NODE_ENV === 'staging' || process.env.DEPLOY_ENV === 'staging') {
      return 'staging'
    }
    
    // Default to development
    return 'development'
  }

  private getDatabaseConfig(): DatabaseConfig {
    const env = this.currentEnvironment
    
    // Test environment uses shared temporary database
    if (env === 'test') {
      return {
        url: 'file:/tmp/pingtopass-test.db',
        authToken: '',
        syncInterval: 0,
        syncPeriod: 0,
        environment: 'test'
      }
    }
    
    // Production configuration
    if (env === 'production') {
      const prodUrl = process.env.TURSO_DATABASE_URL_PROD || this.config.tursoUrl
      const prodToken = process.env.TURSO_AUTH_TOKEN_PROD || this.config.tursoToken
      
      if (!prodUrl || !prodToken) {
        throw new Error('Production Turso configuration missing - check TURSO_DATABASE_URL_PROD and TURSO_AUTH_TOKEN_PROD')
      }
      
      return {
        url: prodUrl,
        authToken: prodToken,
        syncInterval: 15, // More frequent sync for production
        syncPeriod: 3,    // Lower latency tolerance
        environment: 'production'
      }
    }
    
    // Staging configuration
    if (env === 'staging') {
      const stagingUrl = process.env.TURSO_DATABASE_URL_STAGING || process.env.TURSO_DATABASE_URL_PROD || this.config.tursoUrl
      const stagingToken = process.env.TURSO_AUTH_TOKEN_STAGING || process.env.TURSO_AUTH_TOKEN_PROD || this.config.tursoToken
      
      if (!stagingUrl || !stagingToken) {
        throw new Error('Staging Turso configuration missing - check TURSO_DATABASE_URL_STAGING and TURSO_AUTH_TOKEN_STAGING')
      }
      
      return {
        url: stagingUrl,
        authToken: stagingToken,
        syncInterval: 30,
        syncPeriod: 5,
        environment: 'staging'
      }
    }
    
    // Development configuration (default)
    const devUrl = process.env.TURSO_DATABASE_URL_DEV || this.config.tursoUrl
    const devToken = process.env.TURSO_AUTH_TOKEN_DEV || this.config.tursoToken
    
    if (!devUrl || !devToken) {
      console.warn('Development Turso configuration missing - falling back to runtime config')
      if (!this.config.tursoUrl || !this.config.tursoToken) {
        throw new Error('Turso configuration missing - check environment variables or runtime config')
      }
    }
    
    return {
      url: devUrl || this.config.tursoUrl,
      authToken: devToken || this.config.tursoToken,
      syncInterval: 60, // Less frequent sync for development
      syncPeriod: 10,   // Higher latency tolerance
      environment: 'development'
    }
  }

  /**
   * Set environment for testing purposes
   */
  public setEnvironment(env: DatabaseEnvironment) {
    if (this.currentEnvironment !== env) {
      console.log(`🔄 Switching database environment from ${this.currentEnvironment} to ${env}`)
      this.currentEnvironment = env
      // Clear existing connections to force reconnection with new config
      this.closeAll()
    }
  }

  private createConnection(region?: string): Client {
    const dbConfig = this.getDatabaseConfig()
    const connectionKey = `${dbConfig.environment}-${region || 'primary'}`
    
    // Always return existing connection if available
    if (this.connections.has(connectionKey)) {
      return this.connections.get(connectionKey)!
    }

    // For test environment, create simple in-memory client
    if (dbConfig.environment === 'test') {
      const client = createClient({
        url: dbConfig.url,
        authToken: dbConfig.authToken,
        intMode: 'number'
      })
      
      this.connections.set(connectionKey, client)
      console.log(`🧪 Created test database connection: ${connectionKey}`)
      return client
    }

    // For remote databases (dev, staging, prod)
    const client = createClient({
      url: dbConfig.url,
      authToken: dbConfig.authToken,
      // Connection optimization
      intMode: 'number'
    })

    this.connections.set(connectionKey, client)
    
    console.log(`✅ Created Turso connection [${dbConfig.environment}]: ${connectionKey} (${this.connections.size}/${this.maxConnections})`)
    return client
  }

  public getConnection(region?: string): Client {
    return this.createConnection(region)
  }

  public async closeAll(): Promise<void> {
    for (const [key, client] of this.connections) {
      try {
        await client.close()
        console.log(`🔒 Closed connection: ${key}`)
      } catch (error) {
        console.warn(`Failed to close connection ${key}:`, error)
      }
    }
    this.connections.clear()
  }

  public getStats() {
    return {
      activeConnections: this.connections.size,
      maxConnections: this.maxConnections,
      regions: Array.from(this.connections.keys())
    }
  }
}

// Global connection pool instance
let connectionPool: TursoConnectionPool | null = null

export function getDB(region?: string): Client {
  if (!connectionPool) {
    connectionPool = new TursoConnectionPool()
    
    // Cleanup on process exit
    if (typeof process !== 'undefined') {
      process.on('exit', () => connectionPool?.closeAll())
      process.on('SIGINT', () => connectionPool?.closeAll())
      process.on('SIGTERM', () => connectionPool?.closeAll())
    }
  }
  
  return connectionPool.getConnection(region)
}

export function getConnectionStats() {
  return connectionPool?.getStats() || { activeConnections: 0, maxConnections: 0, regions: [] }
}

/**
 * Set database environment (for testing)
 */
export function setDatabaseEnvironment(env: DatabaseEnvironment) {
  if (!connectionPool) {
    connectionPool = new TursoConnectionPool()
  }
  connectionPool.setEnvironment(env)
}

/**
 * Get current database environment
 */
export function getDatabaseEnvironment(): DatabaseEnvironment {
  if (!connectionPool) {
    connectionPool = new TursoConnectionPool()
  }
  return connectionPool['currentEnvironment'] // Access private property
}

// Performance monitoring wrapper
class QueryPerformanceMonitor {
  private slowQueryThreshold = 50 // ms
  private queryStats: Map<string, { count: number; totalTime: number; maxTime: number }> = new Map()

  public async executeWithMonitoring<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await queryFn()
      const executionTime = Date.now() - startTime
      
      // Update statistics
      this.updateQueryStats(queryName, executionTime)
      
      // Log slow queries
      if (executionTime > this.slowQueryThreshold) {
        console.warn(`🐌 Slow Query [${queryName}]: ${executionTime}ms`)
      }
      
      return result
    } catch (error) {
      const executionTime = Date.now() - startTime
      console.error(`❌ Query Failed [${queryName}]: ${executionTime}ms`, error)
      throw error
    }
  }

  private updateQueryStats(queryName: string, executionTime: number) {
    const stats = this.queryStats.get(queryName) || { count: 0, totalTime: 0, maxTime: 0 }
    stats.count++
    stats.totalTime += executionTime
    stats.maxTime = Math.max(stats.maxTime, executionTime)
    this.queryStats.set(queryName, stats)
  }

  public getQueryStats() {
    const stats = Array.from(this.queryStats.entries()).map(([query, data]) => ({
      query,
      count: data.count,
      avgTime: Math.round(data.totalTime / data.count),
      maxTime: data.maxTime,
      totalTime: data.totalTime
    }))

    return stats.sort((a, b) => b.avgTime - a.avgTime)
  }

  public resetStats() {
    this.queryStats.clear()
  }
}

// Global performance monitor
const performanceMonitor = new QueryPerformanceMonitor()

// Health check utility with comprehensive monitoring
export async function checkDBHealth(region?: string) {
  const startTime = Date.now()
  
  try {
    const db = getDB(region)
    const result = await db.execute("SELECT 1 as health, datetime('now') as timestamp")
    const latency = Date.now() - startTime
    
    return { 
      healthy: true, 
      latency,
      timestamp: result.rows[0]?.timestamp,
      region: region || 'primary',
      connectionStats: getConnectionStats()
    }
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      healthy: false,
      latency,
      error: error.message,
      timestamp: new Date().toISOString(),
      region: region || 'primary',
      connectionStats: getConnectionStats()
    }
  }
}

// Get performance statistics
export function getPerformanceStats() {
  return {
    queries: performanceMonitor.getQueryStats(),
    connections: getConnectionStats(),
    timestamp: new Date().toISOString()
  }
}

// Reset performance statistics
export function resetPerformanceStats() {
  performanceMonitor.resetStats()
}

// Connection test utility
export async function testConnection() {
  try {
    const db = getDB()
    
    // Test basic connectivity
    await db.execute('SELECT 1')
    console.log('✅ Database connection test passed')
    
    // Test table existence
    const tables = await db.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `)
    
    console.log('📊 Available tables:', tables.rows.map(r => r.name))
    
    return {
      success: true,
      tables: tables.rows.map(r => r.name),
      message: 'Database connection and schema validated'
    }
  } catch (error) {
    console.error('❌ Database connection test failed:', error)
    return {
      success: false,
      error: error.message,
      message: 'Database connection failed'
    }
  }
}

// Performance monitoring utilities
export async function getQueryStats() {
  try {
    const db = getDB()
    
    // Get table row counts
    const stats = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM users'),
      db.execute('SELECT COUNT(*) as count FROM exams'),
      db.execute('SELECT COUNT(*) as count FROM questions'),
      db.execute('SELECT COUNT(*) as count FROM study_sessions')
    ])
    
    return {
      users: stats[0].rows[0]?.count || 0,
      exams: stats[1].rows[0]?.count || 0,
      questions: stats[2].rows[0]?.count || 0,
      study_sessions: stats[3].rows[0]?.count || 0
    }
  } catch (error) {
    console.error('Failed to get query stats:', error)
    return null
  }
}

// Optimized query helpers with performance monitoring
export const queries = {
  // User operations
  getUserByEmail: (email: string, region?: string) => 
    performanceMonitor.executeWithMonitoring('get_user_by_email', () =>
      getDB(region).execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email] })
    ),
  
  // Exam operations  
  getActiveExams: (region?: string) =>
    performanceMonitor.executeWithMonitoring('get_active_exams', () =>
      getDB(region).execute(
        `SELECT id, vendor_id, code, name, description, question_count, time_limit_minutes, pass_rate, total_attempts
         FROM exams 
         WHERE is_active = 1 AND is_beta = 0 
         ORDER BY total_attempts DESC, name`
      )
    ),
  
  getExamById: (id: number, region?: string) =>
    performanceMonitor.executeWithMonitoring('get_exam_by_id', () =>
      getDB(region).execute({ sql: 'SELECT * FROM exams WHERE id = ? AND is_active = 1', args: [id] })
    ),
  
  // Optimized question operations with smart pagination
  getExamQuestions: (
    examId: number, 
    options: {
      limit?: number
      offset?: number
      objectiveIds?: number[]
      difficulty?: { min: number; max: number }
      excludeQuestionIds?: number[]
      region?: string
    } = {}
  ) => {
    const { limit = 20, offset = 0, objectiveIds, difficulty, excludeQuestionIds, region } = options
    
    let sql = `
      SELECT id, text, answers, difficulty, explanation, objective_id, tags
      FROM questions 
      WHERE exam_id = ? AND is_active = 1 AND review_status = 'approved'
    `
    const args: any[] = [examId]
    
    // Add objective filter
    if (objectiveIds?.length) {
      sql += ` AND objective_id IN (${objectiveIds.map(() => '?').join(',')})`
      args.push(...objectiveIds)
    }
    
    // Add difficulty filter
    if (difficulty) {
      sql += ` AND difficulty BETWEEN ? AND ?`
      args.push(difficulty.min, difficulty.max)
    }
    
    // Exclude recently seen questions
    if (excludeQuestionIds?.length) {
      sql += ` AND id NOT IN (${excludeQuestionIds.map(() => '?').join(',')})`
      args.push(...excludeQuestionIds)
    }
    
    sql += ` ORDER BY RANDOM() LIMIT ? OFFSET ?`
    args.push(limit, offset)
    
    return performanceMonitor.executeWithMonitoring('get_exam_questions', () =>
      getDB(region).execute({ sql, args })
    )
  },
  
  // Get recently answered questions for exclusion
  getRecentlyAnsweredQuestions: (userId: number, examId: number, hours = 24, region?: string) =>
    performanceMonitor.executeWithMonitoring('get_recently_answered', () =>
      getDB(region).execute({
        sql: `
          SELECT DISTINCT question_id
          FROM user_answers ua
          JOIN questions q ON ua.question_id = q.id
          WHERE ua.user_id = ? AND q.exam_id = ? 
          AND ua.answered_at > datetime('now', '-${hours} hours')
        `,
        args: [userId, examId]
      })
    ),
  
  // Session operations with better tracking
  createStudySession: (userId: number, examId: number, mode: string = 'practice', region?: string) =>
    performanceMonitor.executeWithMonitoring('create_study_session', () =>
      getDB(region).execute({ 
        sql: `INSERT INTO study_sessions (user_id, exam_id, mode, created_at, last_activity) 
              VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`, 
        args: [userId, examId, mode] 
      })
    ),
  
  updateStudySessionProgress: (
    sessionId: number, 
    progress: {
      totalQuestions: number
      correctAnswers: number  
      timeSpent: number
      accuracy?: number
    },
    region?: string
  ) =>
    performanceMonitor.executeWithMonitoring('update_session_progress', () => {
      const accuracy = progress.accuracy ?? (progress.correctAnswers / progress.totalQuestions)
      return getDB(region).execute({
        sql: `
          UPDATE study_sessions 
          SET total_questions = ?, correct_answers = ?, time_spent_seconds = ?, 
              accuracy = ?, last_activity = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [progress.totalQuestions, progress.correctAnswers, progress.timeSpent, accuracy, sessionId]
      })
    }),
  
  // Performance-optimized batch operations with monitoring
  batchInsertAnswers: (answers: any[], region?: string) =>
    performanceMonitor.executeWithMonitoring('batch_insert_answers', () => {
      const db = getDB(region)
      return db.batch(answers.map(answer => ({
        sql: `INSERT INTO user_answers 
              (user_id, question_id, study_session_id, selected_answer, is_correct, time_spent_seconds, answered_at) 
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        args: [
          answer.userId, 
          answer.questionId, 
          answer.sessionId,
          answer.selectedAnswer, 
          answer.isCorrect, 
          answer.timeSpent
        ]
      })))
    }),
  
  // User progress tracking with UPSERT
  updateUserProgress: (
    userId: number, 
    examId: number, 
    progressData: {
      questionsAnswered: number
      correctAnswers: number
      studyTimeMinutes: number
      accuracy?: number
    },
    region?: string
  ) =>
    performanceMonitor.executeWithMonitoring('update_user_progress', () => {
      const accuracy = progressData.accuracy ?? (progressData.correctAnswers / progressData.questionsAnswered)
      return getDB(region).execute({
        sql: `
          INSERT INTO user_progress (
            user_id, exam_id, total_questions_seen, total_correct, 
            overall_accuracy, total_study_minutes, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(user_id, exam_id) DO UPDATE SET
            total_questions_seen = total_questions_seen + excluded.total_questions_seen,
            total_correct = total_correct + excluded.total_correct,
            overall_accuracy = CAST(total_correct + excluded.total_correct AS REAL) / 
                             (total_questions_seen + excluded.total_questions_seen),
            total_study_minutes = total_study_minutes + excluded.total_study_minutes,
            updated_at = CURRENT_TIMESTAMP
        `,
        args: [userId, examId, progressData.questionsAnswered, progressData.correctAnswers, accuracy, progressData.studyTimeMinutes]
      })
    }),
  
  // Dashboard queries optimized with covering indexes
  getUserDashboard: (userId: number, region?: string) =>
    performanceMonitor.executeWithMonitoring('get_user_dashboard', () =>
      getDB(region).execute({
        sql: `
          SELECT 
            e.id as exam_id,
            e.name as exam_name,
            e.vendor_id,
            e.code,
            up.total_questions_seen,
            up.overall_accuracy,
            up.readiness_score,
            up.last_study_date,
            up.study_days_count,
            up.tests_taken,
            up.best_score,
            (SELECT COUNT(*) FROM study_sessions WHERE user_id = ? AND exam_id = e.id AND status = 'active') as active_sessions
          FROM user_progress up
          JOIN exams e ON up.exam_id = e.id
          WHERE up.user_id = ? AND e.is_active = 1
          ORDER BY up.updated_at DESC
        `,
        args: [userId, userId]
      })
    ),
  
  // Full-text search with performance monitoring
  searchQuestions: (searchTerm: string, examId?: number, limit = 20, region?: string) =>
    performanceMonitor.executeWithMonitoring('search_questions', () => {
      let sql = `
        SELECT q.id, q.text, q.explanation, q.difficulty, e.name as exam_name
        FROM questions_fts fts
        JOIN questions q ON fts.rowid = q.id
        JOIN exams e ON q.exam_id = e.id
        WHERE questions_fts MATCH ?
        AND q.is_active = 1 AND q.review_status = 'approved'
      `
      const args: any[] = [searchTerm]
      
      if (examId) {
        sql += ` AND q.exam_id = ?`
        args.push(examId)
      }
      
      sql += ` ORDER BY rank LIMIT ?`
      args.push(limit)
      
      return getDB(region).execute({ sql, args })
    })
}