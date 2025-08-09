// Database connectivity health check endpoint
import { getDB, sql } from '../../utils/database'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // Test database connectivity
    const db = getDB()
    const result = await db.run(sql`SELECT 1 as test`)
    const responseTime = Date.now() - startTime
    
    if (result.rows && result.rows.length > 0) {
      // Set cache headers
      setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
      setHeader(event, 'Pragma', 'no-cache')
      setHeader(event, 'Expires', '0')
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: 'connected',
        responseTime: `${responseTime}ms`,
        checks: {
          connectivity: 'ok',
          query: 'ok'
        }
      }
    } else {
      throw new Error('Database query returned no results')
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    // Return unhealthy status on database error
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : 'Database connection failed',
      checks: {
        connectivity: 'error',
        query: 'error'
      }
    }
  }
})