import { sql, relations } from 'drizzle-orm'
import { integer, text, real, sqliteTable, index } from 'drizzle-orm/sqlite-core'

// AI Generation Log for cost tracking and optimization
export const aiGenerationLog = sqliteTable('ai_generation_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // Request Details
  purpose: text('purpose').notNull(), // 'question_generation', 'explanation_enhancement', 'twitter_reply'
  model: text('model').notNull(), // 'qwen-2.5-72b', 'claude-3-haiku'
  promptTokens: integer('prompt_tokens'),
  completionTokens: integer('completion_tokens'),
  totalTokens: integer('total_tokens'),
  
  // Cost Tracking
  costCents: real('cost_cents'), // Cost in cents (USD)
  
  // Content References
  examId: integer('exam_id').references(() => exams.id, { onDelete: 'set null' }),
  objectiveId: integer('objective_id').references(() => objectives.id, { onDelete: 'set null' }),
  questionIds: text('question_ids', { mode: 'json' }).$type<number[]>(), // Generated question IDs
  
  // Twitter References
  tweetId: text('tweet_id'), // For Twitter-related generations
  opportunityId: text('opportunity_id'), // For engagement opportunities
  
  // Quality Metrics
  success: integer('success', { mode: 'boolean' }).default(true),
  errorMessage: text('error_message'),
  generationTimeMs: integer('generation_time_ms'),
  
  // Request Metadata
  requestId: text('request_id'),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  
  // Timestamp
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Performance indexes for cost analysis and monitoring
  dateIdx: index('idx_ai_log_date').on(table.createdAt),
  costIdx: index('idx_ai_log_cost').on(table.createdAt, table.costCents),
  purposeIdx: index('idx_ai_log_purpose').on(table.purpose, table.createdAt),
  modelIdx: index('idx_ai_log_model').on(table.model, table.createdAt),
  userIdx: index('idx_ai_log_user').on(table.userId, table.createdAt),
  successIdx: index('idx_ai_log_success').on(table.success, table.createdAt)
}))

// Comprehensive audit log for compliance and debugging
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // Actor Information
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionId: text('session_id'),
  
  // Action Details
  action: text('action').notNull(), // 'user.login', 'question.create', 'payment.success', 'twitter.engagement'
  entityType: text('entity_type'), // 'user', 'question', 'exam', 'tweet', 'payment'
  entityId: text('entity_id'), // Can be integer or text ID
  
  // Change Details (for data modifications)
  oldValues: text('old_values', { mode: 'json' }), // JSON of previous values
  newValues: text('new_values', { mode: 'json' }), // JSON of new values
  
  // Additional Context
  metadata: text('metadata', { mode: 'json' }), // Additional context data
  
  // Request Information
  requestId: text('request_id'),
  method: text('method'), // HTTP method
  path: text('path'), // Request path
  
  // Result Information
  success: integer('success', { mode: 'boolean' }).default(true),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  
  // Timestamp
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  // Performance indexes for audit queries and compliance reporting
  userIdx: index('idx_audit_log_user').on(table.userId, table.createdAt),
  entityIdx: index('idx_audit_log_entity').on(table.entityType, table.entityId),
  actionIdx: index('idx_audit_log_action').on(table.action, table.createdAt),
  dateIdx: index('idx_audit_log_date').on(table.createdAt),
  sessionIdx: index('idx_audit_log_session').on(table.sessionId, table.createdAt),
  successIdx: index('idx_audit_log_success').on(table.success, table.createdAt)
}))

// Relations for audit tables
export const aiGenerationLogRelations = relations(aiGenerationLog, ({ one }) => ({
  user: one(users, {
    fields: [aiGenerationLog.userId],
    references: [users.id]
  }),
  exam: one(exams, {
    fields: [aiGenerationLog.examId],
    references: [exams.id]
  }),
  objective: one(objectives, {
    fields: [aiGenerationLog.objectiveId],
    references: [objectives.id]
  })
}))

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id]
  })
}))

// Import statements for relations
import { users } from './users'
import { exams } from './exams'
import { objectives } from './objectives'

// Type exports
export type AIGenerationLog = typeof aiGenerationLog.$inferSelect
export type NewAIGenerationLog = typeof aiGenerationLog.$inferInsert

export type AuditLog = typeof auditLog.$inferSelect
export type NewAuditLog = typeof auditLog.$inferInsert