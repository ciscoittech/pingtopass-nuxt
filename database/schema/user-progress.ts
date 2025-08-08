import { sql, relations } from 'drizzle-orm'
import { integer, text, real, sqliteTable, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import type { ObjectiveMastery } from './types'

export const userProgress = sqliteTable('user_progress', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  
  // Overall Statistics
  totalQuestionsSeen: integer('total_questions_seen').default(0),
  uniqueQuestionsSeen: integer('unique_questions_seen').default(0),
  totalCorrect: integer('total_correct').default(0),
  totalIncorrect: integer('total_incorrect').default(0),
  
  // Performance Metrics
  overallAccuracy: real('overall_accuracy').default(0),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  avgTimePerQuestion: real('avg_time_per_question'),
  
  // Study Time Tracking
  totalStudyMinutes: integer('total_study_minutes').default(0),
  lastStudyDate: text('last_study_date'), // DATE format: YYYY-MM-DD
  studyDaysCount: integer('study_days_count').default(0),
  
  // Mastery Levels (JSON)
  // Format: {"1": {"level": 0.85, "questionsAnswered": 45, "lastStudied": "2024-01-15"}, ...}
  objectiveMastery: text('objective_mastery', { mode: 'json' }).$type<ObjectiveMastery>().default(sql`'{}'`),
  
  // Readiness Score (ML-calculated or rule-based)
  readinessScore: real('readiness_score').default(0),
  predictedExamScore: real('predicted_exam_score'),
  confidenceInterval: real('confidence_interval'),
  
  // Weak Areas (JSON arrays)
  weakTopics: text('weak_topics', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  recommendedObjectives: text('recommended_objectives', { mode: 'json' }).$type<number[]>().default(sql`'[]'`),
  
  // Test History Summary
  testsTaken: integer('tests_taken').default(0),
  testsPassed: integer('tests_passed').default(0),
  bestScore: real('best_score').default(0),
  avgTestScore: real('avg_test_score').default(0),
  lastTestDate: text('last_test_date'), // DATE format
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Unique constraint per user-exam combination
  userExamIdx: uniqueIndex('idx_user_progress_user_exam').on(table.userId, table.examId),
  
  // Performance indexes for dashboard and leaderboard queries  
  userIdx: index('idx_user_progress_user').on(table.userId),
  readinessIdx: index('idx_user_progress_readiness').on(table.examId, table.readinessScore),
  accuracyIdx: index('idx_user_progress_accuracy').on(table.examId, table.overallAccuracy),
  streakIdx: index('idx_user_progress_streak').on(table.examId, table.longestStreak),
  studyTimeIdx: index('idx_user_progress_study_time').on(table.examId, table.totalStudyMinutes)
}))

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  // Parent relationships
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id]
  }),
  exam: one(exams, {
    fields: [userProgress.examId],
    references: [exams.id]
  })
}))

// Import statements for relations
import { users } from './users'
import { exams } from './exams'

export type UserProgress = typeof userProgress.$inferSelect
export type NewUserProgress = typeof userProgress.$inferInsert