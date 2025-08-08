import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  googleId: text('google_id').unique(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  subscriptionTier: text('subscription_tier').default('free'), // free, pro, enterprise
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Exams table
export const exams = sqliteTable('exams', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g., 'CCNA', 'AWS-SAA'
  name: text('name').notNull(),
  vendor: text('vendor').notNull(), // e.g., 'Cisco', 'AWS'
  description: text('description'),
  passingScore: integer('passing_score').notNull(),
  timeLimit: integer('time_limit'), // in minutes
  questionCount: integer('question_count').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Questions table
export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  examId: text('exam_id').notNull().references(() => exams.id),
  type: text('type').notNull(), // 'single', 'multiple', 'drag-drop'
  text: text('text').notNull(),
  explanation: text('explanation'),
  difficulty: integer('difficulty').notNull(), // 1-5
  objectiveId: text('objective_id'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  aiGenerated: integer('ai_generated', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Answer options table
export const answerOptions = sqliteTable('answer_options', {
  id: text('id').primaryKey(),
  questionId: text('question_id').notNull().references(() => questions.id),
  text: text('text').notNull(),
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  order: integer('order').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// Study sessions table
export const studySessions = sqliteTable('study_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  examId: text('exam_id').notNull().references(() => exams.id),
  mode: text('mode').notNull(), // 'practice', 'timed', 'exam'
  totalQuestions: integer('total_questions').notNull(),
  correctAnswers: integer('correct_answers').notNull(),
  timeSpent: integer('time_spent'), // in seconds
  score: real('score'),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// User progress table
export const userProgress = sqliteTable('user_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  examId: text('exam_id').notNull().references(() => exams.id),
  questionsAnswered: integer('questions_answered').default(0),
  correctAnswers: integer('correct_answers').default(0),
  averageScore: real('average_score'),
  lastActivityAt: integer('last_activity_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// User answers table (for tracking individual answers)
export const userAnswers = sqliteTable('user_answers', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => studySessions.id),
  questionId: text('question_id').notNull().references(() => questions.id),
  selectedOptions: text('selected_options').notNull(), // JSON array of selected option IDs
  isCorrect: integer('is_correct', { mode: 'boolean' }).notNull(),
  timeSpent: integer('time_spent'), // in seconds
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});