import { sql, relations } from 'drizzle-orm'
import { integer, text, real, sqliteTable, index } from 'drizzle-orm/sqlite-core'
import type { QuestionType, ReviewStatus, QuestionAnswer } from './types'

export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  objectiveId: integer('objective_id').notNull().references(() => objectives.id, { onDelete: 'cascade' }),
  
  // Question Content
  text: text('text').notNull(),
  type: text('type').$type<QuestionType>().default('multiple_choice'),
  
  // Answers (JSON format for flexibility)
  // Format: [{"id": "a", "text": "Answer", "isCorrect": true, "explanation": "..."}]
  answers: text('answers', { mode: 'json' }).$type<QuestionAnswer[]>().notNull(),
  
  // Explanation & References
  explanation: text('explanation'),
  reference: text('reference'), // 'CompTIA Network+ Study Guide, Chapter 5'
  externalLink: text('external_link'), // URL to documentation
  
  // Difficulty & Classification
  difficulty: integer('difficulty').default(3), // 1-5 scale
  tags: text('tags', { mode: 'json' }).$type<string[]>().default(sql`'[]'`),
  
  // AI Generation Tracking
  aiGenerated: integer('ai_generated', { mode: 'boolean' }).default(false),
  aiModel: text('ai_model'), // 'qwen-2.5-72b'
  aiPromptVersion: text('ai_prompt_version'), // 'v1.2'
  aiConfidenceScore: real('ai_confidence_score'), // 0-1
  
  // Quality Metrics
  reviewStatus: text('review_status').$type<ReviewStatus>().default('pending'),
  reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  
  // Performance Tracking
  totalAttempts: integer('total_attempts').default(0),
  correctAttempts: integer('correct_attempts').default(0),
  avgTimeSeconds: integer('avg_time_seconds').default(0),
  discriminationIndex: real('discrimination_index'), // Statistical quality measure
  
  // Media Attachments (future expansion)
  imageUrl: text('image_url'),
  diagramData: text('diagram_data', { mode: 'json' }),
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isBeta: integer('is_beta', { mode: 'boolean' }).default(false),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Critical indexes for <200ms query performance
  examObjectiveIdx: index('idx_questions_exam_objective').on(
    table.examId, table.objectiveId, table.isActive
  ),
  difficultyIdx: index('idx_questions_difficulty').on(
    table.examId, table.difficulty, table.isActive
  ),
  reviewIdx: index('idx_questions_review').on(
    table.reviewStatus, table.aiGenerated
  ),
  performanceIdx: index('idx_questions_performance').on(
    table.discriminationIndex
  ),
  tagsIdx: index('idx_questions_tags').on(table.tags),
  activeIdx: index('idx_questions_active').on(table.isActive, table.isBeta)
}))

export const questionsRelations = relations(questions, ({ one, many }) => ({
  // Parent relationships
  exam: one(exams, {
    fields: [questions.examId],
    references: [exams.id]
  }),
  objective: one(objectives, {
    fields: [questions.objectiveId],
    references: [objectives.id]
  }),
  reviewer: one(users, {
    fields: [questions.reviewedBy],
    references: [users.id],
    relationName: 'reviewer'
  }),
  
  // User interaction relationships
  userAnswers: many(userAnswers)
}))

// Import statements for relations
import { exams } from './exams'
import { objectives } from './objectives'
import { users } from './users'
import { userAnswers } from './user-answers'

export type Question = typeof questions.$inferSelect
export type NewQuestion = typeof questions.$inferInsert