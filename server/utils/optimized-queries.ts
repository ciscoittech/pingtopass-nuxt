/**
 * Optimized Query Patterns for PingToPass
 * 
 * High-performance SQL queries optimized for:
 * - Sub-50ms response times
 * - Efficient index utilization
 * - Minimal data transfer
 * - Smart pagination
 * - Edge database performance
 */

import { smartRead, smartWrite } from './turso-replication'
import { cachedQueries } from './cache-strategy'
import type { TursoRegion } from './turso-replication'

/**
 * Study Session Query Patterns
 */
export const studyQueries = {
  /**
   * Get optimized question set for study session
   * Uses advanced filtering and smart exclusions
   */
  async getStudyQuestions(
    userId: number,
    examId: number,
    options: {
      objectiveIds?: number[]
      difficulty?: { min: number; max: number }
      excludeRecentHours?: number
      limit?: number
      prioritizeWeak?: boolean
      region?: string
    } = {}
  ) {
    const {
      objectiveIds,
      difficulty = { min: 1, max: 5 },
      excludeRecentHours = 24,
      limit = 20,
      prioritizeWeak = false,
      region
    } = options

    return smartRead(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      // Build dynamic query based on options
      let sql = `
        WITH recent_answers AS (
          SELECT DISTINCT ua.question_id
          FROM user_answers ua
          JOIN questions q ON ua.question_id = q.id
          WHERE ua.user_id = ? AND q.exam_id = ?
          AND ua.answered_at > datetime('now', '-${excludeRecentHours} hours')
        ),
        weak_objectives AS (
          SELECT json_each.value as objective_id
          FROM user_progress up, json_each(up.weak_topics)
          WHERE up.user_id = ? AND up.exam_id = ?
        )
        SELECT 
          q.id,
          q.text,
          q.type,
          q.answers,
          q.difficulty,
          q.explanation,
          q.objective_id,
          q.tags,
          o.name as objective_name,
          CASE 
            WHEN wo.objective_id IS NOT NULL THEN 1 
            ELSE 0 
          END as is_weak_area
        FROM questions q
        JOIN objectives o ON q.objective_id = o.id
        LEFT JOIN weak_objectives wo ON q.objective_id = CAST(wo.objective_id AS INTEGER)
        WHERE q.exam_id = ?
        AND q.is_active = 1
        AND q.review_status = 'approved'
        AND q.difficulty BETWEEN ? AND ?
        AND q.id NOT IN (SELECT question_id FROM recent_answers)
      `

      const args = [userId, examId, userId, examId, examId, difficulty.min, difficulty.max]

      // Add objective filtering
      if (objectiveIds?.length) {
        sql += ` AND q.objective_id IN (${objectiveIds.map(() => '?').join(',')})`
        args.push(...objectiveIds)
      }

      // Add ordering based on priority
      if (prioritizeWeak) {
        sql += ` ORDER BY is_weak_area DESC, RANDOM()`
      } else {
        sql += ` ORDER BY RANDOM()`
      }

      sql += ` LIMIT ?`
      args.push(limit)

      const result = await db.execute({ sql, args })
      return result.rows
    }, undefined, { allowStale: true })
  },

  /**
   * Create study session with intelligent question pre-loading
   */
  async createOptimizedSession(
    userId: number,
    examId: number,
    sessionData: {
      mode: 'practice' | 'review' | 'speed_drill' | 'weak_areas' | 'custom'
      questionCount: number
      objectives?: number[]
      difficulty?: { min: number; max: number }
    }
  ) {
    return smartWrite(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      // Start transaction for atomic session creation
      const sessionResult = await db.execute({
        sql: `
          INSERT INTO study_sessions (
            user_id, exam_id, mode, question_count, objectives, difficulty_filter,
            created_at, last_activity, status
          )
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'active')
          RETURNING id
        `,
        args: [
          userId,
          examId,
          sessionData.mode,
          sessionData.questionCount,
          JSON.stringify(sessionData.objectives || []),
          JSON.stringify(sessionData.difficulty || { min: 1, max: 5 })
        ]
      })

      const sessionId = sessionResult.rows[0]?.id

      // Pre-fetch optimized questions for the session
      const questions = await studyQueries.getStudyQuestions(userId, examId, {
        objectiveIds: sessionData.objectives,
        difficulty: sessionData.difficulty,
        limit: sessionData.questionCount * 1.2, // 20% buffer for optimal selection
        prioritizeWeak: sessionData.mode === 'weak_areas'
      })

      return { sessionId, questions }
    })
  },

  /**
   * Update session progress with performance metrics
   */
  async updateSessionProgress(
    sessionId: number,
    progress: {
      totalQuestions: number
      correctAnswers: number
      timeSpentSeconds: number
      currentQuestionId?: number
      objectiveScores?: Record<string, number>
    }
  ) {
    return smartWrite(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      const accuracy = progress.totalQuestions > 0 ? 
        progress.correctAnswers / progress.totalQuestions : 0
      
      const avgTimePerQuestion = progress.totalQuestions > 0 ?
        progress.timeSpentSeconds / progress.totalQuestions : 0

      await db.execute({
        sql: `
          UPDATE study_sessions
          SET 
            total_questions = ?,
            correct_answers = ?,
            time_spent_seconds = ?,
            accuracy = ?,
            avg_time_per_question = ?,
            current_question_id = ?,
            objective_scores = ?,
            last_activity = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [
          progress.totalQuestions,
          progress.correctAnswers,
          progress.timeSpentSeconds,
          accuracy,
          avgTimePerQuestion,
          progress.currentQuestionId || null,
          JSON.stringify(progress.objectiveScores || {}),
          sessionId
        ]
      })
    })
  }
}

/**
 * User Progress Analytics Queries
 */
export const analyticsQueries = {
  /**
   * Get comprehensive user dashboard data
   * Single query to minimize database round trips
   */
  async getUserDashboard(userId: number, region?: string) {
    return smartRead(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      const result = await db.execute({
        sql: `
          WITH user_stats AS (
            SELECT 
              up.exam_id,
              up.total_questions_seen,
              up.overall_accuracy,
              up.readiness_score,
              up.study_days_count,
              up.total_study_minutes,
              up.tests_taken,
              up.best_score,
              up.last_study_date,
              up.updated_at as progress_updated
            FROM user_progress up
            WHERE up.user_id = ?
          ),
          recent_sessions AS (
            SELECT 
              ss.exam_id,
              COUNT(*) as session_count,
              AVG(ss.accuracy) as avg_session_accuracy,
              MAX(ss.last_activity) as last_session
            FROM study_sessions ss
            WHERE ss.user_id = ? 
            AND ss.created_at > datetime('now', '-7 days')
            AND ss.status = 'completed'
            GROUP BY ss.exam_id
          ),
          active_sessions AS (
            SELECT exam_id, COUNT(*) as active_count
            FROM study_sessions
            WHERE user_id = ? AND status IN ('active', 'paused')
            GROUP BY exam_id
          )
          SELECT 
            e.id as exam_id,
            e.name as exam_name,
            e.vendor_id,
            e.code,
            e.question_count,
            e.time_limit_minutes,
            us.total_questions_seen,
            us.overall_accuracy,
            us.readiness_score,
            us.study_days_count,
            us.total_study_minutes,
            us.tests_taken,
            us.best_score,
            us.last_study_date,
            rs.session_count as recent_sessions,
            rs.avg_session_accuracy,
            rs.last_session,
            COALESCE(acs.active_count, 0) as active_sessions,
            -- Calculated fields
            CASE 
              WHEN us.readiness_score >= 0.8 THEN 'ready'
              WHEN us.readiness_score >= 0.6 THEN 'almost_ready'
              WHEN us.readiness_score >= 0.4 THEN 'progressing'
              ELSE 'needs_work'
            END as readiness_status,
            ROUND(
              CASE 
                WHEN us.total_questions_seen > 0 
                THEN (us.total_questions_seen * 100.0 / e.question_count)
                ELSE 0 
              END, 1
            ) as coverage_percent
          FROM exams e
          LEFT JOIN user_stats us ON e.id = us.exam_id
          LEFT JOIN recent_sessions rs ON e.id = rs.exam_id
          LEFT JOIN active_sessions acs ON e.id = acs.exam_id
          WHERE e.is_active = 1 
          AND (us.exam_id IS NOT NULL OR e.id IN (
            SELECT DISTINCT exam_id FROM study_sessions WHERE user_id = ?
          ))
          ORDER BY 
            COALESCE(us.progress_updated, '1900-01-01') DESC,
            e.total_attempts DESC
        `,
        args: [userId, userId, userId, userId]
      })

      return result.rows
    }, undefined, { allowStale: true })
  },

  /**
   * Get detailed exam performance analytics
   */
  async getExamAnalytics(userId: number, examId: number, region?: string) {
    return smartRead(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      const result = await db.execute({
        sql: `
          WITH objective_performance AS (
            SELECT 
              o.id as objective_id,
              o.name as objective_name,
              o.weight,
              COUNT(ua.id) as questions_answered,
              SUM(CASE WHEN ua.is_correct THEN 1 ELSE 0 END) as correct_answers,
              AVG(ua.time_spent_seconds) as avg_time_seconds,
              AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as accuracy
            FROM objectives o
            LEFT JOIN questions q ON o.id = q.objective_id
            LEFT JOIN user_answers ua ON q.id = ua.question_id AND ua.user_id = ?
            WHERE o.exam_id = ? AND o.is_active = 1
            GROUP BY o.id, o.name, o.weight
          ),
          difficulty_performance AS (
            SELECT 
              q.difficulty,
              COUNT(ua.id) as questions_answered,
              AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as accuracy,
              AVG(ua.time_spent_seconds) as avg_time_seconds
            FROM questions q
            LEFT JOIN user_answers ua ON q.id = ua.question_id AND ua.user_id = ?
            WHERE q.exam_id = ? AND q.is_active = 1
            GROUP BY q.difficulty
            ORDER BY q.difficulty
          ),
          recent_trend AS (
            SELECT 
              DATE(ua.answered_at) as study_date,
              COUNT(*) as questions_count,
              AVG(CASE WHEN ua.is_correct THEN 1.0 ELSE 0.0 END) as daily_accuracy
            FROM user_answers ua
            JOIN questions q ON ua.question_id = q.id
            WHERE ua.user_id = ? AND q.exam_id = ?
            AND ua.answered_at > datetime('now', '-30 days')
            GROUP BY DATE(ua.answered_at)
            ORDER BY study_date DESC
            LIMIT 30
          )
          SELECT 
            'objective_performance' as data_type,
            json_group_array(
              json_object(
                'objective_id', objective_id,
                'objective_name', objective_name,
                'weight', weight,
                'questions_answered', questions_answered,
                'accuracy', ROUND(accuracy, 3),
                'avg_time_seconds', ROUND(avg_time_seconds, 1),
                'mastery_level', 
                  CASE 
                    WHEN accuracy >= 0.9 THEN 'mastered'
                    WHEN accuracy >= 0.8 THEN 'proficient'
                    WHEN accuracy >= 0.7 THEN 'developing'
                    ELSE 'needs_work'
                  END
              )
            ) as data
          FROM objective_performance
          
          UNION ALL
          
          SELECT 
            'difficulty_performance' as data_type,
            json_group_array(
              json_object(
                'difficulty', difficulty,
                'questions_answered', questions_answered,
                'accuracy', ROUND(accuracy, 3),
                'avg_time_seconds', ROUND(avg_time_seconds, 1)
              )
            ) as data
          FROM difficulty_performance
          
          UNION ALL
          
          SELECT 
            'recent_trend' as data_type,
            json_group_array(
              json_object(
                'date', study_date,
                'questions_count', questions_count,
                'accuracy', ROUND(daily_accuracy, 3)
              )
            ) as data
          FROM recent_trend
        `,
        args: [userId, examId, userId, examId, userId, examId]
      })

      // Parse the results into structured data
      const analytics: Record<string, any> = {}
      for (const row of result.rows) {
        analytics[row.data_type as string] = JSON.parse(row.data as string)
      }

      return analytics
    }, undefined, { allowStale: true })
  }
}

/**
 * Exam and Question Management Queries
 */
export const contentQueries = {
  /**
   * Get exam with full metadata and statistics
   */
  async getExamDetails(examId: number, includeQuestionCount = false, region?: string) {
    return smartRead(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      let sql = `
        SELECT 
          e.*,
          COUNT(DISTINCT o.id) as objective_count,
          COUNT(DISTINCT q.id) as total_questions,
          AVG(q.difficulty) as avg_difficulty,
          COUNT(DISTINCT CASE WHEN q.review_status = 'approved' THEN q.id END) as approved_questions
        FROM exams e
        LEFT JOIN objectives o ON e.id = o.exam_id AND o.is_active = 1
        LEFT JOIN questions q ON e.id = q.exam_id AND q.is_active = 1
        WHERE e.id = ? AND e.is_active = 1
        GROUP BY e.id
      `

      const result = await db.execute({ sql, args: [examId] })
      
      if (result.rows.length === 0) {
        return null
      }

      const exam = result.rows[0]

      // Get objectives if requested
      const objectivesResult = await db.execute({
        sql: `
          SELECT id, code, name, description, weight, sort_order
          FROM objectives
          WHERE exam_id = ? AND is_active = 1
          ORDER BY sort_order, code
        `,
        args: [examId]
      })

      return {
        ...exam,
        objectives: objectivesResult.rows
      }
    }, undefined, { allowStale: true })
  },

  /**
   * Get question with full context and performance data
   */
  async getQuestionDetails(questionId: number, region?: string) {
    return smartRead(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      const result = await db.execute({
        sql: `
          SELECT 
            q.*,
            e.name as exam_name,
            e.code as exam_code,
            o.name as objective_name,
            o.code as objective_code,
            -- Performance metrics
            CASE 
              WHEN q.total_attempts > 0 
              THEN ROUND(q.correct_attempts * 100.0 / q.total_attempts, 1)
              ELSE 0 
            END as success_rate_percent,
            -- Difficulty assessment
            CASE 
              WHEN q.discrimination_index > 0.3 THEN 'excellent'
              WHEN q.discrimination_index > 0.2 THEN 'good'
              WHEN q.discrimination_index > 0.1 THEN 'fair'
              ELSE 'needs_review'
            END as quality_rating
          FROM questions q
          JOIN exams e ON q.exam_id = e.id
          JOIN objectives o ON q.objective_id = o.id
          WHERE q.id = ? AND q.is_active = 1
        `,
        args: [questionId]
      })

      return result.rows[0] || null
    }, undefined, { allowStale: true })
  },

  /**
   * Search questions with advanced filtering and ranking
   */
  async searchQuestions(
    searchQuery: string,
    filters: {
      examId?: number
      objectiveIds?: number[]
      difficulty?: number[]
      tags?: string[]
      reviewStatus?: string[]
      limit?: number
    } = {},
    region?: string
  ) {
    const {
      examId,
      objectiveIds,
      difficulty,
      tags,
      reviewStatus = ['approved'],
      limit = 20
    } = filters

    return smartRead(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      // Use FTS for text search, then apply filters
      let sql = `
        SELECT 
          q.id,
          q.text,
          q.difficulty,
          q.type,
          q.tags,
          q.total_attempts,
          q.correct_attempts,
          e.name as exam_name,
          o.name as objective_name,
          -- Search relevance scoring
          CASE 
            WHEN q.text LIKE ? THEN 3
            WHEN q.explanation LIKE ? THEN 2
            ELSE 1
          END as relevance_score
        FROM questions_fts fts
        JOIN questions q ON fts.rowid = q.id
        JOIN exams e ON q.exam_id = e.id
        JOIN objectives o ON q.objective_id = o.id
        WHERE questions_fts MATCH ?
        AND q.is_active = 1
      `

      const args = [`%${searchQuery}%`, `%${searchQuery}%`, searchQuery]

      // Apply filters
      if (examId) {
        sql += ` AND q.exam_id = ?`
        args.push(examId)
      }

      if (objectiveIds?.length) {
        sql += ` AND q.objective_id IN (${objectiveIds.map(() => '?').join(',')})`
        args.push(...objectiveIds)
      }

      if (difficulty?.length) {
        sql += ` AND q.difficulty IN (${difficulty.map(() => '?').join(',')})`
        args.push(...difficulty)
      }

      if (reviewStatus.length) {
        sql += ` AND q.review_status IN (${reviewStatus.map(() => '?').join(',')})`
        args.push(...reviewStatus)
      }

      // Tag filtering (JSON array contains)
      if (tags?.length) {
        for (const tag of tags) {
          sql += ` AND json_extract(q.tags, '$') LIKE ?`
          args.push(`%"${tag}"%`)
        }
      }

      sql += ` ORDER BY relevance_score DESC, rank, q.total_attempts DESC LIMIT ?`
      args.push(limit)

      const result = await db.execute({ sql, args })
      return result.rows
    }, undefined, { allowStale: true })
  }
}

/**
 * Batch Operations for Performance
 */
export const batchQueries = {
  /**
   * Batch insert user answers with progress update
   */
  async batchInsertAnswersWithProgress(
    answers: Array<{
      userId: number
      questionId: number
      studySessionId?: number
      testAttemptId?: number
      selectedAnswer: string
      isCorrect: boolean
      timeSpentSeconds?: number
    }>
  ) {
    return smartWrite(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      // Batch insert answers
      const answerInserts = answers.map(answer => ({
        sql: `
          INSERT INTO user_answers (
            user_id, question_id, study_session_id, test_attempt_id,
            selected_answer, is_correct, time_spent_seconds, answered_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        args: [
          answer.userId,
          answer.questionId,
          answer.studySessionId || null,
          answer.testAttemptId || null,
          answer.selectedAnswer,
          answer.isCorrect,
          answer.timeSpentSeconds || null
        ]
      }))

      await db.batch(answerInserts)

      // Update question statistics
      const questionUpdates = Array.from(new Set(answers.map(a => a.questionId)))
        .map(questionId => {
          const questionAnswers = answers.filter(a => a.questionId === questionId)
          const correctCount = questionAnswers.filter(a => a.isCorrect).length
          
          return {
            sql: `
              UPDATE questions 
              SET 
                total_attempts = total_attempts + ?,
                correct_attempts = correct_attempts + ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            args: [questionAnswers.length, correctCount, questionId]
          }
        })

      await db.batch(questionUpdates)

      return { inserted: answers.length, questionsUpdated: questionUpdates.length }
    })
  }
}

/**
 * Performance monitoring queries
 */
export const performanceQueries = {
  /**
   * Get slow queries and performance metrics
   */
  async getPerformanceMetrics(region?: string) {
    return smartRead(async (r: TursoRegion) => {
      const db = (await import('./db')).getDB(r)
      
      // SQLite doesn't have built-in query performance tracking
      // but we can get table statistics
      const result = await db.execute(`
        SELECT 
          name,
          (
            SELECT COUNT(*) FROM sqlite_master sm2 
            WHERE sm2.type = 'index' AND sm2.tbl_name = sm.name
          ) as index_count
        FROM sqlite_master sm
        WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `)

      return result.rows
    }, undefined, { allowStale: true })
  }
}

// Export all query collections
export const optimizedQueries = {
  study: studyQueries,
  analytics: analyticsQueries,
  content: contentQueries,
  batch: batchQueries,
  performance: performanceQueries
}