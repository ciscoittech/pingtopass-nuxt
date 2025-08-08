// Database connection and configuration for Turso with Drizzle ORM
// Optimized for edge runtime and global performance

import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from '../schema'

// Create Turso client with optimal configuration
function createTursoClient() {
  const url = useRuntimeConfig().tursoUrl
  const authToken = useRuntimeConfig().tursoToken
  
  if (!url || !authToken) {
    throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set')
  }
  
  return createClient({
    url,
    authToken,
    // Optimize for edge runtime
    syncUrl: url,
    encryptionKey: process.env.TURSO_ENCRYPTION_KEY,
    // Connection settings for better performance
    syncInterval: 60, // Sync every 60 seconds
    intMode: 'number' // Use numbers for integer types
  })
}

// Create Drizzle database instance with full schema
export const db = drizzle(createTursoClient(), { 
  schema,
  logger: process.env.NODE_ENV === 'development'
})

// Type-safe database instance
export type Database = typeof db

// Connection health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.execute('SELECT 1')
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}

// Database statistics for monitoring
export async function getDatabaseStats() {
  try {
    const [tableCount] = await db.execute(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `)
    
    const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users')
    const [questionCount] = await db.execute('SELECT COUNT(*) as count FROM questions')
    const [sessionCount] = await db.execute('SELECT COUNT(*) as count FROM study_sessions WHERE status = "active"')
    
    return {
      tables: tableCount.count as number,
      users: userCount.count as number,
      questions: questionCount.count as number,
      activeSessions: sessionCount.count as number,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Failed to get database stats:', error)
    return null
  }
}

// Connection pool management for high traffic
let connectionPool: Database[] = []
const MAX_CONNECTIONS = 5

export function getPooledConnection(): Database {
  if (connectionPool.length < MAX_CONNECTIONS) {
    connectionPool.push(drizzle(createTursoClient(), { schema }))
  }
  
  // Round-robin connection selection
  const index = Math.floor(Math.random() * connectionPool.length)
  return connectionPool[index] || db
}

// Cleanup connections on shutdown
export function closeConnections() {
  connectionPool = []
  console.log('Database connections closed')
}

// Database configuration for different environments
export const dbConfig = {
  development: {
    logging: true,
    syncInterval: 30,
    maxConnections: 2
  },
  production: {
    logging: false,
    syncInterval: 60,
    maxConnections: 5
  },
  test: {
    logging: false,
    syncInterval: 0, // No sync for tests
    maxConnections: 1
  }
}