// Dashboard-specific database schema for Turso/SQLite with Drizzle ORM
import { sqliteTable, text, integer, real, index, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ========================================
// USER PROGRESS & GAMIFICATION
// ========================================

export const userProfiles = sqliteTable('user_profiles', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  displayName: text('display_name').notNull(),
  level: integer('level').notNull().default(1),
  currentXp: integer('current_xp').notNull().default(0),
  totalXp: integer('total_xp').notNull().default(0),
  streak: integer('streak').notNull().default(0),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
  preferredTheme: text('preferred_theme', { enum: ['light', 'dark', 'system'] }).default('system'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  userIdIdx: index('idx_user_profiles_user_id').on(table.userId),
  levelIdx: index('idx_user_profiles_level').on(table.level)
}));

export const userAchievements = sqliteTable('user_achievements', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  achievementId: text('achievement_id').notNull(),
  unlockedAt: integer('unlocked_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  progress: integer('progress').notNull().default(0),
  maxProgress: integer('max_progress').notNull().default(100)
}, (table) => ({
  userAchievementIdx: uniqueIndex('idx_user_achievement').on(table.userId, table.achievementId)
}));

// ========================================
// CERTIFICATION & EXAM ENTITIES
// ========================================

export const certificationVendors = sqliteTable('certification_vendors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  logo: text('logo'),
  description: text('description'),
  websiteUrl: text('website_url'),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true)
}, (table) => ({
  nameIdx: index('idx_vendors_name').on(table.name),
  sortOrderIdx: index('idx_vendors_sort_order').on(table.sortOrder)
}));

export const certificationPaths = sqliteTable('certification_paths', {
  id: text('id').primaryKey(),
  vendorId: text('vendor_id').notNull(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(), // e.g., 'N10-008', 'SY0-701'
  description: text('description'),
  difficulty: integer('difficulty').notNull().default(1), // 1-5
  category: text('category').notNull(), // networking, security, cloud, etc.
  price: real('price').notNull().default(0),
  passScore: integer('pass_score').notNull().default(70),
  duration: integer('duration').notNull().default(90), // minutes
  totalQuestions: integer('total_questions').notNull().default(90),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  isFeatured: integer('is_featured', { mode: 'boolean' }).notNull().default(false),
  metadata: text('metadata'), // JSON string for additional data
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  vendorIdx: index('idx_paths_vendor').on(table.vendorId),
  categoryIdx: index('idx_paths_category').on(table.category),
  difficultyIdx: index('idx_paths_difficulty').on(table.difficulty),
  featuredIdx: index('idx_paths_featured').on(table.isFeatured)
}));

export const examObjectives = sqliteTable('exam_objectives', {
  id: text('id').primaryKey(),
  certificationId: text('certification_id').notNull(),
  domain: text('domain').notNull(),
  objective: text('objective').notNull(),
  weight: integer('weight').notNull().default(0), // percentage weight
  sortOrder: integer('sort_order').notNull().default(0)
}, (table) => ({
  certificationIdx: index('idx_objectives_certification').on(table.certificationId),
  domainIdx: index('idx_objectives_domain').on(table.certificationId, table.domain)
}));

// ========================================
// SESSION & TEST TRACKING
// ========================================

export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  certificationId: text('certification_id').notNull(),
  sessionType: text('session_type', { enum: ['study', 'practice', 'test'] }).notNull(),
  status: text('status', { enum: ['active', 'paused', 'completed', 'abandoned'] }).notNull().default('active'),
  startedAt: integer('started_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  endedAt: integer('ended_at', { mode: 'timestamp' }),
  duration: integer('duration').notNull().default(0), // seconds
  questionsAnswered: integer('questions_answered').notNull().default(0),
  correctAnswers: integer('correct_answers').notNull().default(0),
  currentQuestionId: text('current_question_id'),
  metadata: text('metadata'), // JSON for additional session data
  xpEarned: integer('xp_earned').notNull().default(0)
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
  certificationIdx: index('idx_sessions_certification').on(table.certificationId),
  statusIdx: index('idx_sessions_status').on(table.status),
  userCertIdx: index('idx_sessions_user_cert').on(table.userId, table.certificationId)
}));

export const testResults = sqliteTable('test_results', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id').notNull(),
  certificationId: text('certification_id').notNull(),
  score: real('score').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  totalQuestions: integer('total_questions').notNull(),
  correctAnswers: integer('correct_answers').notNull(),
  timeSpent: integer('time_spent').notNull(), // seconds
  completedAt: integer('completed_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  domainScores: text('domain_scores'), // JSON object with domain-wise scores
  weakAreas: text('weak_areas'), // JSON array of weak topics
  feedback: text('feedback')
}, (table) => ({
  sessionIdx: uniqueIndex('idx_results_session').on(table.sessionId),
  userIdx: index('idx_results_user').on(table.userId),
  certificationIdx: index('idx_results_certification').on(table.certificationId),
  userCertIdx: index('idx_results_user_cert').on(table.userId, table.certificationId),
  completedAtIdx: index('idx_results_completed').on(table.completedAt)
}));

// ========================================
// USER PROGRESS TRACKING
// ========================================

export const userCertificationProgress = sqliteTable('user_certification_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  certificationId: text('certification_id').notNull(),
  questionsAttempted: integer('questions_attempted').notNull().default(0),
  questionsCorrect: integer('questions_correct').notNull().default(0),
  totalQuestionsSeen: integer('total_questions_seen').notNull().default(0),
  averageScore: real('average_score').notNull().default(0),
  bestScore: real('best_score').notNull().default(0),
  testsCompleted: integer('tests_completed').notNull().default(0),
  testsPassed: integer('tests_passed').notNull().default(0),
  currentStreak: integer('current_streak').notNull().default(0),
  lastPracticeAt: integer('last_practice_at', { mode: 'timestamp' }),
  timeSpentTotal: integer('time_spent_total').notNull().default(0), // seconds
  progressPercentage: real('progress_percentage').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  userCertIdx: uniqueIndex('idx_progress_user_cert').on(table.userId, table.certificationId),
  progressIdx: index('idx_progress_percentage').on(table.progressPercentage)
}));

export const dailyGoals = sqliteTable('daily_goals', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD format
  targetQuestions: integer('target_questions').notNull().default(10),
  completedQuestions: integer('completed_questions').notNull().default(0),
  targetTime: integer('target_time').notNull().default(30), // minutes
  completedTime: integer('completed_time').notNull().default(0), // minutes
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  streakCount: integer('streak_count').notNull().default(0)
}, (table) => ({
  userDateIdx: uniqueIndex('idx_goals_user_date').on(table.userId, table.date),
  dateIdx: index('idx_goals_date').on(table.date)
}));

// ========================================
// QUESTION RESPONSES (for analytics)
// ========================================

export const questionResponses = sqliteTable('question_responses', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id').notNull(),
  questionId: text('question_id').notNull(),
  selectedAnswer: text('selected_answer'),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  timeSpent: integer('time_spent').notNull(), // seconds
  confidence: integer('confidence'), // 1-5 scale
  flagged: integer('flagged', { mode: 'boolean' }).notNull().default(false),
  answeredAt: integer('answered_at', { mode: 'timestamp' }).notNull().default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  sessionIdx: index('idx_responses_session').on(table.sessionId),
  userQuestionIdx: index('idx_responses_user_question').on(table.userId, table.questionId),
  correctIdx: index('idx_responses_correct').on(table.isCorrect)
}));

// ========================================
// ANALYTICS & METRICS
// ========================================

export const userMetrics = sqliteTable('user_metrics', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  studyTime: integer('study_time').notNull().default(0), // seconds
  questionsAnswered: integer('questions_answered').notNull().default(0),
  correctAnswers: integer('correct_answers').notNull().default(0),
  testsCompleted: integer('tests_completed').notNull().default(0),
  xpEarned: integer('xp_earned').notNull().default(0),
  averageConfidence: real('average_confidence'),
  averageTimePerQuestion: real('average_time_per_question')
}, (table) => ({
  userDateIdx: uniqueIndex('idx_metrics_user_date').on(table.userId, table.date),
  dateIdx: index('idx_metrics_date').on(table.date)
}));

// Type exports for TypeScript
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type CertificationPath = typeof certificationPaths.$inferSelect;
export type StudySession = typeof studySessions.$inferSelect;
export type TestResult = typeof testResults.$inferSelect;
export type UserProgress = typeof userCertificationProgress.$inferSelect;
export type DailyGoal = typeof dailyGoals.$inferSelect;