/**
 * Dashboard Stats API Tests
 * Tests for /api/dashboard/stats endpoint following TDD methodology
 * 
 * Requirements from screenshots:
 * - User greeting with Level 3 badge and XP progress (0/1000 XP)
 * - Three stat cards: Available Exams (0), Active Sessions (0), Tests Completed (0)
 * - Today's Goal progress widget
 * - Recent activity tracking
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock the database utility
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  get: vi.fn(),
};

vi.mock('~/server/utils/database', () => ({
  getDB: vi.fn(() => mockDb),
  eq: vi.fn(),
  and: vi.fn(),
  sql: vi.fn((template, ...values) => ({ 
    template, 
    values,
    queryType: 'raw',
    toString: () => template
  })),
  desc: vi.fn()
}));

// Mock database schema tables
vi.mock('~/server/database/schema-dashboard', () => ({
  userProfiles: { userId: 'userProfiles.userId' },
  certificationPaths: { isActive: 'certificationPaths.isActive' },
  studySessions: { userId: 'studySessions.userId', status: 'studySessions.status' },
  testResults: { userId: 'testResults.userId', completedAt: 'testResults.completedAt' },
  dailyGoals: { userId: 'dailyGoals.userId', date: 'dailyGoals.date' }
}));

vi.mock('~/server/database/schema', () => ({
  users: {},
  exams: {},
  studySessions: {},
  userProgress: {},
  userAnswers: {}
}));

// Mock auth
const mockRequireAuth = vi.fn();
vi.mock('~/server/utils/auth', () => ({
  requireAuth: mockRequireAuth
}));

// Mock H3 utilities
const mockSetHeader = vi.fn();
const mockCreateError = vi.fn((error) => {
  const err = new Error(error.statusMessage);
  (err as any).statusCode = error.statusCode;
  throw err;
});

// Mock the global functions that Nuxt provides
global.defineEventHandler = vi.fn((handler: any) => handler);
global.setHeader = mockSetHeader;
global.createError = mockCreateError;

vi.mock('h3', () => ({
  defineEventHandler: (handler: any) => handler,
  setHeader: mockSetHeader,
  createError: mockCreateError
}));

describe('Dashboard Stats API', () => {
  const mockUser = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com'
  };

  const mockUserProfile = {
    id: 'profile-123',
    userId: 'user-123',
    displayName: 'John Doe',
    level: 3,
    currentXp: 750,
    totalXp: 2750,
    streak: 5,
    lastActivityAt: new Date('2024-01-15T10:00:00Z'),
    preferredTheme: 'system' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-15T10:00:00Z')
  };

  const mockDailyGoal = {
    id: 'goal-1',
    userId: 'user-123',
    date: '2024-01-15',
    targetQuestions: 20,
    completedQuestions: 12,
    targetTime: 60,
    completedTime: 35,
    isCompleted: false,
    streakCount: 5
  };

  const mockTestResult = {
    id: 'result-1',
    sessionId: 'session-completed-1',
    userId: 'user-123',
    certificationId: 'cert-1',
    score: 85.5,
    passed: true,
    totalQuestions: 20,
    correctAnswers: 17,
    timeSpent: 1800,
    completedAt: new Date('2024-01-14T15:30:00Z')
  };

  const mockStudySession = {
    id: 'session-1',
    userId: 'user-123',
    certificationId: 'cert-1',
    sessionType: 'practice' as const,
    status: 'active' as const,
    startedAt: new Date('2024-01-15T09:00:00Z'),
    duration: 0,
    questionsAnswered: 0,
    correctAnswers: 0
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockRequireAuth.mockRejectedValue(new Error('Unauthorized'));

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');

      await expect(
        statsHandler({ context: {} } as any)
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('User Profile Data', () => {
    it('should return user profile with level and XP information', async () => {
      setupSuccessfulMocks();

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      expect(result.user).toEqual({
        displayName: 'John Doe',
        level: 3,
        currentXp: 750,
        nextLevelXp: 3000, // Level 3 * 1000
        streak: 5
      });
    });

    it('should handle missing user profile with defaults', async () => {
      // Mock no profile found
      let callCount = 0;
      mockDb.get.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve(null); // No profile
        return getDefaultMockResponse(callCount);
      });

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      expect(result.user).toEqual({
        displayName: 'John Doe',
        level: 1,
        currentXp: 0,
        nextLevelXp: 1000,
        streak: 0
      });
    });

    it('should calculate next level XP correctly for different levels', async () => {
      const testCases = [
        { level: 1, expectedNextLevelXp: 1000 },
        { level: 2, expectedNextLevelXp: 2000 },
        { level: 5, expectedNextLevelXp: 5000 },
        { level: 10, expectedNextLevelXp: 10000 }
      ];

      for (const testCase of testCases) {
        vi.resetAllMocks();
        mockRequireAuth.mockResolvedValue(mockUser);
        
        let callCount = 0;
        mockDb.get.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              ...mockUserProfile,
              level: testCase.level
            });
          }
          return getDefaultMockResponse(callCount);
        });

        const statsHandler = (await import('~/server/api/dashboard/stats.get')).default;
        const result = await statsHandler({ context: {} } as any);
        
        expect(result.user.nextLevelXp).toBe(testCase.expectedNextLevelXp);
      }
    });
  });

  describe('Statistics Calculation', () => {
    it('should return correct statistics from dashboard requirements', async () => {
      setupSuccessfulMocks();

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      expect(result.statistics).toEqual({
        availableExams: 2, // Mock 2 available exams
        activeSessions: 1, // Mock 1 active session
        testsCompleted: 1, // Mock 1 completed test
        averageScore: 86, // Rounded from 85.5
        passRate: 100 // 1 passed out of 1 total
      });
    });

    it('should handle zero tests completed', async () => {
      let callCount = 0;
      mockDb.get.mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: return Promise.resolve(mockUserProfile);
          case 2: return Promise.resolve({ count: 2 });
          case 3: return Promise.resolve({ count: 1 });
          case 4: return Promise.resolve({ total: 0, passed: 0, avgScore: null }); // No tests
          case 5: return Promise.resolve(mockDailyGoal);
          case 6: return Promise.resolve(null); // No recent test
          case 7: return Promise.resolve(mockStudySession);
          default: return Promise.resolve(null);
        }
      });

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      expect(result.statistics.testsCompleted).toBe(0);
      expect(result.statistics.averageScore).toBe(0);
      expect(result.statistics.passRate).toBe(0);
    });

    it('should calculate pass rate correctly with mixed results', async () => {
      let callCount = 0;
      mockDb.get.mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: return Promise.resolve(mockUserProfile);
          case 2: return Promise.resolve({ count: 2 });
          case 3: return Promise.resolve({ count: 1 });
          case 4: return Promise.resolve({ total: 5, passed: 3, avgScore: 72.5 }); // 3/5 passed
          case 5: return Promise.resolve(mockDailyGoal);
          case 6: return Promise.resolve(mockTestResult);
          case 7: return Promise.resolve(mockStudySession);
          default: return Promise.resolve(null);
        }
      });

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      expect(result.statistics.testsCompleted).toBe(5);
      expect(result.statistics.averageScore).toBe(73); // Rounded from 72.5
      expect(result.statistics.passRate).toBe(60); // 3/5 = 60%
    });
  });

  describe("Today's Goal", () => {
    it('should return today\'s goal progress', async () => {
      setupSuccessfulMocks();

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      expect(result.todayGoal).toEqual({
        targetQuestions: 20,
        completedQuestions: 12,
        targetTime: 60,
        completedTime: 35,
        isCompleted: false
      });
    });

    it('should return default goal when no goal exists for today', async () => {
      let callCount = 0;
      mockDb.get.mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: return Promise.resolve(mockUserProfile);
          case 2: return Promise.resolve({ count: 2 });
          case 3: return Promise.resolve({ count: 1 });
          case 4: return Promise.resolve({ total: 1, passed: 1, avgScore: 85.5 });
          case 5: return Promise.resolve(null); // No daily goal
          case 6: return Promise.resolve(mockTestResult);
          case 7: return Promise.resolve(mockStudySession);
          default: return Promise.resolve(null);
        }
      });

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      expect(result.todayGoal).toEqual({
        targetQuestions: 10,
        completedQuestions: 0,
        targetTime: 30,
        completedTime: 0,
        isCompleted: false
      });
    });
  });

  describe('Recent Activity', () => {
    it('should return recent activity information', async () => {
      setupSuccessfulMocks();

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      expect(result.recentActivity).toEqual({
        lastTestDate: mockTestResult.completedAt,
        lastTestScore: mockTestResult.score,
        lastStudyDate: mockStudySession.startedAt
      });
    });

    it('should handle no recent activity', async () => {
      let callCount = 0;
      mockDb.get.mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: return Promise.resolve(mockUserProfile);
          case 2: return Promise.resolve({ count: 2 });
          case 3: return Promise.resolve({ count: 1 });
          case 4: return Promise.resolve({ total: 0, passed: 0, avgScore: null });
          case 5: return Promise.resolve(mockDailyGoal);
          case 6: return Promise.resolve(null); // No recent test
          case 7: return Promise.resolve(null); // No recent session
          default: return Promise.resolve(null);
        }
      });

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      expect(result.recentActivity).toEqual({
        lastTestDate: undefined,
        lastTestScore: undefined,
        lastStudyDate: undefined
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.get.mockRejectedValue(new Error('Database connection failed'));

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');

      await expect(
        statsHandler({ context: {} } as any)
      ).rejects.toThrow('Failed to load dashboard statistics');
    });
  });

  describe('Cache Headers', () => {
    it('should set appropriate cache headers', async () => {
      setupSuccessfulMocks();

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      await statsHandler({ context: {} } as any);

      expect(mockSetHeader).toHaveBeenCalledWith(
        expect.anything(),
        'Cache-Control',
        'public, max-age=300, s-maxage=300'
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        expect.anything(),
        'CDN-Cache-Control',
        'max-age=300'
      );
    });
  });

  describe('Data Types and Validation', () => {
    it('should return properly typed response', async () => {
      setupSuccessfulMocks();

      const { default: statsHandler } = await import('~/server/api/dashboard/stats.get');
      const result = await statsHandler({ context: {} } as any);

      // Verify all required fields exist with correct types
      expect(typeof result.user.displayName).toBe('string');
      expect(typeof result.user.level).toBe('number');
      expect(typeof result.user.currentXp).toBe('number');
      expect(typeof result.user.nextLevelXp).toBe('number');
      expect(typeof result.user.streak).toBe('number');

      expect(typeof result.statistics.availableExams).toBe('number');
      expect(typeof result.statistics.activeSessions).toBe('number');
      expect(typeof result.statistics.testsCompleted).toBe('number');
      expect(typeof result.statistics.averageScore).toBe('number');
      expect(typeof result.statistics.passRate).toBe('number');

      expect(typeof result.todayGoal.targetQuestions).toBe('number');
      expect(typeof result.todayGoal.completedQuestions).toBe('number');
      expect(typeof result.todayGoal.targetTime).toBe('number');
      expect(typeof result.todayGoal.completedTime).toBe('number');
      expect(typeof result.todayGoal.isCompleted).toBe('boolean');
    });
  });

  // Helper functions
  function setupSuccessfulMocks() {
    let callCount = 0;
    mockDb.get.mockImplementation(() => {
      callCount++;
      switch (callCount) {
        case 1: return Promise.resolve(mockUserProfile);
        case 2: return Promise.resolve({ count: 2 }); // Available exams
        case 3: return Promise.resolve({ count: 1 }); // Active sessions
        case 4: return Promise.resolve({ total: 1, passed: 1, avgScore: 85.5 }); // Test stats
        case 5: return Promise.resolve(mockDailyGoal);
        case 6: return Promise.resolve(mockTestResult);
        case 7: return Promise.resolve(mockStudySession);
        default: return Promise.resolve(null);
      }
    });
  }

  function getDefaultMockResponse(callCount: number) {
    switch (callCount) {
      case 2: return Promise.resolve({ count: 2 });
      case 3: return Promise.resolve({ count: 1 });
      case 4: return Promise.resolve({ total: 1, passed: 1, avgScore: 85.5 });
      case 5: return Promise.resolve(mockDailyGoal);
      case 6: return Promise.resolve(mockTestResult);
      case 7: return Promise.resolve(mockStudySession);
      default: return Promise.resolve(null);
    }
  }
});