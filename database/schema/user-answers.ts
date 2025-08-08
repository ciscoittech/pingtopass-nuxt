import { sql, relations } from 'drizzle-orm'
import { integer, text, sqliteTable, index } from 'drizzle-orm/sqlite-core'

export const userAnswers = sqliteTable('user_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  
  // Session References (one or both can be set)
  studySessionId: integer('study_session_id').references(() => studySessions.id, { onDelete: 'cascade' }),
  testAttemptId: integer('test_attempt_id').references(() => testAttempts.id, { onDelete: 'cascade' }),
  
  // Answer Details
  selectedAnswer: text('selected_answer').notNull(), // 'a' or '["a", "c"]' for multi-select
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  
  // Interaction Metrics
  timeSpentSeconds: integer('time_spent_seconds'),
  confidenceLevel: integer('confidence_level'), // 1-5 scale
  flagged: integer('flagged', { mode: 'boolean' }).default(false),
  changedAnswer: integer('changed_answer', { mode: 'boolean' }).default(false),
  
  // Learning Analytics
  attemptNumber: integer('attempt_number').default(1), // Which attempt for this question by user
  daysSinceLastSeen: integer('days_since_last_seen'),
  
  // Timestamp
  answeredAt: integer('answered_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Critical indexes for learning analytics and progress tracking
  userQuestionIdx: index('idx_user_answers_user_question').on(
    table.userId, table.questionId, table.answeredAt
  ),
  sessionIdx: index('idx_user_answers_session').on(table.studySessionId),
  testIdx: index('idx_user_answers_test').on(table.testAttemptId),
  recentIdx: index('idx_user_answers_recent').on(table.userId, table.answeredAt),
  correctnessIdx: index('idx_user_answers_correct').on(table.userId, table.isCorrect, table.answeredAt),
  performanceIdx: index('idx_user_answers_performance').on(
    table.questionId, table.isCorrect, table.timeSpentSeconds
  )
}))

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
  // Parent relationships
  user: one(users, {
    fields: [userAnswers.userId],
    references: [users.id]
  }),
  question: one(questions, {
    fields: [userAnswers.questionId],
    references: [questions.id]
  }),
  studySession: one(studySessions, {
    fields: [userAnswers.studySessionId],
    references: [studySessions.id]
  }),
  testAttempt: one(testAttempts, {
    fields: [userAnswers.testAttemptId],
    references: [testAttempts.id]
  })
}))

// Import statements for relations
import { users } from './users'
import { questions } from './questions'
import { studySessions } from './study-sessions'
import { testAttempts } from './test-attempts'

export type UserAnswer = typeof userAnswers.$inferSelect
export type NewUserAnswer = typeof userAnswers.$inferInsert