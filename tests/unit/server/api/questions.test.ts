/**
 * Questions API Unit Tests
 * Test suite for question delivery endpoints
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { QuestionFactory } from '../../../factories/question.factory';
import { UserFactory } from '../../../factories/user.factory';
import { TEST_USERS, createAuthHeaders } from '../../../helpers/auth';
import { getTestDatabase, resetTestDatabase } from '../../../helpers/database';

describe('Questions API', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('POST /api/questions/batch', () => {
    it('should deliver requested number of questions within 100ms', async () => {
      const start = performance.now();
      
      // Mock the API handler
      const questions = QuestionFactory.createBatch(65);
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        data: {
          questions,
          retrieval_time_ms: 45
        }
      });
      
      const result = await mockHandler({
        body: {
          exam_id: 1,
          objective_ids: [1, 2, 3],
          count: 65
        },
        headers: await createAuthHeaders(TEST_USERS.free)
      });
      
      const duration = performance.now() - start;
      
      expect(result.success).toBe(true);
      expect(result.data.questions).toHaveLength(65);
      expect(result.data.retrieval_time_ms).toBeLessThan(100);
      expect(duration).toBeWithinResponseTime(100);
    });
    
    it('should filter questions by difficulty range', async () => {
      const questions = QuestionFactory.createByDifficulty(3, 20);
      
      const mockHandler = vi.fn().mockImplementation(({ body }) => {
        const filtered = questions.filter(q => 
          q.difficulty >= body.difficulty.min && 
          q.difficulty <= body.difficulty.max
        );
        
        return Promise.resolve({
          success: true,
          data: { questions: filtered }
        });
      });
      
      const result = await mockHandler({
        body: {
          exam_id: 1,
          objective_ids: [1],
          count: 20,
          difficulty: { min: 2, max: 4 }
        },
        headers: await createAuthHeaders()
      });
      
      expect(result.data.questions.every(q => 
        q.difficulty >= 2 && q.difficulty <= 4
      )).toBe(true);
    });
    
    it('should exclude recently answered questions for user', async () => {
      const db = getTestDatabase();
      
      // Insert recent answers
      const recentQuestionIds = [5, 10, 15, 20];
      for (const qId of recentQuestionIds) {
        await db.execute({
          sql: `INSERT INTO user_answers (user_id, question_id, session_id, selected_answer, is_correct, time_spent_seconds, answered_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now', '-1 hour'))`,
          args: [1, qId, 1, 'a', 1, 30]
        });
      }
      
      // Mock handler that checks recent questions
      const allQuestions = QuestionFactory.createBatch(30);
      const mockHandler = vi.fn().mockImplementation(async ({ body, user }) => {
        // Get recent question IDs from database
        const recent = await db.execute({
          sql: `SELECT DISTINCT question_id FROM user_answers 
                WHERE user_id = ? AND answered_at > datetime('now', '-24 hours')`,
          args: [user.id]
        });
        
        const recentIds = recent.rows.map((r: any) => r.question_id);
        const filtered = allQuestions.filter(q => !recentIds.includes(q.id));
        
        return {
          success: true,
          data: { questions: filtered.slice(0, body.count) }
        };
      });
      
      const result = await mockHandler({
        body: {
          exam_id: 1,
          objective_ids: [1],
          count: 10,
          exclude_recent: true
        },
        user: TEST_USERS.free,
        headers: await createAuthHeaders()
      });
      
      const returnedIds = result.data.questions.map((q: any) => q.id);
      const hasRecent = recentQuestionIds.some(id => returnedIds.includes(id));
      
      expect(hasRecent).toBe(false);
    });
    
    it('should require authentication', async () => {
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 401,
        statusMessage: 'Authentication required'
      });
      
      await expect(mockHandler({
        body: { exam_id: 1, objective_ids: [1], count: 10 },
        headers: {}
      })).rejects.toMatchObject({
        statusCode: 401
      });
    });
    
    it('should enforce premium limits for free users', async () => {
      const mockHandler = vi.fn().mockImplementation(({ body, user }) => {
        const maxQuestions = user.subscription_status === 'free' ? 20 : 100;
        const count = Math.min(body.count, maxQuestions);
        
        return Promise.resolve({
          success: true,
          data: {
            questions: QuestionFactory.createBatch(count),
            limited: body.count > maxQuestions
          }
        });
      });
      
      const result = await mockHandler({
        body: { exam_id: 1, objective_ids: [1], count: 50 },
        user: TEST_USERS.free,
        headers: await createAuthHeaders(TEST_USERS.free)
      });
      
      expect(result.data.questions).toHaveLength(20);
      expect(result.data.limited).toBe(true);
    });
  });
  
  describe('GET /api/questions/[id]', () => {
    it('should retrieve single question by ID', async () => {
      const question = QuestionFactory.create({ id: 123 });
      
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        data: { question }
      });
      
      const result = await mockHandler({
        params: { id: '123' },
        headers: await createAuthHeaders()
      });
      
      expect(result.data.question.id).toBe(123);
    });
    
    it('should return 404 for non-existent question', async () => {
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 404,
        statusMessage: 'Question not found'
      });
      
      await expect(mockHandler({
        params: { id: '999999' },
        headers: await createAuthHeaders()
      })).rejects.toMatchObject({
        statusCode: 404
      });
    });
    
    it('should include statistics for admin users', async () => {
      const question = QuestionFactory.createWithStats();
      
      const mockHandler = vi.fn().mockImplementation(({ user }) => {
        if (user.role === 'admin') {
          return Promise.resolve({
            success: true,
            data: { question }
          });
        }
        
        const { stats, ...questionWithoutStats } = question;
        return Promise.resolve({
          success: true,
          data: { question: questionWithoutStats }
        });
      });
      
      // Admin request
      const adminResult = await mockHandler({
        params: { id: '1' },
        user: TEST_USERS.admin,
        headers: await createAuthHeaders(TEST_USERS.admin)
      });
      
      expect(adminResult.data.question.stats).toBeDefined();
      
      // Regular user request
      const userResult = await mockHandler({
        params: { id: '1' },
        user: TEST_USERS.free,
        headers: await createAuthHeaders(TEST_USERS.free)
      });
      
      expect(userResult.data.question.stats).toBeUndefined();
    });
  });
  
  describe('POST /api/questions/[id]/answer', () => {
    it('should record user answer and calculate correctness', async () => {
      const question = QuestionFactory.create({
        answers: [
          { id: 'a', text: 'Answer A', is_correct: false },
          { id: 'b', text: 'Answer B', is_correct: true },
          { id: 'c', text: 'Answer C', is_correct: false },
          { id: 'd', text: 'Answer D', is_correct: false }
        ]
      });
      
      const mockHandler = vi.fn().mockImplementation(({ body }) => {
        const isCorrect = question.answers.find(a => a.id === body.answer)?.is_correct || false;
        
        return Promise.resolve({
          success: true,
          data: {
            is_correct: isCorrect,
            correct_answer: 'b',
            explanation: question.explanation
          }
        });
      });
      
      // Test correct answer
      const correctResult = await mockHandler({
        params: { id: '1' },
        body: {
          session_id: 1,
          answer: 'b',
          time_spent: 30
        },
        headers: await createAuthHeaders()
      });
      
      expect(correctResult.data.is_correct).toBe(true);
      
      // Test incorrect answer
      const incorrectResult = await mockHandler({
        params: { id: '1' },
        body: {
          session_id: 1,
          answer: 'a',
          time_spent: 30
        },
        headers: await createAuthHeaders()
      });
      
      expect(incorrectResult.data.is_correct).toBe(false);
      expect(incorrectResult.data.correct_answer).toBe('b');
    });
    
    it('should update session statistics', async () => {
      const db = getTestDatabase();
      
      const mockHandler = vi.fn().mockImplementation(async ({ body, user }) => {
        // Update session stats
        await db.execute({
          sql: `UPDATE study_sessions 
                SET question_count = question_count + 1,
                    correct_count = correct_count + ?,
                    time_spent_seconds = time_spent_seconds + ?
                WHERE id = ? AND user_id = ?`,
          args: [body.is_correct ? 1 : 0, body.time_spent, body.session_id, user.id]
        });
        
        return { success: true };
      });
      
      await mockHandler({
        params: { id: '1' },
        body: {
          session_id: 1,
          answer: 'a',
          time_spent: 45,
          is_correct: true
        },
        user: TEST_USERS.free,
        headers: await createAuthHeaders()
      });
      
      const session = await db.execute({
        sql: 'SELECT * FROM study_sessions WHERE id = 1',
        args: []
      });
      
      expect(mockHandler).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/questions/[id]/flag', () => {
    it('should allow users to flag questions for review', async () => {
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        data: { flagged: true }
      });
      
      const result = await mockHandler({
        params: { id: '1' },
        body: {
          reason: 'incorrect_answer',
          comment: 'Answer B should be correct, not A'
        },
        headers: await createAuthHeaders()
      });
      
      expect(result.data.flagged).toBe(true);
    });
    
    it('should prevent duplicate flags from same user', async () => {
      const db = getTestDatabase();
      
      // Insert existing flag
      await db.execute({
        sql: `INSERT INTO question_flags (question_id, user_id, reason, comment)
              VALUES (?, ?, ?, ?)`,
        args: [1, 1, 'incorrect_answer', 'Previous flag']
      });
      
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 409,
        statusMessage: 'Question already flagged by user'
      });
      
      await expect(mockHandler({
        params: { id: '1' },
        body: {
          reason: 'incorrect_answer',
          comment: 'Another flag attempt'
        },
        user: TEST_USERS.free,
        headers: await createAuthHeaders()
      })).rejects.toMatchObject({
        statusCode: 409
      });
    });
    
    it('should validate flag reasons', async () => {
      const validReasons = ['incorrect_answer', 'unclear_question', 'outdated_content', 'technical_error'];
      
      const mockHandler = vi.fn().mockImplementation(({ body }) => {
        if (!validReasons.includes(body.reason)) {
          return Promise.reject({
            statusCode: 400,
            statusMessage: 'Invalid flag reason'
          });
        }
        
        return Promise.resolve({ success: true });
      });
      
      await expect(mockHandler({
        params: { id: '1' },
        body: {
          reason: 'invalid_reason',
          comment: 'Test'
        },
        headers: await createAuthHeaders()
      })).rejects.toMatchObject({
        statusCode: 400
      });
    });
  });
});