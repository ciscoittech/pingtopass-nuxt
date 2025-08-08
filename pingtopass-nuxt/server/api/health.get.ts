// Basic health check endpoint
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // Basic health information
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      checks: {
        server: 'ok',
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
          external: process.memoryUsage().external
        }
      }
    }
    
    const responseTime = Date.now() - startTime
    health.checks.responseTime = `${responseTime}ms`
    
    // Set cache headers
    setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
    setHeader(event, 'Pragma', 'no-cache')
    setHeader(event, 'Expires', '0')
    
    return health
    
  } catch (error) {
    // Return unhealthy status on any error
    setResponseStatus(event, 503)
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      checks: {
        server: 'error'
      }
    }
  }
})