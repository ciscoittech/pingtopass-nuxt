/**
 * Database Test Helpers
 * Utilities for setting up and managing test databases with Turso
 */

import { createClient, type Client } from '@libsql/client';
import fs from 'fs/promises';
import path from 'path';

let testDb: Client | null = null;

/**
 * Setup an in-memory test database
 */
export async function setupTestDatabase(): Promise<Client> {
  // Create in-memory database for testing
  testDb = createClient({
    url: ':memory:',
    authToken: ''
  });
  
  // Load and execute schema
  const schemaPath = path.join(process.cwd(), 'database', 'schema.sql');
  const schema = await fs.readFile(schemaPath, 'utf-8');
  
  // Split schema into individual statements
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // Execute each statement
  for (const statement of statements) {
    await testDb.execute(statement);
  }
  
  // Seed initial test data
  await seedTestData(testDb);
  
  return testDb;
}

/**
 * Get the current test database instance
 */
export function getTestDatabase(): Client {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDatabase() first.');
  }
  return testDb;
}

/**
 * Seed test data into the database
 */
async function seedTestData(db: Client): Promise<void> {
  // Users
  await db.batch([
    {
      sql: `INSERT INTO users (id, email, name, google_id, role, subscription_status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [1, 'test@example.com', 'Test User', 'google_123', 'user', 'free']
    },
    {
      sql: `INSERT INTO users (id, email, name, google_id, role, subscription_status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [2, 'premium@example.com', 'Premium User', 'google_456', 'user', 'premium']
    },
    {
      sql: `INSERT INTO users (id, email, name, google_id, role, subscription_status, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [3, 'admin@example.com', 'Admin User', 'google_789', 'admin', 'premium']
    }
  ]);
  
  // Vendors and Exams
  await db.batch([
    {
      sql: `INSERT INTO vendors (id, code, name) VALUES (?, ?, ?)`,
      args: [1, 'comptia', 'CompTIA']
    },
    {
      sql: `INSERT INTO vendors (id, code, name) VALUES (?, ?, ?)`,
      args: [2, 'cisco', 'Cisco']
    }
  ]);
  
  await db.batch([
    {
      sql: `INSERT INTO exams (id, vendor_id, code, name, passing_score, question_count, duration_minutes) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [1, 1, 'N10-008', 'CompTIA Network+', 720, 90, 90]
    },
    {
      sql: `INSERT INTO exams (id, vendor_id, code, name, passing_score, question_count, duration_minutes) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [2, 2, '200-301', 'CCNA', 825, 100, 120]
    }
  ]);
  
  // Objectives
  await db.batch([
    {
      sql: `INSERT INTO objectives (id, exam_id, number, title, weight) 
            VALUES (?, ?, ?, ?, ?)`,
      args: [1, 1, '1.0', 'Networking Fundamentals', 24]
    },
    {
      sql: `INSERT INTO objectives (id, exam_id, number, title, weight) 
            VALUES (?, ?, ?, ?, ?)`,
      args: [2, 1, '2.0', 'Network Implementations', 19]
    }
  ]);
  
  // Sample questions
  const questions = generateTestQuestions(50);
  for (const q of questions) {
    await db.execute({
      sql: `INSERT INTO questions (exam_id, objective_id, text, type, difficulty, answers, explanation, references) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        q.exam_id,
        q.objective_id,
        q.text,
        q.type,
        q.difficulty,
        JSON.stringify(q.answers),
        q.explanation,
        JSON.stringify(q.references)
      ]
    });
  }
}

/**
 * Generate test questions
 */
function generateTestQuestions(count: number) {
  const questions = [];
  for (let i = 1; i <= count; i++) {
    questions.push({
      exam_id: (i % 2) + 1,
      objective_id: (i % 2) + 1,
      text: `Test Question ${i}: What is the correct answer?`,
      type: 'multiple_choice',
      difficulty: (i % 5) + 1,
      answers: [
        { id: 'a', text: 'Answer A', is_correct: i % 4 === 0 },
        { id: 'b', text: 'Answer B', is_correct: i % 4 === 1 },
        { id: 'c', text: 'Answer C', is_correct: i % 4 === 2 },
        { id: 'd', text: 'Answer D', is_correct: i % 4 === 3 }
      ],
      explanation: `This is the explanation for question ${i}`,
      references: [`Reference ${i}.1`, `Reference ${i}.2`]
    });
  }
  return questions;
}

/**
 * Clear all data from specific tables
 */
export async function clearTestData(tables: string[]): Promise<void> {
  const db = getTestDatabase();
  for (const table of tables) {
    await db.execute(`DELETE FROM ${table}`);
  }
}

/**
 * Reset database to initial seeded state
 */
export async function resetTestDatabase(): Promise<void> {
  const db = getTestDatabase();
  
  // Clear all tables in reverse order of dependencies
  const tables = [
    'user_answers',
    'study_sessions',
    'user_progress',
    'questions',
    'objectives',
    'exams',
    'vendors',
    'users'
  ];
  
  for (const table of tables) {
    await db.execute(`DELETE FROM ${table}`);
  }
  
  // Re-seed data
  await seedTestData(db);
}

/**
 * Close test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (testDb) {
    testDb.close();
    testDb = null;
  }
}

/**
 * Create a transaction helper for testing
 */
export async function withTransaction<T>(
  callback: (tx: any) => Promise<T>
): Promise<T> {
  const db = getTestDatabase();
  return db.transaction(callback);
}

/**
 * Performance testing helper
 */
export async function measureQueryTime(sql: string, args?: any[]): Promise<{
  result: any;
  duration: number;
}> {
  const db = getTestDatabase();
  const start = performance.now();
  const result = await db.execute({ sql, args });
  const duration = performance.now() - start;
  
  return { result, duration };
}