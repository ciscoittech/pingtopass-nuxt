/**
 * Database Operations Integration Tests
 * Tests complete database workflows with real data
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import { 
  setupTestDatabase, 
  teardownTestDatabase,
  clearTestData,
  createTestUser,
  createTestExam,
  createTestObjective,
  createTestQuestion,
  createTestStudySession,
  measureQueryPerformance
} from '~/tests/helpers/db'
import { getDB } from '~/server/utils/db'

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase()
  })

  beforeEach(async () => {
    await clearTestData()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  describe('User Management Workflow', () => {
    it('should create and retrieve user with all relationships', async () => {
      const db = getDB()
      
      // Create user
      const userId = await createTestUser({
        email: 'integration-test@example.com',
        name: 'Integration Test User',
        subscription_status: 'premium'
      })
      
      expect(userId).toBeDefined()
      
      // Verify user creation
      const user = await db.execute({
        sql: 'SELECT * FROM users WHERE id = ?',
        args: [userId]
      })
      
      expect(user.rows).toHaveLength(1)
      expect(user.rows[0].email).toBe('integration-test@example.com')
      expect(user.rows[0].subscription_status).toBe('premium')
    })

    it('should enforce unique email constraint', async () => {
      const email = 'unique-test@example.com'
      
      // Create first user
      await createTestUser({ email })
      
      // Attempt to create duplicate
      await expect(
        createTestUser({ email })
      ).rejects.toThrow()
    })

    it('should handle user deletion with cascade', async () => {
      const db = getDB()
      const userId = await createTestUser()
      const examId = await createTestExam()
      
      // Create related data
      const sessionId = await createTestStudySession(userId, examId)
      
      // Verify session exists
      const sessionBefore = await db.execute({
        sql: 'SELECT * FROM study_sessions WHERE id = ?',
        args: [sessionId]
      })
      expect(sessionBefore.rows).toHaveLength(1)
      
      // Delete user
      await db.execute({
        sql: 'DELETE FROM users WHERE id = ?',
        args: [userId]
      })
      
      // Verify cascade deletion
      const sessionAfter = await db.execute({
        sql: 'SELECT * FROM study_sessions WHERE id = ?',
        args: [sessionId]
      })
      expect(sessionAfter.rows).toHaveLength(0)
    })
  })

  describe('Exam and Question Workflow', () => {
    it('should create complete exam hierarchy', async () => {
      const db = getDB()
      
      // Create exam
      const examId = await createTestExam({
        vendor_id: 'integration',
        code: 'INT-001',
        name: 'Integration Test Exam',
        question_count: 10
      })
      
      // Create objectives
      const objective1Id = await createTestObjective(examId, {
        code: '1.0',
        name: 'First Objective',
        weight: 0.6
      })
      
      const objective2Id = await createTestObjective(examId, {
        code: '2.0',
        name: 'Second Objective',
        weight: 0.4
      })
      
      // Create questions
      const question1Id = await createTestQuestion(examId, objective1Id, {
        text: 'What is the first concept?',
        difficulty: 2
      })
      
      const question2Id = await createTestQuestion(examId, objective2Id, {
        text: 'What is the second concept?',
        difficulty: 4
      })
      
      // Verify complete hierarchy
      const examData = await db.execute({
        sql: `
          SELECT 
            e.name as exam_name,
            o.name as objective_name,
            o.weight,
            q.text as question_text,
            q.difficulty
          FROM exams e
          JOIN objectives o ON e.id = o.exam_id
          JOIN questions q ON o.id = q.objective_id
          WHERE e.id = ?
          ORDER BY o.code, q.id
        `,
        args: [examId]
      })
      
      expect(examData.rows).toHaveLength(2)
      expect(examData.rows[0].exam_name).toBe('Integration Test Exam')
      expect(examData.rows[0].objective_name).toBe('First Objective')
      expect(examData.rows[1].objective_name).toBe('Second Objective')
    })

    it('should calculate objective weights correctly', async () => {
      const db = getDB()
      const examId = await createTestExam()
      
      // Create objectives with specific weights
      await createTestObjective(examId, { code: '1.0', weight: 0.3 })
      await createTestObjective(examId, { code: '2.0', weight: 0.7 })
      
      // Verify weight calculation
      const weightSum = await db.execute({
        sql: `
          SELECT SUM(weight) as total_weight
          FROM objectives
          WHERE exam_id = ?
        `,
        args: [examId]
      })
      
      expect(weightSum.rows[0].total_weight).toBe(1.0)
    })
  })

  describe('Study Session Workflow', () => {
    it('should create and track study session progress', async () => {
      const db = getDB()
      
      // Setup test data
      const userId = await createTestUser()
      const examId = await createTestExam()
      const objectiveId = await createTestObjective(examId)
      const questionId = await createTestQuestion(examId, objectiveId)
      
      // Create study session
      const sessionId = await createTestStudySession(userId, examId, {
        mode: 'practice',
        question_count: 5
      })
      
      // Simulate answering questions
      await db.execute({
        sql: `INSERT INTO user_answers 
              (user_id, question_id, study_session_id, selected_answer, is_correct, time_spent_seconds)
              VALUES (?, ?, ?, 'a', 1, 30)`,
        args: [userId, questionId, sessionId]
      })
      
      // Update session progress
      await db.execute({
        sql: `UPDATE study_sessions 
              SET total_questions = 1, correct_answers = 1, accuracy = 1.0, status = 'completed'
              WHERE id = ?`,
        args: [sessionId]
      })
      
      // Verify session completion
      const session = await db.execute({
        sql: 'SELECT * FROM study_sessions WHERE id = ?',
        args: [sessionId]
      })
      
      expect(session.rows[0].status).toBe('completed')
      expect(session.rows[0].accuracy).toBe(1.0)
      expect(session.rows[0].total_questions).toBe(1)
      expect(session.rows[0].correct_answers).toBe(1)
    })

    it('should update user progress automatically', async () => {
      const db = getDB()
      
      const userId = await createTestUser()
      const examId = await createTestExam()
      const objectiveId = await createTestObjective(examId)
      const questionId = await createTestQuestion(examId, objectiveId)
      
      // Create initial progress record
      await db.execute({
        sql: `INSERT INTO user_progress 
              (user_id, exam_id, total_questions_seen, total_correct, overall_accuracy)
              VALUES (?, ?, 5, 3, 0.6)`,
        args: [userId, examId]
      })
      
      // Simulate answering a new question correctly
      await db.execute({
        sql: `INSERT INTO user_answers (user_id, question_id, selected_answer, is_correct)
              VALUES (?, ?, 'a', 1)`,
        args: [userId, questionId]
      })
      
      // Update progress (normally done by application logic)
      await db.execute({
        sql: `UPDATE user_progress 
              SET total_questions_seen = total_questions_seen + 1,
                  total_correct = total_correct + 1,
                  overall_accuracy = CAST(total_correct + 1 AS REAL) / (total_questions_seen + 1)
              WHERE user_id = ? AND exam_id = ?`,
        args: [userId, examId]
      })
      
      // Verify progress update
      const progress = await db.execute({
        sql: 'SELECT * FROM user_progress WHERE user_id = ? AND exam_id = ?',
        args: [userId, examId]
      })
      
      expect(progress.rows[0].total_questions_seen).toBe(6)
      expect(progress.rows[0].total_correct).toBe(4)
      expect(Math.round(progress.rows[0].overall_accuracy * 100)).toBe(67) // 4/6 = 0.67
    })
  })

  describe('Performance Integration Tests', () => {
    it('should handle bulk question insertion efficiently', async () => {
      const db = getDB()
      const examId = await createTestExam()
      const objectiveId = await createTestObjective(examId)
      
      const questions = Array(100).fill(null).map((_, i) => ({
        sql: `INSERT INTO questions (exam_id, objective_id, text, type, answers, difficulty, review_status, is_active)
              VALUES (?, ?, ?, 'multiple_choice', ?, 3, 'approved', 1)`,
        args: [
          examId,
          objectiveId,
          `Test question ${i + 1}?`,
          JSON.stringify([
            { id: 'a', text: 'Answer A', is_correct: true },
            { id: 'b', text: 'Answer B', is_correct: false }
          ])
        ]
      }))
      
      const { duration } = await measureQueryPerformance(async () => {
        await db.batch(questions)
      })
      
      // Should complete bulk insert in reasonable time
      expect(duration).toBeLessThan(1000) // 1 second for 100 inserts
      
      // Verify all questions were inserted
      const count = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM questions WHERE exam_id = ?',
        args: [examId]
      })
      
      expect(count.rows[0].count).toBe(100)
    })

    it('should perform complex queries under performance targets', async () => {
      const db = getDB()
      
      // Create test data
      const userId = await createTestUser()
      const examId = await createTestExam()
      const objectiveId = await createTestObjective(examId)
      
      // Create multiple questions
      for (let i = 0; i < 20; i++) {
        const questionId = await createTestQuestion(examId, objectiveId, {
          text: `Performance test question ${i + 1}?`
        })
        
        // Add some answer history
        await db.execute({
          sql: `INSERT INTO user_answers (user_id, question_id, selected_answer, is_correct, time_spent_seconds)
                VALUES (?, ?, 'a', ?, ?)`,
          args: [userId, questionId, Math.random() > 0.5 ? 1 : 0, Math.floor(Math.random() * 60) + 10]
        })
      }
      
      // Complex query to get user performance analytics
      const complexQuery = `
        SELECT 
          u.name,
          e.name as exam_name,
          COUNT(ua.id) as total_answers,
          SUM(ua.is_correct) as correct_answers,
          CAST(SUM(ua.is_correct) AS REAL) / COUNT(ua.id) as accuracy,
          AVG(ua.time_spent_seconds) as avg_time,
          MIN(ua.answered_at) as first_attempt,
          MAX(ua.answered_at) as last_attempt
        FROM users u
        JOIN user_answers ua ON u.id = ua.user_id
        JOIN questions q ON ua.question_id = q.id
        JOIN exams e ON q.exam_id = e.id
        WHERE u.id = ? AND e.id = ?
        GROUP BY u.id, e.id
      `
      
      const { result, duration } = await measureQueryPerformance(async () => {
        return await db.execute({ sql: complexQuery, args: [userId, examId] })
      })
      
      // Query should complete quickly
      expect(duration).toBeLessThan(50) // 50ms for complex analytics query
      
      // Verify results
      expect(result.rows).toHaveLength(1)
      expect(result.rows[0].total_answers).toBe(20)
      expect(result.rows[0].accuracy).toBeGreaterThanOrEqual(0)
      expect(result.rows[0].accuracy).toBeLessThanOrEqual(1)
    })
  })

  describe('Data Integrity Tests', () => {
    it('should maintain referential integrity on cascade deletes', async () => {
      const db = getDB()
      
      // Create complete data hierarchy
      const examId = await createTestExam()
      const objective1Id = await createTestObjective(examId, { code: '1.0' })
      const objective2Id = await createTestObjective(examId, { code: '2.0' })
      const question1Id = await createTestQuestion(examId, objective1Id)
      const question2Id = await createTestQuestion(examId, objective2Id)
      
      const userId = await createTestUser()
      const sessionId = await createTestStudySession(userId, examId)
      
      // Create answers
      await db.execute({
        sql: `INSERT INTO user_answers (user_id, question_id, study_session_id, selected_answer, is_correct)
              VALUES (?, ?, ?, 'a', 1)`,
        args: [userId, question1Id, sessionId]
      })
      
      // Delete exam (should cascade to all related data)
      await db.execute({
        sql: 'DELETE FROM exams WHERE id = ?',
        args: [examId]
      })
      
      // Verify cascade deletions
      const checks = await Promise.all([
        db.execute('SELECT COUNT(*) as count FROM objectives WHERE exam_id = ?', [examId]),
        db.execute('SELECT COUNT(*) as count FROM questions WHERE exam_id = ?', [examId]),
        db.execute('SELECT COUNT(*) as count FROM study_sessions WHERE exam_id = ?', [examId]),
        db.execute('SELECT COUNT(*) as count FROM user_answers WHERE study_session_id = ?', [sessionId])
      ])
      
      checks.forEach(result => {
        expect(result.rows[0].count).toBe(0)
      })
    })

    it('should enforce check constraints', async () => {
      const db = getDB()
      const examId = await createTestExam()
      
      // Test invalid difficulty constraint
      await expect(
        db.execute({
          sql: `INSERT INTO questions (exam_id, objective_id, text, answers, difficulty, is_active)
                VALUES (?, 1, 'Test', '[]', 6, 1)`, // difficulty > 5 should fail
          args: [examId]
        })
      ).rejects.toThrow()
      
      // Test invalid subscription status
      await expect(
        db.execute({
          sql: `INSERT INTO users (email, name, subscription_status)
                VALUES ('invalid@test.com', 'Invalid User', 'invalid_status')`,
          args: []
        })
      ).rejects.toThrow()
    })
  })
})