// Test database setup and utilities
// Provides isolated test environment with proper cleanup

import { beforeEach, afterEach, beforeAll, afterAll } from 'vitest'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from '~/database/schema'
import type { Database } from '~/database/utils/connection'

let testDb: Database
let testClient: ReturnType<typeof createClient>

// Create in-memory database for testing
export async function createTestDatabase(): Promise<Database> {
  const client = createClient({
    url: ':memory:'
  })
  
  // Initialize Drizzle with full schema - this is key for insert/select operations
  const db = drizzle(client, { 
    schema,
    logger: false 
  })
  
  // Create tables manually for testing (more reliable than migrations)
  await createTestTables(db)
  
  return db
}

// Create all tables for testing
async function createTestTables(db: Database) {
  // Use direct table creation for tests to avoid migration syntax issues
  await createBasicTables(db)
}

// Fallback table creation that matches Drizzle schema exactly
async function createBasicTables(db: Database) {
  const client = db.session.client
  
  const basicTables = [
    // Users table - must match users schema exactly
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      picture TEXT,
      provider TEXT DEFAULT 'google',
      provider_id TEXT,
      password_hash TEXT,
      role TEXT DEFAULT 'user',
      permissions TEXT DEFAULT '[]',
      subscription_status TEXT DEFAULT 'free',
      subscription_expires_at INTEGER,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      bio TEXT,
      timezone TEXT DEFAULT 'UTC',
      preferred_language TEXT DEFAULT 'en',
      last_login INTEGER,
      login_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      email_verified INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
    
    // Exams table
    `CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      vendor_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      passing_score REAL DEFAULT 0.65,
      question_count INTEGER DEFAULT 65,
      time_limit_minutes INTEGER DEFAULT 90,
      version TEXT,
      expires_at INTEGER,
      difficulty_level INTEGER DEFAULT 3,
      prerequisites TEXT,
      price_cents INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      is_beta INTEGER DEFAULT 0,
      total_attempts INTEGER DEFAULT 0,
      pass_rate REAL DEFAULT 0,
      avg_score REAL DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )`,
    
    // Objectives table
    `CREATE TABLE IF NOT EXISTS objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      weight REAL DEFAULT 0.25,
      question_percentage REAL,
      parent_id INTEGER,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (exam_id) REFERENCES exams(id),
      FOREIGN KEY (parent_id) REFERENCES objectives(id)
    )`,
    
    // Questions table  
    `CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL,
      objective_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      type TEXT DEFAULT 'multiple_choice',
      answers TEXT NOT NULL,
      explanation TEXT,
      reference TEXT,
      external_link TEXT,
      difficulty INTEGER DEFAULT 3,
      tags TEXT DEFAULT '[]',
      ai_generated INTEGER DEFAULT 0,
      ai_model TEXT,
      ai_prompt_version TEXT,
      ai_confidence_score REAL,
      review_status TEXT DEFAULT 'pending',
      reviewed_by INTEGER,
      reviewed_at INTEGER,
      total_attempts INTEGER DEFAULT 0,
      correct_attempts INTEGER DEFAULT 0,
      avg_time_seconds INTEGER DEFAULT 0,
      discrimination_index REAL,
      image_url TEXT,
      diagram_data TEXT,
      is_active INTEGER DEFAULT 1,
      is_beta INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (exam_id) REFERENCES exams(id),
      FOREIGN KEY (objective_id) REFERENCES objectives(id),
      FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )`,
    
    // Study sessions table
    `CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      mode TEXT DEFAULT 'practice',
      objectives TEXT,
      difficulty_filter TEXT,
      question_count INTEGER DEFAULT 20,
      total_questions INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      skipped_questions INTEGER DEFAULT 0,
      flagged_questions INTEGER DEFAULT 0,
      time_spent_seconds INTEGER DEFAULT 0,
      avg_time_per_question REAL,
      accuracy REAL,
      streak_count INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      objective_scores TEXT DEFAULT '{}',
      status TEXT DEFAULT 'active',
      current_question_id INTEGER,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      last_activity INTEGER DEFAULT (strftime('%s', 'now')),
      completed_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (exam_id) REFERENCES exams(id),
      FOREIGN KEY (current_question_id) REFERENCES questions(id)
    )`,
    
    // User answers table - must match user-answers.ts schema exactly  
    `CREATE TABLE IF NOT EXISTS user_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      study_session_id INTEGER,
      test_attempt_id INTEGER,
      selected_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      time_spent_seconds INTEGER,
      confidence_level INTEGER,
      flagged INTEGER DEFAULT 0,
      changed_answer INTEGER DEFAULT 0,
      attempt_number INTEGER DEFAULT 1,
      days_since_last_seen INTEGER,
      answered_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (question_id) REFERENCES questions(id),
      FOREIGN KEY (study_session_id) REFERENCES study_sessions(id),
      FOREIGN KEY (test_attempt_id) REFERENCES test_attempts(id)
    )`,
    
    // User progress table - must match user-progress.ts schema exactly
    `CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      exam_id INTEGER NOT NULL,
      total_questions_seen INTEGER DEFAULT 0,
      unique_questions_seen INTEGER DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      total_incorrect INTEGER DEFAULT 0,
      overall_accuracy REAL DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      avg_time_per_question REAL,
      total_study_minutes INTEGER DEFAULT 0,
      last_study_date TEXT,
      study_days_count INTEGER DEFAULT 0,
      objective_mastery TEXT DEFAULT '{}',
      readiness_score REAL DEFAULT 0,
      predicted_exam_score REAL,
      confidence_interval REAL,
      weak_topics TEXT DEFAULT '[]',
      recommended_objectives TEXT DEFAULT '[]',
      tests_taken INTEGER DEFAULT 0,
      tests_passed INTEGER DEFAULT 0,
      best_score REAL DEFAULT 0,
      avg_test_score REAL DEFAULT 0,
      last_test_date TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (exam_id) REFERENCES exams(id)
    )`
  ]
  
  for (const query of basicTables) {
    try {
      await client.execute(query)
    } catch (error) {
      console.warn('Failed to create table:', query.substring(0, 50), error)
    }
  }
}

// Test data factories
export function createTestUser(overrides: Partial<schema.NewUser> = {}): schema.NewUser {
  return {
    email: 'test@pingtopass.com',
    name: 'Test User',
    provider: 'google',
    role: 'user',
    subscriptionStatus: 'free',
    isActive: true,
    emailVerified: true,
    ...overrides
  }
}

export function createTestExam(overrides: Partial<schema.NewExam> = {}): schema.NewExam {
  return {
    vendorId: 'comptia',
    code: 'N10-008',
    name: 'CompTIA Network+',
    description: 'Networking fundamentals certification',
    passingScore: 0.65,
    questionCount: 90,
    timeLimitMinutes: 90,
    isActive: true,
    ...overrides
  }
}

export function createTestObjective(examId: number, overrides: Partial<schema.NewObjective> = {}): schema.NewObjective {
  return {
    examId,
    code: '1.0',
    name: 'Networking Fundamentals',
    weight: 0.25,
    isActive: true,
    ...overrides
  }
}

export function createTestQuestion(examId: number, objectiveId: number, overrides: Partial<schema.NewQuestion> = {}): schema.NewQuestion {
  return {
    examId,
    objectiveId,
    text: 'What is the default subnet mask for a Class C network?',
    type: 'multiple_choice',
    answers: [
      { id: 'a', text: '255.255.255.0', isCorrect: true },
      { id: 'b', text: '255.255.0.0', isCorrect: false },
      { id: 'c', text: '255.0.0.0', isCorrect: false },
      { id: 'd', text: '255.255.255.255', isCorrect: false }
    ],
    explanation: 'Class C networks use a /24 subnet mask (255.255.255.0) by default.',
    difficulty: 2,
    isActive: true,
    reviewStatus: 'approved',
    ...overrides
  }
}

export function createTestStudySession(
  userId: number, 
  examId: number, 
  overrides: Partial<schema.NewStudySession> = {}
): schema.NewStudySession {
  return {
    userId,
    examId,
    mode: 'practice',
    questionCount: 20,
    status: 'active',
    ...overrides
  }
}

// Test data seeder
export async function seedTestData(db: Database) {
  // Create test user
  const [user] = await db.insert(schema.users).values(createTestUser()).returning()
  
  // Create test exam
  const [exam] = await db.insert(schema.exams).values(createTestExam()).returning()
  
  // Create test objectives
  const objectives = await db.insert(schema.objectives).values([
    createTestObjective(exam.id, { code: '1.0', name: 'Networking Fundamentals' }),
    createTestObjective(exam.id, { code: '2.0', name: 'Network Operations' }),
    createTestObjective(exam.id, { code: '3.0', name: 'Network Security' })
  ]).returning()
  
  // Create test questions
  const questions = []
  for (let i = 0; i < 50; i++) {
    const objectiveId = objectives[i % 3].id
    questions.push(createTestQuestion(exam.id, objectiveId, {
      text: `Test question ${i + 1}`,
      difficulty: (i % 5) + 1
    }))
  }
  
  const createdQuestions = await db.insert(schema.questions).values(questions).returning()
  
  // Create user progress
  await db.insert(schema.userProgress).values({
    userId: user.id,
    examId: exam.id,
    totalQuestionsSeen: 25,
    totalCorrect: 18,
    overallAccuracy: 0.72
  })
  
  return {
    user,
    exam,
    objectives,
    questions: createdQuestions
  }
}

// Performance benchmark utilities
export class PerformanceBenchmark {
  private startTime: number = 0
  private measurements: number[] = []
  
  start() {
    this.startTime = performance.now()
  }
  
  end() {
    const duration = performance.now() - this.startTime
    this.measurements.push(duration)
    return duration
  }
  
  getAverage() {
    return this.measurements.reduce((sum, time) => sum + time, 0) / this.measurements.length
  }
  
  getMax() {
    return Math.max(...this.measurements)
  }
  
  reset() {
    this.measurements = []
  }
}

// Test suite setup
export function setupTestDatabase() {
  beforeAll(async () => {
    testDb = await createTestDatabase()
  })
  
  beforeEach(async () => {
    // Clean all tables before each test
    const tables = [
      'audit_log', 'ai_generation_log', 'growth_metrics', 'voice_profiles',
      'engagement_opportunities', 'tweets', 'twitter_accounts',
      'user_progress', 'user_answers', 'test_attempts', 'study_sessions',
      'questions', 'objectives', 'exams', 'users'
    ]
    
    const client = testDb.session.client
    for (const table of tables) {
      try {
        await client.execute(`DELETE FROM ${table}`)
      } catch (error) {
        // Table might not exist, ignore
      }
    }
  })
  
  afterAll(async () => {
    if (testClient) {
      testClient.close()
    }
  })
  
  return {
    get db() {
      if (!testDb) {
        throw new Error('Test database not initialized. Make sure setupTestDatabase() is called and beforeAll hook has run.')
      }
      return testDb
    }
  }
}

// Database assertion helpers
export async function expectTableCount(db: Database, table: string, expectedCount: number) {
  const client = db.session.client
  const result = await client.execute(`SELECT COUNT(*) as count FROM ${table}`)
  const count = result.rows[0]?.count
  if (count !== expectedCount) {
    throw new Error(`Expected ${expectedCount} rows in ${table}, got ${count}`)
  }
}

export async function expectUserExists(db: Database, email: string) {
  const user = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1)
  if (user.length === 0) {
    throw new Error(`Expected user with email ${email} to exist`)
  }
  return user[0]
}

import { eq } from 'drizzle-orm'