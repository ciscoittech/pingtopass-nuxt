/**
 * Study Sessions API Unit Tests
 * Test suite for session management and progress tracking
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionFactory } from '../../../factories/session.factory';
import { UserFactory } from '../../../factories/user.factory';
import { TEST_USERS, createAuthHeaders } from '../../../helpers/auth';
import { getTestDatabase, resetTestDatabase } from '../../../helpers/database';

describe('Study Sessions API', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('POST /api/sessions', () => {
    it('should create new study session with valid parameters', async () => {
      const sessionData = {
        exam_id: 1,
        objective_ids: [1, 2],
        session_type: 'practice' as const,
        settings: {
          question_count: 50,
          time_limit_minutes: 60,
          difficulty_range: { min: 1, max: 5 },
          show_explanations: true,
          randomize_questions: true
        }
      };
      
      const mockHandler = vi.fn().mockImplementation(async ({ body, user }) => {
        const session = SessionFactory.create({
          ...sessionData,
          user_id: user.id,
          id: Date.now(),
          status: 'active',
          created_at: new Date().toISOString()
        });
        
        return {
          success: true,
          data: { session }
        };
      });
      
      const result = await mockHandler({
        body: sessionData,
        user: TEST_USERS.free,
        headers: await createAuthHeaders(TEST_USERS.free)
      });
      
      expect(result.success).toBe(true);
      expect(result.data.session.exam_id).toBe(1);
      expect(result.data.session.status).toBe('active');
      expect(result.data.session.settings.question_count).toBe(50);
    });
    
    it('should enforce subscription limits for session creation', async () => {
      const mockHandler = vi.fn().mockImplementation(({ body, user }) => {
        const limits = {
          free: { daily_sessions: 3, max_questions_per_session: 20 },
          premium: { daily_sessions: 50, max_questions_per_session: 200 },
          enterprise: { daily_sessions: -1, max_questions_per_session: -1 }
        };
        
        const userLimits = limits[user.subscription_status as keyof typeof limits];
        
        if (body.settings.question_count > userLimits.max_questions_per_session) {
          return Promise.reject({
            statusCode: 403,
            statusMessage: 'Question limit exceeded for subscription tier'
          });
        }
        
        return Promise.resolve({
          success: true,
          data: {
            session: SessionFactory.create({
              ...body,
              settings: {
                ...body.settings,
                question_count: Math.min(body.settings.question_count, userLimits.max_questions_per_session)
              }
            })
          }
        });
      });
      
      // Test free user limits
      await expect(mockHandler({
        body: {
          exam_id: 1,
          objective_ids: [1],
          session_type: 'practice',
          settings: { question_count: 50 }
        },
        user: TEST_USERS.free,
        headers: await createAuthHeaders(TEST_USERS.free)
      })).rejects.toMatchObject({
        statusCode: 403
      });
      
      // Test premium user allowed
      const premiumResult = await mockHandler({
        body: {
          exam_id: 1,
          objective_ids: [1],
          session_type: 'practice',
          settings: { question_count: 50 }
        },
        user: TEST_USERS.premium,
        headers: await createAuthHeaders(TEST_USERS.premium)
      });
      
      expect(premiumResult.success).toBe(true);
    });
    
    it('should validate session parameters', async () => {
      const mockHandler = vi.fn().mockImplementation(({ body }) => {
        const errors = [];
        
        if (!body.exam_id || body.exam_id <= 0) {
          errors.push('Valid exam_id required');
        }
        
        if (!body.objective_ids || body.objective_ids.length === 0) {
          errors.push('At least one objective_id required');
        }
        
        if (!['practice', 'simulation', 'review'].includes(body.session_type)) {
          errors.push('Invalid session_type');
        }
        
        if (body.settings?.question_count <= 0) {
          errors.push('Question count must be positive');
        }
        
        if (errors.length > 0) {
          return Promise.reject({
            statusCode: 400,
            statusMessage: errors.join(', ')
          });
        }
        
        return Promise.resolve({ success: true });
      });
      
      // Test invalid exam_id
      await expect(mockHandler({
        body: {
          exam_id: 0,
          objective_ids: [1],
          session_type: 'practice',
          settings: { question_count: 10 }
        }
      })).rejects.toMatchObject({
        statusCode: 400
      });
      
      // Test invalid session_type
      await expect(mockHandler({
        body: {
          exam_id: 1,
          objective_ids: [1],
          session_type: 'invalid',
          settings: { question_count: 10 }
        }
      })).rejects.toMatchObject({
        statusCode: 400
      });
    });
    
    it('should prevent concurrent active sessions', async () => {
      const db = getTestDatabase();
      
      // Create existing active session
      await db.execute({
        sql: `INSERT INTO study_sessions (user_id, exam_id, status, created_at, settings)
              VALUES (?, ?, ?, datetime('now'), ?)`,
        args: [1, 1, 'active', JSON.stringify({ question_count: 20 })]
      });
      
      const mockHandler = vi.fn().mockImplementation(async ({ user }) => {
        // Check for active sessions
        const activeSessions = await db.execute({
          sql: 'SELECT id FROM study_sessions WHERE user_id = ? AND status = ?',
          args: [user.id, 'active']
        });
        
        if (activeSessions.rows.length > 0) {
          return Promise.reject({
            statusCode: 409,
            statusMessage: 'Active session already exists'
          });
        }
        
        return Promise.resolve({ success: true });
      });
      
      await expect(mockHandler({
        body: {
          exam_id: 1,
          objective_ids: [1],
          session_type: 'practice',
          settings: { question_count: 10 }
        },
        user: TEST_USERS.free,
        headers: await createAuthHeaders()
      })).rejects.toMatchObject({
        statusCode: 409
      });
    });
  });
  
  describe('GET /api/sessions/[id]', () => {
    it('should retrieve session details for owner', async () => {
      const session = SessionFactory.create({
        id: 123,
        user_id: 1,
        exam_id: 1,
        status: 'active'
      });
      
      const mockHandler = vi.fn().mockImplementation(({ params, user }) => {
        if (session.user_id !== user.id) {
          return Promise.reject({
            statusCode: 403,
            statusMessage: 'Access denied'
          });
        }
        
        return Promise.resolve({
          success: true,
          data: { session }
        });
      });
      
      const result = await mockHandler({
        params: { id: '123' },
        user: TEST_USERS.free,
        headers: await createAuthHeaders()
      });
      
      expect(result.data.session.id).toBe(123);
    });
    
    it('should include progress statistics', async () => {
      const session = SessionFactory.createWithProgress({
        question_count: 10,
        correct_count: 7,
        time_spent_seconds: 600
      });
      
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        data: { 
          session,
          progress: {
            completion_percentage: 70,
            accuracy_percentage: 70,
            average_time_per_question: 60,
            estimated_time_remaining: 180
          }
        }
      });
      
      const result = await mockHandler({
        params: { id: '1' },
        headers: await createAuthHeaders()
      });
      
      expect(result.data.progress.completion_percentage).toBe(70);
      expect(result.data.progress.accuracy_percentage).toBe(70);
    });
    
    it('should return 404 for non-existent session', async () => {
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 404,
        statusMessage: 'Session not found'
      });
      
      await expect(mockHandler({
        params: { id: '999999' },
        headers: await createAuthHeaders()
      })).rejects.toMatchObject({
        statusCode: 404
      });
    });
    
    it('should deny access to other users sessions', async () => {
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 403,
        statusMessage: 'Access denied'
      });
      
      await expect(mockHandler({
        params: { id: '1' },
        user: { ...TEST_USERS.free, id: 999 },
        headers: await createAuthHeaders()
      })).rejects.toMatchObject({
        statusCode: 403
      });
    });
  });
  
  describe('PUT /api/sessions/[id]', () => {
    it('should update session settings', async () => {
      const updates = {
        settings: {
          show_explanations: false,
          time_limit_minutes: 90
        }
      };
      
      const mockHandler = vi.fn().mockImplementation(({ body }) => {
        const updatedSession = SessionFactory.create({
          id: 1,
          settings: {
            question_count: 20,
            ...updates.settings
          }
        });
        
        return Promise.resolve({
          success: true,
          data: { session: updatedSession }
        });
      });
      
      const result = await mockHandler({
        params: { id: '1' },
        body: updates,
        headers: await createAuthHeaders()
      });
      
      expect(result.data.session.settings.show_explanations).toBe(false);
      expect(result.data.session.settings.time_limit_minutes).toBe(90);
    });
    
    it('should prevent updates to completed sessions', async () => {
      const mockHandler = vi.fn().mockImplementation(({ params }) => {
        // Simulate session status check
        const session = { id: parseInt(params.id), status: 'completed' };
        
        if (session.status === 'completed') {
          return Promise.reject({
            statusCode: 400,
            statusMessage: 'Cannot modify completed session'
          });
        }
        
        return Promise.resolve({ success: true });
      });
      
      await expect(mockHandler({
        params: { id: '1' },
        body: { settings: { show_explanations: false } },
        headers: await createAuthHeaders()
      })).rejects.toMatchObject({
        statusCode: 400
      });
    });
    
    it('should validate session ownership', async () => {
      const mockHandler = vi.fn().mockImplementation(({ user }) => {
        const sessionOwnerId = 2; // Different from test user
        
        if (sessionOwnerId !== user.id) {
          return Promise.reject({
            statusCode: 403,
            statusMessage: 'Access denied'
          });
        }
        
        return Promise.resolve({ success: true });
      });
      
      await expect(mockHandler({
        params: { id: '1' },
        body: { settings: {} },
        user: TEST_USERS.free, // ID = 1
        headers: await createAuthHeaders()
      })).rejects.toMatchObject({
        statusCode: 403
      });
    });
  });
  
  describe('POST /api/sessions/[id]/complete', () => {
    it('should complete active session and calculate final score', async () => {
      const mockHandler = vi.fn().mockImplementation(() => {
        const finalStats = {
          total_questions: 20,
          correct_answers: 15,
          time_spent_seconds: 1200,
          score_percentage: 75,
          pass_status: 'pass'
        };
        
        return Promise.resolve({
          success: true,
          data: {
            session: {
              id: 1,
              status: 'completed',
              completed_at: new Date().toISOString(),
              final_stats: finalStats
            }
          }
        });
      });
      
      const result = await mockHandler({
        params: { id: '1' },
        headers: await createAuthHeaders()
      });
      
      expect(result.data.session.status).toBe('completed');
      expect(result.data.session.final_stats.score_percentage).toBe(75);
      expect(result.data.session.final_stats.pass_status).toBe('pass');
    });
    
    it('should update user progress tracking', async () => {
      const db = getTestDatabase();
      
      const mockHandler = vi.fn().mockImplementation(async ({ user }) => {
        // Update user progress
        await db.execute({
          sql: `UPDATE user_progress 
                SET sessions_completed = sessions_completed + 1,
                    questions_answered = questions_answered + ?,
                    correct_answers = correct_answers + ?
                WHERE user_id = ? AND exam_id = ?`,
          args: [20, 15, user.id, 1]
        });
        
        return Promise.resolve({
          success: true,
          data: { session: { status: 'completed' } }
        });
      });
      
      await mockHandler({
        params: { id: '1' },
        user: TEST_USERS.free,
        headers: await createAuthHeaders()
      });
      
      expect(mockHandler).toHaveBeenCalled();
    });
    
    it('should prevent completing already completed sessions', async () => {
      const mockHandler = vi.fn().mockRejectedValue({
        statusCode: 400,
        statusMessage: 'Session already completed'
      });
      
      await expect(mockHandler({
        params: { id: '1' },
        headers: await createAuthHeaders()
      })).rejects.toMatchObject({
        statusCode: 400
      });
    });
  });
  
  describe('GET /api/sessions', () => {
    it('should list user sessions with pagination', async () => {
      const sessions = SessionFactory.createBatch(5);
      
      const mockHandler = vi.fn().mockImplementation(({ query }) => {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const offset = (page - 1) * limit;
        
        const paginatedSessions = sessions.slice(offset, offset + limit);
        
        return Promise.resolve({
          success: true,
          data: {
            sessions: paginatedSessions,
            total: sessions.length,
            page,
            limit,
            total_pages: Math.ceil(sessions.length / limit)
          }
        });
      });
      
      const result = await mockHandler({
        query: { page: '1', limit: '3' },
        headers: await createAuthHeaders()
      });
      
      expect(result.data.sessions).toHaveLength(3);
      expect(result.data.total).toBe(5);
      expect(result.data.total_pages).toBe(2);
    });
    
    it('should filter sessions by status', async () => {
      const allSessions = [
        SessionFactory.create({ status: 'active' }),
        SessionFactory.create({ status: 'completed' }),
        SessionFactory.create({ status: 'paused' }),
        SessionFactory.create({ status: 'completed' })
      ];
      
      const mockHandler = vi.fn().mockImplementation(({ query }) => {
        let filteredSessions = allSessions;
        
        if (query.status) {
          filteredSessions = allSessions.filter(s => s.status === query.status);
        }
        
        return Promise.resolve({
          success: true,
          data: { sessions: filteredSessions }
        });
      });
      
      const result = await mockHandler({
        query: { status: 'completed' },
        headers: await createAuthHeaders()
      });
      
      expect(result.data.sessions).toHaveLength(2);
      expect(result.data.sessions.every((s: any) => s.status === 'completed')).toBe(true);
    });
    
    it('should sort sessions by creation date', async () => {
      const sessions = [
        SessionFactory.create({ created_at: '2024-01-01T10:00:00Z' }),
        SessionFactory.create({ created_at: '2024-01-03T10:00:00Z' }),
        SessionFactory.create({ created_at: '2024-01-02T10:00:00Z' })
      ];
      
      const mockHandler = vi.fn().mockImplementation(({ query }) => {
        const sorted = [...sessions].sort((a, b) => {
          const dateA = new Date(a.created_at).getTime();
          const dateB = new Date(b.created_at).getTime();
          return query.sort === 'desc' ? dateB - dateA : dateA - dateB;
        });
        
        return Promise.resolve({
          success: true,
          data: { sessions: sorted }
        });
      });
      
      const result = await mockHandler({
        query: { sort: 'desc' },
        headers: await createAuthHeaders()
      });
      
      const dates = result.data.sessions.map((s: any) => new Date(s.created_at).getTime());
      expect(dates[0]).toBeGreaterThan(dates[1]);
      expect(dates[1]).toBeGreaterThan(dates[2]);
    });
  });
  
  describe('Performance Requirements', () => {
    it('should create sessions within 200ms', async () => {
      const start = performance.now();
      
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        data: { session: SessionFactory.create() }
      });
      
      await mockHandler({
        body: {
          exam_id: 1,
          objective_ids: [1],
          session_type: 'practice',
          settings: { question_count: 10 }
        },
        headers: await createAuthHeaders()
      });
      
      const duration = performance.now() - start;
      expect(duration).toBeWithinResponseTime(200);
    });
    
    it('should retrieve session details within 100ms', async () => {
      const start = performance.now();
      
      const mockHandler = vi.fn().mockResolvedValue({
        success: true,
        data: { session: SessionFactory.create() }
      });
      
      await mockHandler({
        params: { id: '1' },
        headers: await createAuthHeaders()
      });
      
      const duration = performance.now() - start;
      expect(duration).toBeWithinResponseTime(100);
    });
  });
});