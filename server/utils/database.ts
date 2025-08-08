// Server-side database utilities for Nuxt 3
// Provides type-safe database operations with performance optimization

import { db, type Database } from '~/database/utils/connection'
import { createQueries } from '~/database/utils/queries'
import * as schema from '~/database/schema'

// Export database instance for server use
export { db }

// Create query helpers
export const queries = createQueries(db)

// Transaction helper with proper error handling
export async function withTransaction<T>(
  fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>
): Promise<T> {
  try {
    return await db.transaction(fn)
  } catch (error) {
    console.error('Transaction failed:', error)
    throw error
  }
}

// Database health check utility
export async function checkDatabaseHealth() {
  try {
    await db.execute('SELECT 1')
    return { status: 'healthy', timestamp: new Date().toISOString() }
  } catch (error) {
    console.error('Database health check failed:', error)
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString() 
    }
  }
}

// Cache utilities for performance optimization
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

export function getCachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttlSeconds = 300
): Promise<T> {
  const cached = queryCache.get(key)
  const now = Date.now()
  
  if (cached && now - cached.timestamp < cached.ttl * 1000) {
    return Promise.resolve(cached.data)
  }
  
  return queryFn().then(data => {
    queryCache.set(key, { data, timestamp: now, ttl: ttlSeconds })
    return data
  })
}

export function clearQueryCache(pattern?: string) {
  if (pattern) {
    const regex = new RegExp(pattern)
    for (const [key] of queryCache.entries()) {
      if (regex.test(key)) {
        queryCache.delete(key)
      }
    }
  } else {
    queryCache.clear()
  }
}

// Schema exports for API routes
export { schema }

// Utility types
export type { Database }
export type UserWithProgress = schema.User & {
  progress?: schema.UserProgress[]
}

export type QuestionWithDetails = schema.Question & {
  exam: schema.Exam
  objective: schema.Objective
}

export type StudySessionWithDetails = schema.StudySession & {
  user: schema.User
  exam: schema.Exam
  answers?: schema.UserAnswer[]
}

// Performance monitoring
let queryCount = 0
let totalQueryTime = 0

export function trackQuery(startTime: number) {
  const duration = Date.now() - startTime
  queryCount++
  totalQueryTime += duration
  
  if (queryCount % 100 === 0) {
    console.log(`Database performance: ${queryCount} queries, avg ${totalQueryTime / queryCount}ms`)
  }
  
  if (duration > 1000) {
    console.warn(`Slow query detected: ${duration}ms`)
  }
}

// Error handling utilities
export function handleDatabaseError(error: unknown, context: string) {
  console.error(`Database error in ${context}:`, error)
  
  if (error instanceof Error) {
    // SQLite specific error handling
    if (error.message.includes('UNIQUE constraint failed')) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Resource already exists'
      })
    }
    
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid reference'
      })
    }
    
    if (error.message.includes('no such table')) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Database schema error'
      })
    }
  }
  
  // Generic database error
  throw createError({
    statusCode: 500,
    statusMessage: 'Database operation failed'
  })
}