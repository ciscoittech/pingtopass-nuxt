// Exams API endpoint (placeholder)
export default defineEventHandler(async (event) => {
  try {
    // For health check purposes, return a basic response
    // In production, this would return actual exams from the database
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'Exams API endpoint is responding',
      data: [], // Empty for now, will contain exams when implemented
      meta: {
        total: 0,
        page: 1,
        limit: 10
      }
    }
    
  } catch (error) {
    setResponseStatus(event, 500)
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Exams API error'
    }
  }
})