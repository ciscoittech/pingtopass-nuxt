// Study questions API endpoint
// Demonstrates Drizzle ORM integration with Nuxt 3 server routes

import { z } from 'zod'
import { queries, handleDatabaseError } from '~/server/utils/database'

// Request validation schema
const querySchema = z.object({
  examId: z.string().transform(Number),
  objectiveIds: z.string().optional().transform(val => 
    val ? val.split(',').map(Number) : undefined
  ),
  difficulty: z.string().optional().transform(val => {
    if (!val) return undefined
    const [min, max] = val.split('-').map(Number)
    return { min: min || 1, max: max || 5 }
  }),
  mode: z.enum(['practice', 'review', 'speed_drill', 'weak_areas', 'custom']).optional(),
  limit: z.string().optional().transform(val => val ? Number(val) : 20),
  excludeRecentHours: z.string().optional().transform(val => val ? Number(val) : 24)
})

export default defineEventHandler(async (event) => {
  try {
    // Verify authentication
    const user = await requireAuth(event)
    if (!user) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }

    // Validate query parameters
    const query = getQuery(event)
    const validatedQuery = querySchema.parse(query)

    // Performance tracking
    const startTime = Date.now()

    // Get study questions using optimized query
    const questions = await queries.study.getStudyQuestions({
      userId: user.id,
      examId: validatedQuery.examId,
      objectiveIds: validatedQuery.objectiveIds,
      difficulty: validatedQuery.difficulty,
      mode: validatedQuery.mode,
      limit: validatedQuery.limit,
      excludeRecentHours: validatedQuery.excludeRecentHours
    })

    const duration = Date.now() - startTime

    // Log performance metrics
    if (duration > 100) {
      console.warn(`Slow study questions query: ${duration}ms for user ${user.id}`)
    }

    // Set cache headers for performance
    setHeader(event, 'Cache-Control', 'private, max-age=60') // Cache for 1 minute

    return {
      questions: questions.map(q => ({
        ...q,
        // Remove sensitive data
        correctAnswer: undefined, // Don't expose correct answer
        explanation: undefined,   // Don't show explanation yet
        reference: undefined      // Don't show reference yet
      })),
      metadata: {
        count: questions.length,
        queryTime: duration,
        userId: user.id,
        examId: validatedQuery.examId
      }
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid query parameters',
        data: error.errors
      })
    }

    handleDatabaseError(error, 'study.getQuestions')
  }
})

// Helper function for authentication (would be implemented elsewhere)
async function requireAuth(event: any) {
  // This would integrate with your authentication system
  // For now, return a mock user for testing
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) return null

  // Mock authentication - replace with real JWT verification
  return {
    id: 1,
    email: 'test@pingtopass.com',
    name: 'Test User'
  }
}