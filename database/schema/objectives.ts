import { sql, relations } from 'drizzle-orm'
import { integer, text, real, sqliteTable, index } from 'drizzle-orm/sqlite-core'

export const objectives = sqliteTable('objectives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  
  // Identification
  code: text('code').notNull(), // '1.0', '1.1', '1.2'
  name: text('name').notNull(),
  description: text('description'),
  
  // Weighting
  weight: real('weight').default(0.25), // Percentage weight in exam (0-1)
  questionPercentage: real('question_percentage'), // Expected % of questions
  
  // Hierarchy (for nested objectives)
  parentId: integer('parent_id').references(() => objectives.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0),
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Performance indexes for common queries
  examIdx: index('idx_objectives_exam').on(table.examId, table.isActive),
  parentIdx: index('idx_objectives_parent').on(table.parentId, table.sortOrder),
  examCodeIdx: index('idx_objectives_exam_code').on(table.examId, table.code)
}))

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  // Parent exam relationship
  exam: one(exams, {
    fields: [objectives.examId],
    references: [exams.id]
  }),
  
  // Hierarchical relationships
  parent: one(objectives, {
    fields: [objectives.parentId], 
    references: [objectives.id],
    relationName: 'parent'
  }),
  children: many(objectives, { relationName: 'parent' }),
  
  // Question relationships
  questions: many(questions)
}))

// Import statements for relations
import { exams } from './exams'
import { questions } from './questions'

export type Objective = typeof objectives.$inferSelect
export type NewObjective = typeof objectives.$inferInsert