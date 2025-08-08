import { sql, relations } from 'drizzle-orm'
import { integer, text, real, sqliteTable, index } from 'drizzle-orm/sqlite-core'
import type { TestStatus, ObjectiveBreakdown } from './types'

export const testAttempts = sqliteTable('test_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  
  // Test Configuration
  questionIds: text('question_ids', { mode: 'json' }).$type<number[]>().notNull(), // Array in test order
  timeLimitMinutes: integer('time_limit_minutes'),
  passingScore: real('passing_score'),
  
  // Results
  score: real('score'), // Final percentage score (0-1)
  passed: integer('passed', { mode: 'boolean' }),
  correctCount: integer('correct_count'),
  incorrectCount: integer('incorrect_count'),
  skippedCount: integer('skipped_count'),
  
  // Detailed Scoring (JSON)
  // Format: {"1": {"correct": 8, "total": 10, "percentage": 0.8}, ...}
  objectiveBreakdown: text('objective_breakdown', { mode: 'json' }).$type<ObjectiveBreakdown>(),
  
  // Time Analysis
  totalTimeSeconds: integer('total_time_seconds'),
  timePerQuestion: text('time_per_question', { mode: 'json' }).$type<number[]>(), // Array of times per question
  
  // Question Review
  reviewEnabled: integer('review_enabled', { mode: 'boolean' }).default(true),
  certificateIssued: integer('certificate_issued', { mode: 'boolean' }).default(false),
  
  // Status
  status: text('status').$type<TestStatus>().default('in_progress'),
  
  // Timestamps
  startedAt: integer('started_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }) // When test access expires
}, (table) => ({
  // Performance indexes for test management
  userExamIdx: index('idx_test_attempts_user_exam').on(table.userId, table.examId, table.status),
  scoresIdx: index('idx_test_attempts_scores').on(table.examId, table.passed, table.score),
  statusIdx: index('idx_test_attempts_status').on(table.status, table.startedAt),
  userPassedIdx: index('idx_test_attempts_user_passed').on(table.userId, table.passed, table.score),
  completedIdx: index('idx_test_attempts_completed').on(table.completedAt)
}))

export const testAttemptsRelations = relations(testAttempts, ({ one, many }) => ({
  // Parent relationships
  user: one(users, {
    fields: [testAttempts.userId],
    references: [users.id]
  }),
  exam: one(exams, {
    fields: [testAttempts.examId],
    references: [exams.id]
  }),
  
  // Related user answers for this test
  userAnswers: many(userAnswers)
}))

// Import statements for relations
import { users } from './users'
import { exams } from './exams'
import { userAnswers } from './user-answers'

export type TestAttempt = typeof testAttempts.$inferSelect
export type NewTestAttempt = typeof testAttempts.$inferInsert