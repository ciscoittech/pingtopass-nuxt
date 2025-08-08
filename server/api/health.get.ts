import { checkDBHealth, testConnection, getQueryStats } from '~/server/utils/db'

export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  
  try {
    // Test database connectivity and performance
    const [health, connectionTest, stats] = await Promise.all([
      checkDBHealth(),
      testConnection(),
      getQueryStats()
    ])
    
    const totalTime = Date.now() - startTime
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime: `${totalTime}ms`,
      database: {
        ...health,
        ...connectionTest,
        stats
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        siteUrl: useRuntimeConfig().public.siteUrl,
        tursoUrl: useRuntimeConfig().tursoUrl ? 'configured' : 'missing'
      },
      performance: {
        dbLatency: health.latency,
        totalLatency: totalTime,
        target: '<200ms',
        status: totalTime < 200 ? '✅ FAST' : '⚠️ SLOW'
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: {
        healthy: false,
        error: error.message
      }
    }
  }
})