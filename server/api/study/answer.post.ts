// Study answer submission API endpoint
// Records user answers with atomic transaction handling

import { z } from 'zod'
import { queries, handleDatabaseError, withTransaction } from '~/server/utils/database'
import { auditLog } from '~/database/schema'

// Request validation schema
const answerSchema = z.object({
  questionId: z.number(),
  studySessionId: z.number().optional(),
  testAttemptId: z.number().optional(),
  selectedAnswer: z.string().min(1),
  timeSpentSeconds: z.number().min(0).max(3600), // Max 1 hour per question
  confidenceLevel: z.number().min(1).max(5).optional(),
  flagged: z.boolean().optional()
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

    // Validate request body
    const body = await readBody(event)
    const validatedAnswer = answerSchema.parse(body)

    // Performance tracking
    const startTime = Date.now()

    // Validate question exists and get correct answer
    const question = await db.select({
      id: schema.questions.id,
      answers: schema.questions.answers,
      examId: schema.questions.examId,
      objectiveId: schema.questions.objectiveId
    })
    .from(schema.questions)
    .where(eq(schema.questions.id, validatedAnswer.questionId))
    .limit(1)

    if (question.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Question not found'
      })
    }

    const questionData = question[0]
    
    // Determine if answer is correct
    const answers = questionData.answers as Array<{id: string, isCorrect: boolean}>
    const correctAnswers = answers.filter(a => a.isCorrect).map(a => a.id)
    
    let isCorrect = false
    if (questionData.type === 'multiple_choice' || questionData.type === 'true_false') {
      isCorrect = correctAnswers.includes(validatedAnswer.selectedAnswer)
    } else if (questionData.type === 'multi_select') {
      const selected = JSON.parse(validatedAnswer.selectedAnswer) as string[]
      isCorrect = selected.length === correctAnswers.length && 
                  selected.every(id => correctAnswers.includes(id))
    }

    // Record answer with transaction
    const result = await withTransaction(async (tx) => {
      // Record the answer
      const userAnswer = await queries.study.recordAnswer({
        userId: user.id,
        questionId: validatedAnswer.questionId,
        studySessionId: validatedAnswer.studySessionId,
        testAttemptId: validatedAnswer.testAttemptId,
        selectedAnswer: validatedAnswer.selectedAnswer,
        isCorrect,
        timeSpentSeconds: validatedAnswer.timeSpentSeconds,
        confidenceLevel: validatedAnswer.confidenceLevel,
        flagged: validatedAnswer.flagged
      })

      // Update study session progress if applicable
      let updatedSession = null
      if (validatedAnswer.studySessionId) {
        updatedSession = await queries.study.updateSessionProgress(validatedAnswer.studySessionId)
      }

      // Log the answer for audit trail
      await tx.insert(auditLog).values({
        userId: user.id,
        action: 'answer.submitted',
        entityType: 'user_answer',
        entityId: String(userAnswer.id),
        metadata: JSON.stringify({
          questionId: validatedAnswer.questionId,
          examId: questionData.examId,
          objectiveId: questionData.objectiveId,
          isCorrect,
          timeSpent: validatedAnswer.timeSpentSeconds
        }),
        ipAddress: getClientIP(event),
        userAgent: getHeader(event, 'user-agent')
      })

      return { userAnswer, updatedSession }
    })

    const duration = Date.now() - startTime

    // Log performance metrics
    if (duration > 200) {
      console.warn(`Slow answer submission: ${duration}ms for user ${user.id}`)
    }

    return {
      success: true,
      result: {
        isCorrect,
        answerId: result.userAnswer.id,
        questionId: validatedAnswer.questionId,
        session: result.updatedSession ? {
          id: result.updatedSession.id,
          totalQuestions: result.updatedSession.totalQuestions,
          correctAnswers: result.updatedSession.correctAnswers,
          accuracy: result.updatedSession.accuracy
        } : null
      },
      metadata: {
        processTime: duration,
        timestamp: new Date().toISOString()
      }
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid answer data',
        data: error.errors
      })
    }

    handleDatabaseError(error, 'study.submitAnswer')
  }
})

// Helper function to get client IP
function getClientIP(event: any): string {
  return getClientIPFromHeaders(getHeaders(event)) || 'unknown'
}

function getClientIPFromHeaders(headers: Record<string, string | string[] | undefined>): string | null {
  const forwarded = headers['x-forwarded-for']
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0]
  }
  
  const realIP = headers['x-real-ip']
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP
  }
  
  return null
}

// Imports
import { db, schema } from '~/server/utils/database'
import { eq } from 'drizzle-orm'

// Mock auth function (replace with real implementation)
async function requireAuth(event: any) {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader) return null

  return {
    id: 1,
    email: 'test@pingtopass.com',
    name: 'Test User'
  }
}