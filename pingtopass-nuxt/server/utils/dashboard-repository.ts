// Repository layer for dashboard data operations
import { getDB } from './database';
import { 
  userProfiles, 
  userCertificationProgress, 
  studySessions,
  testResults,
  dailyGoals,
  certificationPaths,
  certificationVendors,
  questionResponses,
  userMetrics
} from '../database/schema-dashboard';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';

// Cache configuration for edge performance
const CACHE_TTL = {
  USER_PROFILE: 300, // 5 minutes
  DASHBOARD_STATS: 60, // 1 minute
  CERTIFICATION_LIST: 3600, // 1 hour
  TEST_RESULTS: 300 // 5 minutes
};

export class DashboardRepository {
  
  // ========================================
  // User Profile Operations
  // ========================================
  
  async getUserProfile(userId: string) {
    const db = getDB();
    return await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .get();
  }

  async createOrUpdateProfile(userId: string, data: Partial<typeof userProfiles.$inferInsert>) {
    const db = getDB();
    const existing = await this.getUserProfile(userId);
    
    if (existing) {
      return await db
        .update(userProfiles)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId))
        .returning()
        .get();
    } else {
      return await db
        .insert(userProfiles)
        .values({
          id: crypto.randomUUID(),
          userId,
          displayName: data.displayName || 'Student',
          ...data
        })
        .returning()
        .get();
    }
  }

  async updateXP(userId: string, xpGained: number) {
    const db = getDB();
    const profile = await this.getUserProfile(userId);
    if (!profile) throw new Error('User profile not found');

    const newXp = profile.currentXp + xpGained;
    const newTotalXp = profile.totalXp + xpGained;
    const xpForNextLevel = profile.level * 1000;
    
    let newLevel = profile.level;
    let currentXp = newXp;
    
    // Check for level up
    if (newXp >= xpForNextLevel) {
      newLevel++;
      currentXp = newXp - xpForNextLevel;
    }

    return await db
      .update(userProfiles)
      .set({
        currentXp,
        totalXp: newTotalXp,
        level: newLevel,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.userId, userId))
      .returning()
      .get();
  }

  // ========================================
  // Certification Progress Operations
  // ========================================
  
  async getUserCertificationProgress(userId: string, certificationId?: string) {
    const db = getDB();
    if (certificationId) {
      return await db
        .select()
        .from(userCertificationProgress)
        .where(
          and(
            eq(userCertificationProgress.userId, userId),
            eq(userCertificationProgress.certificationId, certificationId)
          )
        )
        .get();
    }
    
    return await db
      .select()
      .from(userCertificationProgress)
      .where(eq(userCertificationProgress.userId, userId))
      .all();
  }

  async updateCertificationProgress(
    userId: string, 
    certificationId: string, 
    updates: Partial<typeof userCertificationProgress.$inferInsert>
  ) {
    const db = getDB();
    const existing = await this.getUserCertificationProgress(userId, certificationId);
    
    if (existing) {
      return await db
        .update(userCertificationProgress)
        .set({ ...updates, updatedAt: new Date() })
        .where(
          and(
            eq(userCertificationProgress.userId, userId),
            eq(userCertificationProgress.certificationId, certificationId)
          )
        )
        .returning()
        .get();
    } else {
      return await db
        .insert(userCertificationProgress)
        .values({
          id: crypto.randomUUID(),
          userId,
          certificationId,
          ...updates
        })
        .returning()
        .get();
    }
  }

  // ========================================
  // Study Session Operations
  // ========================================
  
  async createStudySession(data: typeof studySessions.$inferInsert) {
    const db = getDB();
    return await db
      .insert(studySessions)
      .values({
        id: crypto.randomUUID(),
        ...data
      })
      .returning()
      .get();
  }

  async updateStudySession(sessionId: string, updates: Partial<typeof studySessions.$inferInsert>) {
    const db = getDB();
    return await db
      .update(studySessions)
      .set(updates)
      .where(eq(studySessions.id, sessionId))
      .returning()
      .get();
  }

  async getActiveSessions(userId: string) {
    const db = getDB();
    return await db
      .select()
      .from(studySessions)
      .where(
        and(
          eq(studySessions.userId, userId),
          eq(studySessions.status, 'active')
        )
      )
      .all();
  }

  async endSession(sessionId: string, xpEarned: number) {
    const db = getDB();
    const session = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.id, sessionId))
      .get();
    
    if (!session) throw new Error('Session not found');
    
    const duration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    
    return await db
      .update(studySessions)
      .set({
        status: 'completed',
        endedAt: new Date(),
        duration,
        xpEarned
      })
      .where(eq(studySessions.id, sessionId))
      .returning()
      .get();
  }

  // ========================================
  // Test Results Operations
  // ========================================
  
  async saveTestResult(data: typeof testResults.$inferInsert) {
    const db = getDB();
    const result = await db
      .insert(testResults)
      .values({
        id: crypto.randomUUID(),
        ...data
      })
      .returning()
      .get();

    // Update certification progress
    await this.updateCertificationProgress(data.userId, data.certificationId, {
      testsCompleted: sql`${userCertificationProgress.testsCompleted} + 1`,
      testsPassed: data.passed 
        ? sql`${userCertificationProgress.testsPassed} + 1` 
        : userCertificationProgress.testsPassed,
      averageScore: sql`(${userCertificationProgress.averageScore} * ${userCertificationProgress.testsCompleted} + ${data.score}) / (${userCertificationProgress.testsCompleted} + 1)`,
      bestScore: sql`MAX(${userCertificationProgress.bestScore}, ${data.score})`
    });

    return result;
  }

  async getRecentTests(userId: string, limit: number = 5) {
    const db = getDB();
    return await db
      .select()
      .from(testResults)
      .where(eq(testResults.userId, userId))
      .orderBy(desc(testResults.completedAt))
      .limit(limit)
      .all();
  }

  async getTestStatistics(userId: string) {
    const db = getDB();
    return await db
      .select({
        total: sql<number>`count(*)`,
        passed: sql<number>`sum(case when passed = 1 then 1 else 0 end)`,
        avgScore: sql<number>`avg(score)`,
        avgTime: sql<number>`avg(time_spent)`
      })
      .from(testResults)
      .where(eq(testResults.userId, userId))
      .get();
  }

  // ========================================
  // Daily Goals Operations
  // ========================================
  
  async getTodayGoal(userId: string) {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    
    let goal = await db
      .select()
      .from(dailyGoals)
      .where(
        and(
          eq(dailyGoals.userId, userId),
          eq(dailyGoals.date, today)
        )
      )
      .get();

    // Create default goal if doesn't exist
    if (!goal) {
      goal = await db
        .insert(dailyGoals)
        .values({
          id: crypto.randomUUID(),
          userId,
          date: today,
          targetQuestions: 10,
          targetTime: 30
        })
        .returning()
        .get();
    }

    return goal;
  }

  async updateDailyProgress(userId: string, questionsCompleted: number, timeSpent: number) {
    const db = getDB();
    const goal = await this.getTodayGoal(userId);
    
    const newQuestionsCompleted = goal.completedQuestions + questionsCompleted;
    const newTimeCompleted = goal.completedTime + timeSpent;
    const isCompleted = 
      newQuestionsCompleted >= goal.targetQuestions && 
      newTimeCompleted >= goal.targetTime;

    return await db
      .update(dailyGoals)
      .set({
        completedQuestions: newQuestionsCompleted,
        completedTime: newTimeCompleted,
        isCompleted
      })
      .where(eq(dailyGoals.id, goal.id))
      .returning()
      .get();
  }

  // ========================================
  // Question Response Tracking
  // ========================================
  
  async saveQuestionResponse(data: typeof questionResponses.$inferInsert) {
    const db = getDB();
    return await db
      .insert(questionResponses)
      .values({
        id: crypto.randomUUID(),
        ...data
      })
      .returning()
      .get();
  }

  async getQuestionStats(questionId: string) {
    const db = getDB();
    return await db
      .select({
        totalAttempts: sql<number>`count(*)`,
        correctRate: sql<number>`avg(case when is_correct = 1 then 1.0 else 0.0 end) * 100`,
        avgTimeSpent: sql<number>`avg(time_spent)`,
        avgConfidence: sql<number>`avg(confidence)`
      })
      .from(questionResponses)
      .where(eq(questionResponses.questionId, questionId))
      .get();
  }

  // ========================================
  // Metrics & Analytics
  // ========================================
  
  async updateDailyMetrics(userId: string, metrics: Partial<typeof userMetrics.$inferInsert>) {
    const db = getDB();
    const today = new Date().toISOString().split('T')[0];
    
    const existing = await db
      .select()
      .from(userMetrics)
      .where(
        and(
          eq(userMetrics.userId, userId),
          eq(userMetrics.date, today)
        )
      )
      .get();

    if (existing) {
      return await db
        .update(userMetrics)
        .set({
          studyTime: (existing.studyTime || 0) + (metrics.studyTime || 0),
          questionsAnswered: (existing.questionsAnswered || 0) + (metrics.questionsAnswered || 0),
          correctAnswers: (existing.correctAnswers || 0) + (metrics.correctAnswers || 0),
          testsCompleted: (existing.testsCompleted || 0) + (metrics.testsCompleted || 0),
          xpEarned: (existing.xpEarned || 0) + (metrics.xpEarned || 0)
        })
        .where(eq(userMetrics.id, existing.id))
        .returning()
        .get();
    } else {
      return await db
        .insert(userMetrics)
        .values({
          id: crypto.randomUUID(),
          userId,
          date: today,
          ...metrics
        })
        .returning()
        .get();
    }
  }

  async getWeeklyMetrics(userId: string) {
    const db = getDB();
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return await db
      .select()
      .from(userMetrics)
      .where(
        and(
          eq(userMetrics.userId, userId),
          gte(userMetrics.date, startDate),
          lte(userMetrics.date, endDate)
        )
      )
      .orderBy(userMetrics.date)
      .all();
  }

  // ========================================
  // Certification Management
  // ========================================
  
  async getFeaturedCertifications() {
    const db = getDB();
    return await db
      .select({
        certification: certificationPaths,
        vendor: certificationVendors
      })
      .from(certificationPaths)
      .leftJoin(certificationVendors, eq(certificationPaths.vendorId, certificationVendors.id))
      .where(
        and(
          eq(certificationPaths.isFeatured, true),
          eq(certificationPaths.isActive, true)
        )
      )
      .limit(6)
      .all();
  }

  async searchCertifications(filters: {
    vendor?: string;
    category?: string;
    difficulty?: number;
    search?: string;
  }) {
    const db = getDB();
    let query = db.select().from(certificationPaths);
    
    const conditions = [];
    if (filters.vendor) conditions.push(eq(certificationPaths.vendorId, filters.vendor));
    if (filters.category) conditions.push(eq(certificationPaths.category, filters.category));
    if (filters.difficulty) conditions.push(eq(certificationPaths.difficulty, filters.difficulty));
    if (filters.search) {
      conditions.push(
        sql`${certificationPaths.name} LIKE ${`%${filters.search}%`} OR ${certificationPaths.code} LIKE ${`%${filters.search}%`}`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.all();
  }
}

// Export singleton instance
export const dashboardRepo = new DashboardRepository();