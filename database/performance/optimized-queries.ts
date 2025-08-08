// Optimized Query Patterns for <200ms Performance
// Eliminates N+1 queries and optimizes complex joins

import { and, eq, gt, gte, lt, lte, inArray, notInArray, desc, asc, sql, between, isNull, exists, not } from 'drizzle-orm'
import type { Database } from '../utils/connection'
import * as schema from '../schema'
import type { StudyMode, DifficultyFilter } from '../schema/types'

// Performance-optimized Study Queries
export class OptimizedStudyQueries {
  constructor(private db: Database) {}

  /**
   * Ultra-fast study questions retrieval - Target: <50ms
   * Eliminates N+1 queries with single optimized query
   */
  async getOptimizedStudyQuestions(params: {
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

    // Single optimized query that replaces expensive NOT IN subquery
    // Uses NOT EXISTS for better performance with proper indexes
    const recentCutoff = new Date(Date.now() - excludeRecentHours * 60 * 60 * 1000)
    
    const baseConditions = [
      eq(schema.questions.examId, examId),
      eq(schema.questions.isActive, true),
      eq(schema.questions.reviewStatus, 'approved'),
      between(schema.questions.difficulty, difficulty.min, difficulty.max)
    ]

    // Add objective filtering if specified
    if (objectiveIds.length > 0) {
      baseConditions.push(inArray(schema.questions.objectiveId, objectiveIds))
    }

    // Use NOT EXISTS instead of NOT IN for better performance
    const excludeRecentCondition = not(
      exists(
        this.db
          .select({ id: schema.userAnswers.id })
          .from(schema.userAnswers)
          .where(
            and(
              eq(schema.userAnswers.userId, userId),
              eq(schema.userAnswers.questionId, schema.questions.id),
              gt(schema.userAnswers.answeredAt, recentCutoff)
            )
          )
      )
    )

    // Optimize ordering based on study mode
    let orderByClause
    switch (mode) {
      case 'weak_areas':
        // Questions user has struggled with (low success rate)
        orderByClause = [
          sql`CAST(correct_attempts AS REAL) / NULLIF(total_attempts, 0) ASC`,
          sql`total_attempts DESC`,
          sql`RANDOM()`
        ]
        break
      case 'speed_drill':
        // Easier questions first for speed practice
        orderByClause = [asc(schema.questions.difficulty), sql`RANDOM()`]
        break
      default:
        // Random order for practice mode
        orderByClause = [sql`RANDOM()`]
    }

    // Single optimized query with covering index
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
        tags: schema.questions.tags,
        // Include objective name to avoid additional query
        objectiveName: schema.objectives.name,
        objectiveCode: schema.objectives.code
      })
      .from(schema.questions)
      .innerJoin(schema.objectives, eq(schema.questions.objectiveId, schema.objectives.id))
      .where(and(...baseConditions, excludeRecentCondition))
      .orderBy(...orderByClause)
      .limit(limit)
  }

  /**
   * Batch answer recording with optimized statistics update
   * Target: <100ms for single answer, supports batch operations
   */
  async recordAnswerOptimized(params: {
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
    const startTime = performance.now()
    
    return await this.db.transaction(async (tx) => {
      // Insert user answer
      const [userAnswer] = await tx
        .insert(schema.userAnswers)
        .values({
          ...params,
          answeredAt: new Date()
        })
        .returning()

      // Optimized question statistics update using single atomic operation
      await tx
        .update(schema.questions)
        .set({
          totalAttempts: sql`${schema.questions.totalAttempts} + 1`,
          correctAttempts: params.isCorrect 
            ? sql`${schema.questions.correctAttempts} + 1`
            : schema.questions.correctAttempts,
          // More efficient average calculation
          avgTimeSeconds: sql`
            CASE 
              WHEN ${schema.questions.totalAttempts} = 0 THEN ${params.timeSpentSeconds}
              ELSE CAST((${schema.questions.avgTimeSeconds} * ${schema.questions.totalAttempts} + ${params.timeSpentSeconds}) AS INTEGER) / (${schema.questions.totalAttempts} + 1)
            END
          `,
          updatedAt: new Date()
        })
        .where(eq(schema.questions.id, params.questionId))

      console.log(`Answer recorded in ${performance.now() - startTime}ms`)
      return userAnswer
    })
  }

  /**
   * Bulk answer recording for better batch performance
   * Processes multiple answers in single transaction
   */
  async recordAnswersBatch(answers: Array<{
    userId: number
    questionId: number
    studySessionId?: number
    testAttemptId?: number
    selectedAnswer: string
    isCorrect: boolean
    timeSpentSeconds: number
    confidenceLevel?: number
  }>) {
    return await this.db.transaction(async (tx) => {
      // Batch insert user answers
      const userAnswers = await tx
        .insert(schema.userAnswers)
        .values(
          answers.map(answer => ({
            ...answer,
            answeredAt: new Date()
          }))
        )
        .returning()

      // Batch update question statistics efficiently
      for (const answer of answers) {
        await tx
          .update(schema.questions)
          .set({
            totalAttempts: sql`${schema.questions.totalAttempts} + 1`,
            correctAttempts: answer.isCorrect 
              ? sql`${schema.questions.correctAttempts} + 1`
              : schema.questions.correctAttempts,
            avgTimeSeconds: sql`
              CASE 
                WHEN ${schema.questions.totalAttempts} = 0 THEN ${answer.timeSpentSeconds}
                ELSE CAST((${schema.questions.avgTimeSeconds} * ${schema.questions.totalAttempts} + ${answer.timeSpentSeconds}) AS INTEGER) / (${schema.questions.totalAttempts} + 1)
              END
            `,
            updatedAt: new Date()
          })
          .where(eq(schema.questions.id, answer.questionId))
      }

      return userAnswers
    })
  }

  /**
   * Optimized session progress calculation - Target: <150ms
   * Single query with aggregations instead of multiple round trips
   */
  async updateSessionProgressOptimized(sessionId: number) {
    return await this.db.transaction(async (tx) => {
      // Single query to get all session statistics and objective data
      const sessionStats = await tx
        .select({
          userId: schema.studySessions.userId,
          examId: schema.studySessions.examId,
          totalAnswers: sql<number>`COUNT(${schema.userAnswers.id})`,
          correctAnswers: sql<number>`SUM(CASE WHEN ${schema.userAnswers.isCorrect} THEN 1 ELSE 0 END)`,
          totalTime: sql<number>`SUM(${schema.userAnswers.timeSpentSeconds})`,
          avgTime: sql<number>`AVG(${schema.userAnswers.timeSpentSeconds})`,
          // Objective scores calculated in single query
          objectiveScores: sql<string>`JSON_GROUP_OBJECT(
            ${schema.questions.objectiveId},
            printf('%.2f', 
              CAST(SUM(CASE WHEN ${schema.userAnswers.isCorrect} THEN 1 ELSE 0 END) AS REAL) / 
              COUNT(${schema.userAnswers.id})
            )
          )`
        })
        .from(schema.studySessions)
        .leftJoin(schema.userAnswers, eq(schema.userAnswers.studySessionId, sessionId))
        .leftJoin(schema.questions, eq(schema.userAnswers.questionId, schema.questions.id))
        .where(eq(schema.studySessions.id, sessionId))
        .groupBy(
          schema.studySessions.id, 
          schema.studySessions.userId, 
          schema.studySessions.examId
        )
        .limit(1)

      if (!sessionStats.length) return null

      const stats = sessionStats[0]
      
      if (stats.totalAnswers === 0) return null

      const accuracy = stats.correctAnswers / stats.totalAnswers
      const avgTime = stats.avgTime || 0
      
      // Parse objective scores from JSON
      let objectiveScores = {}
      try {
        objectiveScores = JSON.parse(stats.objectiveScores || '{}')
      } catch {
        objectiveScores = {}
      }

      // Update session with calculated metrics
      const [updatedSession] = await tx
        .update(schema.studySessions)
        .set({
          totalQuestions: stats.totalAnswers,
          correctAnswers: stats.correctAnswers,
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

// Performance-optimized Progress Queries
export class OptimizedProgressQueries {
  constructor(private db: Database) {}

  /**
   * Get comprehensive user progress with single query
   * Eliminates multiple round trips
   */
  async getUserProgressOptimized(userId: number, examId: number) {
    // Single query with all related data
    const result = await this.db
      .select({
        // Progress data
        progress: {
          id: schema.userProgress.id,
          totalQuestionsSeen: schema.userProgress.totalQuestionsSeen,
          totalCorrect: schema.userProgress.totalCorrect,
          overallAccuracy: schema.userProgress.overallAccuracy,
          readinessScore: schema.userProgress.readinessScore,
          totalStudyMinutes: schema.userProgress.totalStudyMinutes,
          lastStudyDate: schema.userProgress.lastStudyDate,
          objectiveMastery: schema.userProgress.objectiveMastery,
          weakTopics: schema.userProgress.weakTopics,
          bestScore: schema.userProgress.bestScore,
          testsPasseds: schema.userProgress.testsPassed
        },
        // Exam metadata
        exam: {
          name: schema.exams.name,
          code: schema.exams.code,
          passingScore: schema.exams.passingScore,
          questionCount: schema.exams.questionCount
        },
        // Recent activity
        recentActivity: sql<number>`
          COUNT(CASE WHEN ${schema.userAnswers.answeredAt} > datetime('now', '-7 days') THEN 1 END)
        `,
        // Current streak
        currentStreak: sql<number>`
          COALESCE(
            (SELECT COUNT(*) 
             FROM ${schema.userAnswers} ua2 
             WHERE ua2.user_id = ${userId} 
             AND ua2.is_correct = 1
             AND ua2.answered_at > (
               SELECT COALESCE(MAX(answered_at), '1900-01-01')
               FROM ${schema.userAnswers} ua3
               WHERE ua3.user_id = ${userId} AND ua3.is_correct = 0
             )
            ), 0
          )
        `
      })
      .from(schema.userProgress)
      .innerJoin(schema.exams, eq(schema.userProgress.examId, schema.exams.id))
      .leftJoin(
        schema.userAnswers, 
        and(
          eq(schema.userAnswers.userId, schema.userProgress.userId),
          sql`${schema.userAnswers.questionId} IN (
            SELECT id FROM ${schema.questions} WHERE exam_id = ${examId}
          )`
        )
      )
      .where(
        and(
          eq(schema.userProgress.userId, userId),
          eq(schema.userProgress.examId, examId)
        )
      )
      .groupBy(schema.userProgress.id, schema.exams.id)
      .limit(1)

    return result[0] || null
  }

  /**
   * Optimized leaderboard query with single efficient query
   */
  async getExamLeaderboardOptimized(examId: number, limit = 10) {
    return await this.db
      .select({
        userId: schema.userProgress.userId,
        userName: schema.users.name,
        userPicture: schema.users.picture,
        overallAccuracy: schema.userProgress.overallAccuracy,
        readinessScore: schema.userProgress.readinessScore,
        totalStudyMinutes: schema.userProgress.totalStudyMinutes,
        bestScore: schema.userProgress.bestScore,
        rank: sql<number>`ROW_NUMBER() OVER (ORDER BY ${schema.userProgress.readinessScore} DESC)`,
        // Additional metrics in single query
        weeklyActivity: sql<number>`
          COALESCE((
            SELECT COUNT(*) 
            FROM ${schema.userAnswers} ua
            INNER JOIN ${schema.questions} q ON ua.question_id = q.id
            WHERE ua.user_id = ${schema.userProgress.userId}
            AND q.exam_id = ${examId}
            AND ua.answered_at > datetime('now', '-7 days')
          ), 0)
        `
      })
      .from(schema.userProgress)
      .innerJoin(schema.users, eq(schema.userProgress.userId, schema.users.id))
      .where(
        and(
          eq(schema.userProgress.examId, examId),
          gt(schema.userProgress.totalQuestionsSeen, 50)
        )
      )
      .orderBy(desc(schema.userProgress.readinessScore))
      .limit(limit)
  }
}

// Optimized Twitter Analytics Queries
export class OptimizedTwitterQueries {
  constructor(private db: Database) {}

  /**
   * Get engagement opportunities with all related data in single query
   * Target: <150ms
   */
  async getPendingOpportunitiesOptimized(limit = 20) {
    return await this.db
      .select({
        id: schema.engagementOpportunities.id,
        tweetId: schema.engagementOpportunities.tweetId,
        opportunityType: schema.engagementOpportunities.opportunityType,
        relevanceScore: schema.engagementOpportunities.relevanceScore,
        suggestedResponse: schema.engagementOpportunities.suggestedResponse,
        aiCost: schema.engagementOpportunities.aiCost,
        createdAt: schema.engagementOpportunities.createdAt,
        // Tweet data
        tweetText: schema.tweets.text,
        tweetMetrics: schema.tweets.metrics,
        tweetCreatedAt: schema.tweets.createdAt,
        // Account data  
        accountUsername: schema.twitterAccounts.username,
        accountDisplayName: schema.twitterAccounts.displayName,
        accountFollowers: schema.twitterAccounts.followersCount,
        accountBio: schema.twitterAccounts.bio,
        // Calculated relevance factors
        engagementPotential: sql<number>`
          CASE 
            WHEN ${schema.twitterAccounts.followersCount} > 10000 THEN ${schema.engagementOpportunities.relevanceScore} * 1.5
            WHEN ${schema.twitterAccounts.followersCount} > 1000 THEN ${schema.engagementOpportunities.relevanceScore} * 1.2
            ELSE ${schema.engagementOpportunities.relevanceScore}
          END
        `
      })
      .from(schema.engagementOpportunities)
      .innerJoin(schema.tweets, eq(schema.engagementOpportunities.tweetId, schema.tweets.id))
      .innerJoin(schema.twitterAccounts, eq(schema.engagementOpportunities.accountId, schema.twitterAccounts.id))
      .where(eq(schema.engagementOpportunities.status, 'pending'))
      .orderBy(
        desc(sql`engagementPotential`), 
        desc(schema.engagementOpportunities.createdAt)
      )
      .limit(limit)
  }

  /**
   * Optimized growth analytics with time-series aggregation
   */
  async getGrowthAnalyticsOptimized(days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0]

    return await this.db
      .select({
        date: schema.growthMetrics.date,
        followersCount: schema.growthMetrics.followersCount,
        newFollowers: schema.growthMetrics.newFollowers,
        engagementsMade: schema.growthMetrics.engagementsMade,
        aiCosts: schema.growthMetrics.aiCosts,
        engagementRate: schema.growthMetrics.engagementRate,
        // Calculated metrics
        costPerFollower: sql<number>`
          CASE 
            WHEN ${schema.growthMetrics.newFollowers} > 0 
            THEN ${schema.growthMetrics.aiCosts} / ${schema.growthMetrics.newFollowers}
            ELSE 0 
          END
        `,
        // 7-day rolling averages
        rollingAvgFollowers: sql<number>`
          AVG(${schema.growthMetrics.newFollowers}) 
          OVER (ORDER BY ${schema.growthMetrics.date} ROWS 6 PRECEDING)
        `,
        rollingAvgCosts: sql<number>`
          AVG(${schema.growthMetrics.aiCosts}) 
          OVER (ORDER BY ${schema.growthMetrics.date} ROWS 6 PRECEDING)
        `
      })
      .from(schema.growthMetrics)
      .where(gte(schema.growthMetrics.date, startDate))
      .orderBy(desc(schema.growthMetrics.date))
  }
}

// Export optimized query factory
export function createOptimizedQueries(db: Database) {
  return {
    study: new OptimizedStudyQueries(db),
    progress: new OptimizedProgressQueries(db),
    twitter: new OptimizedTwitterQueries(db)
  }
}