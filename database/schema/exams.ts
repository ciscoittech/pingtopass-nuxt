import { sql, relations } from 'drizzle-orm'
import { integer, text, real, sqliteTable, index, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const exams = sqliteTable('exams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // Identification
  vendorId: text('vendor_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  
  // Configuration
  passingScore: real('passing_score').default(0.65),
  questionCount: integer('question_count').default(65),
  timeLimitMinutes: integer('time_limit_minutes').default(90),
  
  // Metadata
  version: text('version'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  difficultyLevel: integer('difficulty_level').default(3),
  prerequisites: text('prerequisites', { mode: 'json' }).$type<string[]>(),
  
  // Pricing
  priceCents: integer('price_cents').default(0),
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isBeta: integer('is_beta', { mode: 'boolean' }).default(false),
  
  // Statistics
  totalAttempts: integer('total_attempts').default(0),
  passRate: real('pass_rate').default(0),
  avgScore: real('avg_score').default(0),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Unique constraint on vendor + code
  vendorCodeIdx: uniqueIndex('idx_exams_vendor_code').on(table.vendorId, table.code),
  
  // Performance indexes
  vendorIdx: index('idx_exams_vendor').on(table.vendorId, table.isActive),
  activeIdx: index('idx_exams_active').on(table.isActive, table.isBeta),
  difficultyIdx: index('idx_exams_difficulty').on(table.difficultyLevel, table.isActive)
}))

export const examsRelations = relations(exams, ({ many }) => ({
  objectives: many(objectives),
  questions: many(questions),
  studySessions: many(studySessions),
  testAttempts: many(testAttempts),
  userProgress: many(userProgress)
}))

// Import statements for relations
import { objectives } from './objectives'
import { questions } from './questions'
import { studySessions } from './study-sessions'
import { testAttempts } from './test-attempts'
import { userProgress } from './user-progress'

export type Exam = typeof exams.$inferSelect
export type NewExam = typeof exams.$inferInsert