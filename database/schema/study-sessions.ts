import { sql, relations } from 'drizzle-orm'
import { integer, text, real, sqliteTable, index } from 'drizzle-orm/sqlite-core'
import type { StudyMode, SessionStatus, ObjectiveScore, DifficultyFilter } from './types'

export const studySessions = sqliteTable('study_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  
  // Session Configuration
  mode: text('mode').$type<StudyMode>().default('practice'),
  objectives: text('objectives', { mode: 'json' }).$type<number[]>(), // Array of objective IDs
  difficultyFilter: text('difficulty_filter', { mode: 'json' }).$type<DifficultyFilter>(),
  questionCount: integer('question_count').default(20),
  
  // Progress Tracking
  totalQuestions: integer('total_questions').default(0),
  correctAnswers: integer('correct_answers').default(0),
  skippedQuestions: integer('skipped_questions').default(0),
  flaggedQuestions: integer('flagged_questions').default(0),
  
  // Time Tracking
  timeSpentSeconds: integer('time_spent_seconds').default(0),
  avgTimePerQuestion: real('avg_time_per_question'),
  
  // Performance Metrics
  accuracy: real('accuracy'), // Calculated: correct/total
  streakCount: integer('streak_count').default(0),
  maxStreak: integer('max_streak').default(0),
  
  // Mastery Tracking (JSON object)
  // Format: {"1": 0.85, "2": 0.72} (objective_id: score)
  objectiveScores: text('objective_scores', { mode: 'json' }).$type<ObjectiveScore>().default(sql`'{}'`),
  
  // Session State
  status: text('status').$type<SessionStatus>().default('active'),
  currentQuestionId: integer('current_question_id'),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  lastActivity: integer('last_activity', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  completedAt: integer('completed_at', { mode: 'timestamp' })
}, (table) => ({
  // Performance indexes for session management
  userExamIdx: index('idx_sessions_user_exam').on(table.userId, table.examId, table.status),
  activeIdx: index('idx_sessions_active').on(table.status, table.lastActivity),
  performanceIdx: index('idx_sessions_performance').on(table.userId, table.accuracy),
  userStatusIdx: index('idx_sessions_user_status').on(table.userId, table.status, table.createdAt)
}))

export const studySessionsRelations = relations(studySessions, ({ one, many }) => ({
  // Parent relationships
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id]
  }),
  exam: one(exams, {
    fields: [studySessions.examId],
    references: [exams.id]
  }),
  currentQuestion: one(questions, {
    fields: [studySessions.currentQuestionId],
    references: [questions.id]
  }),
  
  // Related user answers in this session
  userAnswers: many(userAnswers)
}))

// Import statements for relations
import { users } from './users'
import { exams } from './exams'
import { questions } from './questions'
import { userAnswers } from './user-answers'

export type StudySession = typeof studySessions.$inferSelect
export type NewStudySession = typeof studySessions.$inferInsert