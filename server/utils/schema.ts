import { sql } from 'drizzle-orm'
import { 
  sqliteTable, 
  integer, 
  text, 
  real, 
  blob,
  index,
  uniqueIndex,
  foreignKey,
  check
} from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// Users table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  picture: text('picture'),
  
  // Authentication
  provider: text('provider', { enum: ['google', 'email'] }).default('google'),
  providerId: text('provider_id'),
  passwordHash: text('password_hash'),
  
  // Roles & Permissions
  role: text('role', { enum: ['user', 'admin', 'moderator'] }).default('user'),
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().default('[]'),
  
  // Subscription
  subscriptionStatus: text('subscription_status', { 
    enum: ['free', 'premium', 'enterprise'] 
  }).default('free'),
  subscriptionExpiresAt: integer('subscription_expires_at', { mode: 'timestamp' }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  
  // Profile
  bio: text('bio'),
  timezone: text('timezone').default('UTC'),
  preferredLanguage: text('preferred_language').default('en'),
  
  // Activity
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  loginCount: integer('login_count').default(0),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (users) => ({
  emailIdx: uniqueIndex('idx_users_email').on(users.email),
  providerIdx: index('idx_users_provider').on(users.provider, users.providerId),
  stripeIdx: index('idx_users_stripe').on(users.stripeCustomerId),
  activeIdx: index('idx_users_active').on(users.isActive, users.subscriptionStatus)
}))

// Exams table
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
}, (exams) => ({
  vendorCodeIdx: uniqueIndex('idx_exams_vendor_code').on(exams.vendorId, exams.code),
  vendorIdx: index('idx_exams_vendor').on(exams.vendorId, exams.isActive),
  activeIdx: index('idx_exams_active').on(exams.isActive, exams.isBeta),
  passingScoreCheck: check('passing_score_check', sql`${exams.passingScore} BETWEEN 0 AND 1`),
  difficultyCheck: check('difficulty_level_check', sql`${exams.difficultyLevel} BETWEEN 1 AND 5`)
}))

// Objectives table
export const objectives = sqliteTable('objectives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  
  // Identification
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  
  // Weighting
  weight: real('weight').default(0.25),
  questionPercentage: real('question_percentage'),
  
  // Hierarchy
  parentId: integer('parent_id').references(() => objectives.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0),
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (objectives) => ({
  examIdx: index('idx_objectives_exam').on(objectives.examId, objectives.isActive),
  parentIdx: index('idx_objectives_parent').on(objectives.parentId, objectives.sortOrder),
  weightCheck: check('weight_check', sql`${objectives.weight} BETWEEN 0 AND 1`)
}))

// Questions table
export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  objectiveId: integer('objective_id').notNull().references(() => objectives.id, { onDelete: 'cascade' }),
  
  // Question Content
  text: text('text').notNull(),
  type: text('type', { 
    enum: ['multiple_choice', 'multi_select', 'true_false', 'drag_drop', 'hotspot'] 
  }).default('multiple_choice'),
  
  // Answers (JSON format)
  answers: text('answers', { mode: 'json' }).$type<Array<{
    id: string
    text: string
    isCorrect: boolean
  }>>().notNull(),
  
  // Explanation & References
  explanation: text('explanation'),
  reference: text('reference'),
  externalLink: text('external_link'),
  
  // Difficulty & Classification
  difficulty: integer('difficulty').default(3),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default('[]'),
  
  // AI Generation Tracking
  aiGenerated: integer('ai_generated', { mode: 'boolean' }).default(false),
  aiModel: text('ai_model'),
  aiPromptVersion: text('ai_prompt_version'),
  aiConfidenceScore: real('ai_confidence_score'),
  
  // Quality Metrics
  reviewStatus: text('review_status', { 
    enum: ['pending', 'approved', 'rejected', 'needs_revision'] 
  }).default('pending'),
  reviewedBy: integer('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  reviewedAt: integer('reviewed_at', { mode: 'timestamp' }),
  
  // Performance Tracking
  totalAttempts: integer('total_attempts').default(0),
  correctAttempts: integer('correct_attempts').default(0),
  avgTimeSeconds: integer('avg_time_seconds').default(0),
  discriminationIndex: real('discrimination_index'),
  
  // Media
  imageUrl: text('image_url'),
  diagramData: text('diagram_data', { mode: 'json' }),
  
  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  isBeta: integer('is_beta', { mode: 'boolean' }).default(false),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (questions) => ({
  examObjectiveIdx: index('idx_questions_exam_objective').on(
    questions.examId, questions.objectiveId, questions.isActive
  ),
  difficultyIdx: index('idx_questions_difficulty').on(
    questions.examId, questions.difficulty, questions.isActive
  ),
  reviewIdx: index('idx_questions_review').on(questions.reviewStatus, questions.aiGenerated),
  performanceIdx: index('idx_questions_performance').on(questions.discriminationIndex),
  studyOptimizedIdx: index('idx_questions_study_optimized').on(
    questions.examId, questions.objectiveId, questions.difficulty, questions.isActive, questions.reviewStatus
  ),
  difficultyCheck: check('difficulty_check', sql`${questions.difficulty} BETWEEN 1 AND 5`)
}))

// Study Sessions table
export const studySessions = sqliteTable('study_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  
  // Session Configuration
  mode: text('mode', { 
    enum: ['practice', 'review', 'speed_drill', 'weak_areas', 'custom'] 
  }).default('practice'),
  objectives: text('objectives', { mode: 'json' }).$type<number[]>(),
  difficultyFilter: text('difficulty_filter', { mode: 'json' }).$type<{min: number, max: number}>(),
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
  accuracy: real('accuracy'),
  streakCount: integer('streak_count').default(0),
  maxStreak: integer('max_streak').default(0),
  
  // Mastery Tracking
  objectiveScores: text('objective_scores', { mode: 'json' }).$type<Record<string, number>>().default('{}'),
  
  // Session State
  status: text('status', { 
    enum: ['active', 'paused', 'completed', 'abandoned'] 
  }).default('active'),
  currentQuestionId: integer('current_question_id'),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  lastActivity: integer('last_activity', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  completedAt: integer('completed_at', { mode: 'timestamp' })
}, (sessions) => ({
  userIdx: index('idx_sessions_user').on(sessions.userId, sessions.examId, sessions.status),
  activeIdx: index('idx_sessions_active').on(sessions.status, sessions.lastActivity),
  performanceIdx: index('idx_sessions_performance').on(sessions.examId, sessions.accuracy, sessions.totalQuestions)
}))

// Test Attempts table
export const testAttempts = sqliteTable('test_attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  examId: integer('exam_id').notNull().references(() => exams.id, { onDelete: 'cascade' }),
  
  // Test Configuration
  questionIds: text('question_ids', { mode: 'json' }).$type<number[]>().notNull(),
  timeLimitMinutes: integer('time_limit_minutes'),
  passingScore: real('passing_score'),
  
  // Results
  score: real('score'),
  passed: integer('passed', { mode: 'boolean' }),
  correctCount: integer('correct_count'),
  incorrectCount: integer('incorrect_count'),
  skippedCount: integer('skipped_count'),
  
  // Detailed Scoring
  objectiveBreakdown: text('objective_breakdown', { mode: 'json' }).$type<Record<string, {correct: number, total: number}>>(),
  
  // Time Analysis
  totalTimeSeconds: integer('total_time_seconds'),
  timePerQuestion: text('time_per_question', { mode: 'json' }).$type<number[]>(),
  
  // Question Review
  reviewEnabled: integer('review_enabled', { mode: 'boolean' }).default(true),
  certificateIssued: integer('certificate_issued', { mode: 'boolean' }).default(false),
  
  // Status
  status: text('status', { 
    enum: ['in_progress', 'completed', 'abandoned', 'invalidated'] 
  }).default('in_progress'),
  
  // Timestamps
  startedAt: integer('started_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' })
}, (attempts) => ({
  userIdx: index('idx_test_attempts_user').on(attempts.userId, attempts.examId, attempts.status),
  scoresIdx: index('idx_test_attempts_scores').on(attempts.examId, attempts.passed, attempts.score)
}))

// User Answers table
export const userAnswers = sqliteTable('user_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  
  // Session References
  studySessionId: integer('study_session_id').references(() => studySessions.id, { onDelete: 'cascade' }),
  testAttemptId: integer('test_attempt_id').references(() => testAttempts.id, { onDelete: 'cascade' }),
  
  // Answer Details
  selectedAnswer: text('selected_answer').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  
  // Interaction Metrics
  timeSpentSeconds: integer('time_spent_seconds'),
  confidenceLevel: integer('confidence_level'),
  flagged: integer('flagged', { mode: 'boolean' }).default(false),
  changedAnswer: integer('changed_answer', { mode: 'boolean' }).default(false),
  
  // Learning Analytics
  attemptNumber: integer('attempt_number').default(1),
  daysSinceLastSeen: integer('days_since_last_seen'),
  
  // Timestamp
  answeredAt: integer('answered_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (answers) => ({
  userQuestionIdx: index('idx_user_answers_user_question').on(
    answers.userId, answers.questionId, answers.answeredAt
  ),
  sessionIdx: index('idx_user_answers_session').on(answers.studySessionId),
  testIdx: index('idx_user_answers_test').on(answers.testAttemptId),
  recentIdx: index('idx_user_answers_recent').on(answers.userId, answers.answeredAt),
  confidenceCheck: check('confidence_check', sql`${answers.confidenceLevel} BETWEEN 1 AND 5`)
}))

// User Progress table
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
  
  // Study Time
  totalStudyMinutes: integer('total_study_minutes').default(0),
  lastStudyDate: text('last_study_date'),
  studyDaysCount: integer('study_days_count').default(0),
  
  // Mastery Levels
  objectiveMastery: text('objective_mastery', { mode: 'json' }).$type<Record<string, {level: number, questionsAnswered: number}>>().default('{}'),
  
  // Readiness Score
  readinessScore: real('readiness_score').default(0),
  predictedExamScore: real('predicted_exam_score'),
  confidenceInterval: real('confidence_interval'),
  
  // Weak Areas
  weakTopics: text('weak_topics', { mode: 'json' }).$type<string[]>().default('[]'),
  recommendedObjectives: text('recommended_objectives', { mode: 'json' }).$type<string[]>().default('[]'),
  
  // Test History
  testsTaken: integer('tests_taken').default(0),
  testsPassed: integer('tests_passed').default(0),
  bestScore: real('best_score').default(0),
  avgTestScore: real('avg_test_score').default(0),
  lastTestDate: text('last_test_date'),
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`)
}, (progress) => ({
  userExamIdx: uniqueIndex('idx_user_progress_user_exam').on(progress.userId, progress.examId),
  userIdx: index('idx_user_progress_user').on(progress.userId),
  readinessIdx: index('idx_user_progress_readiness').on(progress.examId, progress.readinessScore)
}))

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  studySessions: many(studySessions),
  testAttempts: many(testAttempts),
  userAnswers: many(userAnswers),
  progress: many(userProgress)
}))

export const examsRelations = relations(exams, ({ many }) => ({
  objectives: many(objectives),
  questions: many(questions),
  studySessions: many(studySessions),
  testAttempts: many(testAttempts),
  userProgress: many(userProgress)
}))

export const objectivesRelations = relations(objectives, ({ one, many }) => ({
  exam: one(exams, {
    fields: [objectives.examId],
    references: [exams.id]
  }),
  parent: one(objectives, {
    fields: [objectives.parentId],
    references: [objectives.id]
  }),
  children: many(objectives),
  questions: many(questions)
}))

export const questionsRelations = relations(questions, ({ one, many }) => ({
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
    references: [users.id]
  }),
  userAnswers: many(userAnswers)
}))

export const studySessionsRelations = relations(studySessions, ({ one, many }) => ({
  user: one(users, {
    fields: [studySessions.userId],
    references: [users.id]
  }),
  exam: one(exams, {
    fields: [studySessions.examId],
    references: [exams.id]
  }),
  answers: many(userAnswers)
}))

export const testAttemptsRelations = relations(testAttempts, ({ one, many }) => ({
  user: one(users, {
    fields: [testAttempts.userId],
    references: [users.id]
  }),
  exam: one(exams, {
    fields: [testAttempts.examId],
    references: [exams.id]
  }),
  answers: many(userAnswers)
}))

export const userAnswersRelations = relations(userAnswers, ({ one }) => ({
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

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id]
  }),
  exam: one(exams, {
    fields: [userProgress.examId],
    references: [exams.id]
  })
}))