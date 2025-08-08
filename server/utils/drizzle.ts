import { drizzle } from 'drizzle-orm/libsql'
import { getDB } from './db'
import * as schema from './schema'

// Create Drizzle instance with optimized configuration
function createDrizzleInstance(region?: string) {
  return drizzle(getDB(region), { 
    schema,
    logger: process.env.NODE_ENV === 'development' // Only log in development
  })
}

// Connection pool for Drizzle instances
const drizzleInstances = new Map<string, ReturnType<typeof createDrizzleInstance>>()

export function getDrizzle(region?: string) {
  const key = region || 'primary'
  
  if (!drizzleInstances.has(key)) {
    drizzleInstances.set(key, createDrizzleInstance(region))
  }
  
  return drizzleInstances.get(key)!
}

// Export schema for use in other modules
export { schema }

// Type-safe query helpers using Drizzle
export const drizzleQueries = {
  // Users
  async findUserByEmail(email: string, region?: string) {
    const db = getDrizzle(region)
    return await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, email),
      with: {
        progress: true,
      }
    })
  },

  async getUserProgress(userId: number, region?: string) {
    const db = getDrizzle(region)
    return await db.query.userProgress.findMany({
      where: (progress, { eq }) => eq(progress.userId, userId),
      with: {
        exam: true,
      }
    })
  },

  // Exams
  async getActiveExams(region?: string) {
    const db = getDrizzle(region)
    return await db.query.exams.findMany({
      where: (exams, { eq, and }) => and(
        eq(exams.isActive, true),
        eq(exams.isBeta, false)
      ),
      orderBy: (exams, { desc }) => [desc(exams.totalAttempts), exams.name]
    })
  },

  async getExamWithObjectives(examId: number, region?: string) {
    const db = getDrizzle(region)
    return await db.query.exams.findFirst({
      where: (exams, { eq, and }) => and(
        eq(exams.id, examId),
        eq(exams.isActive, true)
      ),
      with: {
        objectives: {
          where: (objectives, { eq }) => eq(objectives.isActive, true),
          orderBy: (objectives, { asc }) => asc(objectives.sortOrder)
        }
      }
    })
  },

  // Questions with advanced filtering
  async getQuestionsForStudy(
    examId: number,
    options: {
      objectiveIds?: number[]
      difficulty?: { min: number; max: number }
      excludeIds?: number[]
      limit?: number
      region?: string
    } = {}
  ) {
    const { objectiveIds, difficulty, excludeIds, limit = 20, region } = options
    const db = getDrizzle(region)
    
    return await db.query.questions.findMany({
      where: (questions, { eq, and, between, inArray, not }) => {
        const conditions = [
          eq(questions.examId, examId),
          eq(questions.isActive, true),
          eq(questions.reviewStatus, 'approved')
        ]
        
        if (objectiveIds?.length) {
          conditions.push(inArray(questions.objectiveId, objectiveIds))
        }
        
        if (difficulty) {
          conditions.push(between(questions.difficulty, difficulty.min, difficulty.max))
        }
        
        if (excludeIds?.length) {
          conditions.push(not(inArray(questions.id, excludeIds)))
        }
        
        return and(...conditions)
      },
      limit,
      columns: {
        id: true,
        text: true,
        answers: true,
        difficulty: true,
        explanation: true,
        objectiveId: true,
        tags: true
      }
    })
  },

  // Study sessions with progress tracking
  async createStudySession(
    data: {
      userId: number
      examId: number
      mode: 'practice' | 'review' | 'speed_drill' | 'weak_areas' | 'custom'
      objectives?: string
      difficultyFilter?: string
      questionCount?: number
    },
    region?: string
  ) {
    const db = getDrizzle(region)
    const [session] = await db.insert(schema.studySessions)
      .values({
        ...data,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'active'
      })
      .returning()
    
    return session
  },

  async updateSessionProgress(
    sessionId: number,
    progress: {
      totalQuestions: number
      correctAnswers: number
      timeSpentSeconds: number
    },
    region?: string
  ) {
    const db = getDrizzle(region)
    const accuracy = progress.correctAnswers / progress.totalQuestions
    
    await db.update(schema.studySessions)
      .set({
        totalQuestions: progress.totalQuestions,
        correctAnswers: progress.correctAnswers,
        timeSpentSeconds: progress.timeSpentSeconds,
        accuracy,
        lastActivity: new Date()
      })
      .where(eq(schema.studySessions.id, sessionId))
  },

  // Batch operations for performance
  async batchInsertAnswers(
    answers: Array<{
      userId: number
      questionId: number
      studySessionId?: number
      testAttemptId?: number
      selectedAnswer: string
      isCorrect: boolean
      timeSpentSeconds?: number
    }>,
    region?: string
  ) {
    const db = getDrizzle(region)
    return await db.insert(schema.userAnswers)
      .values(answers.map(answer => ({
        ...answer,
        answeredAt: new Date()
      })))
  },

  // User progress with upsert functionality
  async upsertUserProgress(
    userId: number,
    examId: number,
    updates: {
      questionsAnswered: number
      correctAnswers: number
      studyTimeMinutes: number
    },
    region?: string
  ) {
    const db = getDrizzle(region)
    const accuracy = updates.correctAnswers / updates.questionsAnswered
    
    // Try to update first
    const existing = await db.query.userProgress.findFirst({
      where: (progress, { eq, and }) => and(
        eq(progress.userId, userId),
        eq(progress.examId, examId)
      )
    })
    
    if (existing) {
      const newTotalQuestions = existing.totalQuestionsSeen + updates.questionsAnswered
      const newTotalCorrect = existing.totalCorrect + updates.correctAnswers
      const newOverallAccuracy = newTotalCorrect / newTotalQuestions
      
      await db.update(schema.userProgress)
        .set({
          totalQuestionsSeen: newTotalQuestions,
          totalCorrect: newTotalCorrect,
          overallAccuracy: newOverallAccuracy,
          totalStudyMinutes: existing.totalStudyMinutes + updates.studyTimeMinutes,
          updatedAt: new Date()
        })
        .where(eq(schema.userProgress.id, existing.id))
    } else {
      await db.insert(schema.userProgress)
        .values({
          userId,
          examId,
          totalQuestionsSeen: updates.questionsAnswered,
          totalCorrect: updates.correctAnswers,
          overallAccuracy: accuracy,
          totalStudyMinutes: updates.studyTimeMinutes,
          createdAt: new Date(),
          updatedAt: new Date()
        })
    }
  },

  // Analytics and reporting
  async getUserDashboard(userId: number, region?: string) {
    const db = getDrizzle(region)
    return await db.query.userProgress.findMany({
      where: (progress, { eq }) => eq(progress.userId, userId),
      with: {
        exam: {
          columns: {
            id: true,
            name: true,
            vendorId: true,
            code: true
          }
        }
      },
      orderBy: (progress, { desc }) => desc(progress.updatedAt)
    })
  },

  async getExamLeaderboard(examId: number, limit = 10, region?: string) {
    const db = getDrizzle(region)
    return await db.query.testAttempts.findMany({
      where: (attempts, { eq, and }) => and(
        eq(attempts.examId, examId),
        eq(attempts.passed, true),
        eq(attempts.status, 'completed')
      ),
      with: {
        user: {
          columns: {
            id: true,
            name: true,
            picture: true
          }
        }
      },
      orderBy: (attempts, { desc }) => [desc(attempts.score), desc(attempts.completedAt)],
      limit
    })
  },

  // Full-text search with Drizzle (when supported)
  async searchQuestions(
    searchTerm: string,
    examId?: number,
    limit = 20,
    region?: string
  ) {
    const db = getDrizzle(region)
    // For now, use LIKE search until FTS5 support is added to Drizzle
    return await db.query.questions.findMany({
      where: (questions, { eq, and, like, or }) => {
        const conditions = [
          eq(questions.isActive, true),
          eq(questions.reviewStatus, 'approved'),
          or(
            like(questions.text, `%${searchTerm}%`),
            like(questions.explanation, `%${searchTerm}%`)
          )
        ]
        
        if (examId) {
          conditions.push(eq(questions.examId, examId))
        }
        
        return and(...conditions)
      },
      with: {
        exam: {
          columns: { name: true }
        }
      },
      limit
    })
  }
}

// Performance monitoring for Drizzle queries
export function withDrizzleMonitoring<T extends (...args: any[]) => Promise<any>>(
  queryName: string,
  queryFn: T
): T {
  return (async (...args: Parameters<T>) => {
    const startTime = Date.now()
    try {
      const result = await queryFn(...args)
      const duration = Date.now() - startTime
      
      if (duration > 50) {
        console.warn(`🐌 Slow Drizzle Query [${queryName}]: ${duration}ms`)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`❌ Drizzle Query Failed [${queryName}]: ${duration}ms`, error)
      throw error
    }
  }) as T
}

// Wrap all drizzle queries with monitoring
Object.keys(drizzleQueries).forEach(key => {
  const originalFn = drizzleQueries[key as keyof typeof drizzleQueries]
  // @ts-ignore
  drizzleQueries[key] = withDrizzleMonitoring(key, originalFn)
})