// Optimized query patterns for PingToPass platform
// All queries designed for <200ms performance on Turso edge

import { and, eq, gt, gte, lt, lte, inArray, notInArray, desc, asc, sql, between, isNull, isNotNull } from 'drizzle-orm'
import type { Database } from './connection'
import * as schema from '../schema'
import type { StudyMode, DifficultyFilter } from '../schema/types'

// Study Session Queries - Critical for learning experience
export class StudyQueries {
  constructor(private db: Database) {}

  /**
   * Get optimized questions for study session
   * Excludes recently seen questions and applies difficulty filtering
   */
  async getStudyQuestions(params: {
    userId: number
    examId: number
    objectiveIds?: number[]
    difficulty?: DifficultyFilter
    excludeRecentHours?: number
    limit?: number
    mode?: StudyMode
  }) {
    const {
      userId,
      examId,
      objectiveIds = [],
      difficulty = { min: 1, max: 5 },
      excludeRecentHours = 24,
      limit = 20,
      mode = 'practice'
    } = params

    // Get recent question IDs to exclude
    const recentCutoff = new Date(Date.now() - excludeRecentHours * 60 * 60 * 1000)
    
    const recentQuestions = await this.db
      .select({ questionId: schema.userAnswers.questionId })
      .from(schema.userAnswers)
      .where(
        and(
          eq(schema.userAnswers.userId, userId),
          gt(schema.userAnswers.answeredAt, recentCutoff)
        )
      )

    const excludeIds = recentQuestions.map(r => r.questionId)

    // Build base query conditions
    const conditions = [
      eq(schema.questions.examId, examId),
      eq(schema.questions.isActive, true),
      between(schema.questions.difficulty, difficulty.min, difficulty.max)
    ]

    // Add objective filtering if specified
    if (objectiveIds.length > 0) {
      conditions.push(inArray(schema.questions.objectiveId, objectiveIds))
    }

    // Exclude recently seen questions
    if (excludeIds.length > 0) {
      conditions.push(notInArray(schema.questions.id, excludeIds))
    }

    // Adjust query based on study mode
    let orderBy = sql`RANDOM()` // Default random order
    
    if (mode === 'weak_areas') {
      // Prioritize questions user has gotten wrong
      orderBy = desc(schema.questions.totalAttempts) // Questions with more attempts (likely harder)
    } else if (mode === 'speed_drill') {
      // Prioritize easier questions for speed
      orderBy = asc(schema.questions.difficulty)
    }

    return await this.db
      .select({
        id: schema.questions.id,
        text: schema.questions.text,
        type: schema.questions.type,
        answers: schema.questions.answers,
        difficulty: schema.questions.difficulty,
        objectiveId: schema.questions.objectiveId,
        explanation: schema.questions.explanation,
        reference: schema.questions.reference,
        tags: schema.questions.tags
      })
      .from(schema.questions)
      .where(and(...conditions))
      .orderBy(orderBy)
      .limit(limit)
  }

  /**
   * Record user answer and update question statistics atomically
   */
  async recordAnswer(params: {
    userId: number
    questionId: number
    studySessionId?: number
    testAttemptId?: number
    selectedAnswer: string
    isCorrect: boolean
    timeSpentSeconds: number
    confidenceLevel?: number
    flagged?: boolean
  }) {
    return await this.db.transaction(async (tx) => {
      // Insert user answer
      const [userAnswer] = await tx
        .insert(schema.userAnswers)
        .values({
          ...params,
          answeredAt: new Date()
        })
        .returning()

      // Update question performance statistics
      await tx
        .update(schema.questions)
        .set({
          totalAttempts: sql`${schema.questions.totalAttempts} + 1`,
          correctAttempts: params.isCorrect 
            ? sql`${schema.questions.correctAttempts} + 1`
            : schema.questions.correctAttempts,
          avgTimeSeconds: sql`
            CASE 
              WHEN ${schema.questions.totalAttempts} = 0 THEN ${params.timeSpentSeconds}
              ELSE (${schema.questions.avgTimeSeconds} * ${schema.questions.totalAttempts} + ${params.timeSpentSeconds}) / (${schema.questions.totalAttempts} + 1)
            END
          `,
          updatedAt: new Date()
        })
        .where(eq(schema.questions.id, params.questionId))

      return userAnswer
    })
  }

  /**
   * Update study session progress efficiently
   */
  async updateSessionProgress(sessionId: number) {
    return await this.db.transaction(async (tx) => {
      // Get session answers for calculations
      const answers = await tx
        .select({
          isCorrect: schema.userAnswers.isCorrect,
          timeSpentSeconds: schema.userAnswers.timeSpentSeconds,
          objectiveId: schema.questions.objectiveId
        })
        .from(schema.userAnswers)
        .innerJoin(schema.questions, eq(schema.userAnswers.questionId, schema.questions.id))
        .where(eq(schema.userAnswers.studySessionId, sessionId))

      if (answers.length === 0) return null

      // Calculate metrics
      const totalQuestions = answers.length
      const correctAnswers = answers.filter(a => a.isCorrect).length
      const accuracy = correctAnswers / totalQuestions
      const avgTime = answers.reduce((sum, a) => sum + (a.timeSpentSeconds || 0), 0) / totalQuestions

      // Calculate objective scores
      const objectiveScores: Record<string, number> = {}
      const objectiveGroups = answers.reduce((groups, answer) => {
        const objId = String(answer.objectiveId)
        if (!groups[objId]) groups[objId] = []
        groups[objId].push(answer)
        return groups
      }, {} as Record<string, typeof answers>)

      Object.entries(objectiveGroups).forEach(([objId, objAnswers]) => {
        const correct = objAnswers.filter(a => a.isCorrect).length
        objectiveScores[objId] = correct / objAnswers.length
      })

      // Update session
      const [updatedSession] = await tx
        .update(schema.studySessions)
        .set({
          totalQuestions,
          correctAnswers,
          accuracy,
          avgTimePerQuestion: avgTime,
          objectiveScores,
          lastActivity: new Date()
        })
        .where(eq(schema.studySessions.id, sessionId))
        .returning()

      return updatedSession
    })
  }
}

// User Progress Queries - For dashboard and analytics
export class ProgressQueries {
  constructor(private db: Database) {}

  /**
   * Get comprehensive user progress for an exam
   */
  async getUserProgress(userId: number, examId: number) {
    const progress = await this.db
      .select()
      .from(schema.userProgress)
      .where(
        and(
          eq(schema.userProgress.userId, userId),
          eq(schema.userProgress.examId, examId)
        )
      )
      .limit(1)

    return progress[0] || null
  }

  /**
   * Update user progress after study session or test
   */
  async updateUserProgress(params: {
    userId: number
    examId: number
    questionsAnswered: number
    correctAnswers: number
    studyMinutes: number
    objectiveScores?: Record<string, number>
  }) {
    const { userId, examId, questionsAnswered, correctAnswers, studyMinutes, objectiveScores = {} } = params

    return await this.db
      .insert(schema.userProgress)
      .values({
        userId,
        examId,
        totalQuestionsSeen: questionsAnswered,
        totalCorrect: correctAnswers,
        overallAccuracy: correctAnswers / questionsAnswered,
        totalStudyMinutes: studyMinutes,
        lastStudyDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        objectiveMastery: objectiveScores,
        updatedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [schema.userProgress.userId, schema.userProgress.examId],
        set: {
          totalQuestionsSeen: sql`${schema.userProgress.totalQuestionsSeen} + ${questionsAnswered}`,
          totalCorrect: sql`${schema.userProgress.totalCorrect} + ${correctAnswers}`,
          overallAccuracy: sql`
            (${schema.userProgress.totalCorrect} + ${correctAnswers}) / 
            (${schema.userProgress.totalQuestionsSeen} + ${questionsAnswered})
          `,
          totalStudyMinutes: sql`${schema.userProgress.totalStudyMinutes} + ${studyMinutes}`,
          lastStudyDate: new Date().toISOString().split('T')[0],
          objectiveMastery: objectiveScores,
          updatedAt: new Date()
        }
      })
  }

  /**
   * Get leaderboard for exam (top performers)
   */
  async getExamLeaderboard(examId: number, limit = 10) {
    return await this.db
      .select({
        userId: schema.userProgress.userId,
        userName: schema.users.name,
        userPicture: schema.users.picture,
        overallAccuracy: schema.userProgress.overallAccuracy,
        readinessScore: schema.userProgress.readinessScore,
        totalStudyMinutes: schema.userProgress.totalStudyMinutes,
        bestScore: schema.userProgress.bestScore
      })
      .from(schema.userProgress)
      .innerJoin(schema.users, eq(schema.userProgress.userId, schema.users.id))
      .where(
        and(
          eq(schema.userProgress.examId, examId),
          gt(schema.userProgress.totalQuestionsSeen, 50) // Minimum questions for leaderboard
        )
      )
      .orderBy(desc(schema.userProgress.readinessScore))
      .limit(limit)
  }
}

// Twitter Growth System Queries
export class TwitterQueries {
  constructor(private db: Database) {}

  /**
   * Get pending engagement opportunities sorted by relevance
   */
  async getPendingOpportunities(limit = 20) {
    return await this.db
      .select({
        id: schema.engagementOpportunities.id,
        tweetId: schema.engagementOpportunities.tweetId,
        tweetText: schema.tweets.text,
        accountUsername: schema.twitterAccounts.username,
        accountDisplayName: schema.twitterAccounts.displayName,
        opportunityType: schema.engagementOpportunities.opportunityType,
        relevanceScore: schema.engagementOpportunities.relevanceScore,
        suggestedResponse: schema.engagementOpportunities.suggestedResponse,
        aiCost: schema.engagementOpportunities.aiCost,
        createdAt: schema.engagementOpportunities.createdAt
      })
      .from(schema.engagementOpportunities)
      .innerJoin(schema.tweets, eq(schema.engagementOpportunities.tweetId, schema.tweets.id))
      .innerJoin(schema.twitterAccounts, eq(schema.engagementOpportunities.accountId, schema.twitterAccounts.id))
      .where(eq(schema.engagementOpportunities.status, 'pending'))
      .orderBy(desc(schema.engagementOpportunities.relevanceScore), desc(schema.engagementOpportunities.createdAt))
      .limit(limit)
  }

  /**
   * Record daily growth metrics
   */
  async recordDailyMetrics(params: {
    date: string
    followersCount: number
    newFollowers: number
    engagementsMade: number
    aiCosts: number
    engagementRate?: number
  }) {
    return await this.db
      .insert(schema.growthMetrics)
      .values(params)
      .onConflictDoUpdate({
        target: schema.growthMetrics.date,
        set: {
          followersCount: params.followersCount,
          newFollowers: params.newFollowers,
          engagementsMade: params.engagementsMade,
          aiCosts: params.aiCosts,
          engagementRate: params.engagementRate
        }
      })
  }

  /**
   * Get Twitter growth analytics for dashboard
   */
  async getGrowthAnalytics(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    return await this.db
      .select()
      .from(schema.growthMetrics)
      .where(gte(schema.growthMetrics.date, startDate))
      .orderBy(desc(schema.growthMetrics.date))
  }
}

// Analytics and Reporting Queries
export class AnalyticsQueries {
  constructor(private db: Database) {}

  /**
   * Get AI generation cost summary
   */
  async getAICostSummary(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    return await this.db
      .select({
        purpose: schema.aiGenerationLog.purpose,
        model: schema.aiGenerationLog.model,
        totalCosts: sql<number>`SUM(${schema.aiGenerationLog.costCents}) / 100.0`,
        totalGenerations: sql<number>`COUNT(*)`,
        avgCost: sql<number>`AVG(${schema.aiGenerationLog.costCents}) / 100.0`,
        successRate: sql<number>`AVG(CAST(${schema.aiGenerationLog.success} AS REAL))`
      })
      .from(schema.aiGenerationLog)
      .where(gte(schema.aiGenerationLog.createdAt, startDate))
      .groupBy(schema.aiGenerationLog.purpose, schema.aiGenerationLog.model)
      .orderBy(desc(sql`totalCosts`))
  }

  /**
   * Get question performance analytics
   */
  async getQuestionAnalytics(examId: number) {
    return await this.db
      .select({
        id: schema.questions.id,
        text: schema.questions.text,
        difficulty: schema.questions.difficulty,
        totalAttempts: schema.questions.totalAttempts,
        correctAttempts: schema.questions.correctAttempts,
        successRate: sql<number>`
          CASE 
            WHEN ${schema.questions.totalAttempts} > 0 
            THEN CAST(${schema.questions.correctAttempts} AS REAL) / ${schema.questions.totalAttempts}
            ELSE 0 
          END
        `,
        avgTimeSeconds: schema.questions.avgTimeSeconds,
        discriminationIndex: schema.questions.discriminationIndex,
        objectiveName: schema.objectives.name
      })
      .from(schema.questions)
      .innerJoin(schema.objectives, eq(schema.questions.objectiveId, schema.objectives.id))
      .where(
        and(
          eq(schema.questions.examId, examId),
          gt(schema.questions.totalAttempts, 10) // Only questions with sufficient data
        )
      )
      .orderBy(asc(sql`successRate`)) // Hardest questions first
  }
}

// Export query classes for use in API routes
export function createQueries(db: Database) {
  return {
    study: new StudyQueries(db),
    progress: new ProgressQueries(db),
    twitter: new TwitterQueries(db),
    analytics: new AnalyticsQueries(db)
  }
}