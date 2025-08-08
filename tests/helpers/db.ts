/**
 * Test Database Helpers
 * In-memory database setup and utilities for testing
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { createClient } from '@libsql/client'
import { setDatabaseEnvironment, getDB } from '~/server/utils/db'

let testDb: any = null
let isSetup = false

/**
 * Setup in-memory test database with schema and seed data
 */
export async function setupTestDatabase(withSeed = true) {
  if (isSetup) {
    return testDb
  }

  // Ensure test environment
  setDatabaseEnvironment('test')
  
  // Get database connection - this should create in-memory database
  testDb = getDB()
  
  // Apply schema migration
  await applyTestSchema()
  
  // Seed with test data if requested
  if (withSeed) {
    await seedTestData()
  }
  
  isSetup = true
  console.log('🧪 Test database setup completed')
  return testDb
}

/**
 * Apply database schema to test database
 */
async function applyTestSchema() {
  try {
    // Read the initial migration
    const schemaPath = join(process.cwd(), 'database/migrations/20240108120000_initial_schema.sql')
    const schemaContent = readFileSync(schemaPath, 'utf-8')
    
    // Extract the UP migration content
    const upMarker = '-- +migrate Up'
    const downMarker = '-- +migrate Down'
    const upIndex = schemaContent.indexOf(upMarker)
    const downIndex = schemaContent.indexOf(downMarker)
    
    if (upIndex === -1) {
      throw new Error('Migration UP marker not found in schema file')
    }
    
    const upContent = schemaContent.substring(
      upIndex + upMarker.length, 
      downIndex === -1 ? undefined : downIndex
    ).trim()
    
    // Split into individual statements - handle multi-line statements properly
    const allStatements = []
    let currentStatement = ''
    let inCreateTable = false
    
    const lines = upContent.split('\n')
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip comments and empty lines
      if (!trimmedLine || trimmedLine.startsWith('--')) {
        continue
      }
      
      // Track if we're inside a CREATE TABLE block
      if (trimmedLine.toUpperCase().startsWith('CREATE TABLE')) {
        inCreateTable = true
        currentStatement = trimmedLine
      } else if (inCreateTable) {
        currentStatement += ' ' + trimmedLine
        
        // Check if this line ends the CREATE TABLE (ends with ');' or just ';')
        if (trimmedLine.endsWith(');') || trimmedLine === ');') {
          allStatements.push(currentStatement.trim())
          currentStatement = ''
          inCreateTable = false
        }
      } else {
        // Regular single-line statements (like indexes)
        if (trimmedLine.endsWith(';')) {
          const statement = (currentStatement + ' ' + trimmedLine).trim()
          if (statement && statement !== 'PRAGMA foreign_keys = ON;') {
            allStatements.push(statement)
          }
          currentStatement = ''
        } else {
          currentStatement += (currentStatement ? ' ' : '') + trimmedLine
        }
      }
    }
    
    // Add any remaining statement
    if (currentStatement.trim()) {
      allStatements.push(currentStatement.trim())
    }
    
    console.log(`Parsed ${allStatements.length} SQL statements`)
    
    // Execute each statement individually
    for (const statement of allStatements) {
      if (statement.trim()) {
        try {
          await testDb.execute(statement)
        } catch (error) {
          console.error(`Failed to execute statement: ${statement.substring(0, 80)}...`)
          console.error(error)
          throw error
        }
      }
    }
    
    console.log('✅ Test schema applied successfully')
  } catch (error) {
    console.error('❌ Failed to apply test schema:', error)
    throw error
  }
}

/**
 * Seed test database with minimal test data
 */
async function seedTestData() {
  try {
    // Create minimal test data directly without using the complex seeder
    
    // Test users
    await testDb.execute({
      sql: `INSERT INTO users (email, name, role, subscription_status, email_verified, is_active)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['test@example.com', 'Test User', 'user', 'free', 1, 1]
    })
    
    await testDb.execute({
      sql: `INSERT INTO users (email, name, role, subscription_status, email_verified, is_active)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: ['admin@example.com', 'Admin User', 'admin', 'premium', 1, 1]
    })

    // Test exam
    const examResult = await testDb.execute({
      sql: `INSERT INTO exams (vendor_id, code, name, description, passing_score, question_count, time_limit_minutes, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id`,
      args: ['test', 'TEST-001', 'Test Exam', 'Test exam for testing', 0.7, 10, 60, 1]
    })
    
    const examId = examResult.rows[0].id

    // Test objective
    const objectiveResult = await testDb.execute({
      sql: `INSERT INTO objectives (exam_id, code, name, weight, is_active)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id`,
      args: [examId, '1.0', 'Test Objective', 0.25, 1]
    })
    
    const objectiveId = objectiveResult.rows[0].id

    // Test question
    const answers = JSON.stringify([
      { id: 'a', text: 'Answer A', is_correct: true },
      { id: 'b', text: 'Answer B', is_correct: false },
      { id: 'c', text: 'Answer C', is_correct: false },
      { id: 'd', text: 'Answer D', is_correct: false }
    ])

    await testDb.execute({
      sql: `INSERT INTO questions (exam_id, objective_id, text, type, answers, explanation, difficulty, review_status, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [examId, objectiveId, 'Test question?', 'multiple_choice', answers, 'Test explanation', 3, 'approved', 1]
    })
    
    console.log('✅ Test data seeded successfully')
  } catch (error) {
    console.error('❌ Failed to seed test data:', error)
    throw error
  }
}

/**
 * Clean up test database
 */
export async function teardownTestDatabase() {
  if (testDb) {
    try {
      await testDb.close()
      console.log('✅ Test database closed')
    } catch (error) {
      console.warn('⚠️ Error closing test database:', error)
    }
  }
  
  // Clean up test database file
  try {
    await import('fs').then(fs => {
      if (fs.existsSync('/tmp/pingtopass-test.db')) {
        fs.unlinkSync('/tmp/pingtopass-test.db')
      }
    })
  } catch (error) {
    // Ignore cleanup errors
  }
  
  testDb = null
  isSetup = false
}

/**
 * Clear all test data (keep schema)
 */
export async function clearTestData() {
  if (!testDb) {
    throw new Error('Test database not initialized')
  }
  
  // Disable foreign key constraints temporarily
  await testDb.execute('PRAGMA foreign_keys = OFF')
  
  // Clear all tables
  const tables = [
    'user_progress', 'user_answers', 'test_attempts', 'study_sessions',
    'questions', 'objectives', 'exams', 'users'
  ]
  
  for (const table of tables) {
    await testDb.execute(`DELETE FROM ${table}`)
  }
  
  // Re-enable foreign key constraints
  await testDb.execute('PRAGMA foreign_keys = ON')
}

/**
 * Insert test user and return user ID
 */
export async function createTestUser(userData: Partial<any> = {}) {
  const defaultUser = {
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    subscription_status: 'free',
    email_verified: 1,
    is_active: 1
  }
  
  const user = { ...defaultUser, ...userData }
  
  const result = await testDb.execute({
    sql: `INSERT INTO users (email, name, role, subscription_status, email_verified, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [user.email, user.name, user.role, user.subscription_status, user.email_verified, user.is_active]
  })
  
  return result.rows[0].id
}

/**
 * Create test exam and return exam ID
 */
export async function createTestExam(examData: Partial<any> = {}) {
  const defaultExam = {
    vendor_id: 'test',
    code: 'TEST-001',
    name: 'Test Exam',
    description: 'Test exam for testing purposes',
    passing_score: 0.7,
    question_count: 10,
    time_limit_minutes: 60,
    is_active: 1
  }
  
  const exam = { ...defaultExam, ...examData }
  
  const result = await testDb.execute({
    sql: `INSERT INTO exams (vendor_id, code, name, description, passing_score, question_count, time_limit_minutes, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [
      exam.vendor_id, exam.code, exam.name, exam.description,
      exam.passing_score, exam.question_count, exam.time_limit_minutes, exam.is_active
    ]
  })
  
  return result.rows[0].id
}

/**
 * Create test objective and return objective ID
 */
export async function createTestObjective(examId: number, objectiveData: Partial<any> = {}) {
  const defaultObjective = {
    code: '1.0',
    name: 'Test Objective',
    description: 'Test objective for testing purposes',
    weight: 0.25,
    is_active: 1
  }
  
  const objective = { ...defaultObjective, ...objectiveData }
  
  const result = await testDb.execute({
    sql: `INSERT INTO objectives (exam_id, code, name, description, weight, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [examId, objective.code, objective.name, objective.description, objective.weight, objective.is_active]
  })
  
  return result.rows[0].id
}

/**
 * Create test question and return question ID
 */
export async function createTestQuestion(examId: number, objectiveId: number, questionData: Partial<any> = {}) {
  const defaultAnswers = [
    { id: 'a', text: 'Answer A', is_correct: true },
    { id: 'b', text: 'Answer B', is_correct: false },
    { id: 'c', text: 'Answer C', is_correct: false },
    { id: 'd', text: 'Answer D', is_correct: false }
  ]
  
  const defaultQuestion = {
    text: 'This is a test question?',
    type: 'multiple_choice',
    answers: JSON.stringify(defaultAnswers),
    explanation: 'This is a test explanation.',
    difficulty: 3,
    review_status: 'approved',
    is_active: 1
  }
  
  const question = { ...defaultQuestion, ...questionData }
  if (typeof question.answers === 'object') {
    question.answers = JSON.stringify(question.answers)
  }
  
  const result = await testDb.execute({
    sql: `INSERT INTO questions (exam_id, objective_id, text, type, answers, explanation, difficulty, review_status, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          RETURNING id`,
    args: [
      examId, objectiveId, question.text, question.type, question.answers,
      question.explanation, question.difficulty, question.review_status, question.is_active
    ]
  })
  
  return result.rows[0].id
}

/**
 * Create study session and return session ID
 */
export async function createTestStudySession(userId: number, examId: number, sessionData: Partial<any> = {}) {
  const defaultSession = {
    mode: 'practice',
    status: 'active',
    question_count: 10
  }
  
  const session = { ...defaultSession, ...sessionData }
  
  const result = await testDb.execute({
    sql: `INSERT INTO study_sessions (user_id, exam_id, mode, status, question_count)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id`,
    args: [userId, examId, session.mode, session.status, session.question_count]
  })
  
  return result.rows[0].id
}

/**
 * Execute raw SQL query for testing
 */
export async function executeTestQuery(sql: string, args: any[] = []) {
  if (!testDb) {
    throw new Error('Test database not initialized')
  }
  
  return await testDb.execute({ sql, args })
}

/**
 * Get test database connection
 */
export function getTestDB() {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.')
  }
  
  return testDb
}

/**
 * Measure query performance
 */
export async function measureQueryPerformance(query: () => Promise<any>): Promise<{ result: any, duration: number }> {
  const start = Date.now()
  const result = await query()
  const duration = Date.now() - start
  
  return { result, duration }
}