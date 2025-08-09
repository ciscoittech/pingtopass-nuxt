/**
 * Dashboard Statistics API Endpoint
 * Provides comprehensive dashboard stats following screenshot requirements:
 * - User profile with level/XP (Level 3, 750/1000 XP)
 * - Three stat cards: Available Exams, Active Sessions, Tests Completed
 * - Today's Goal progress widget
 * - Recent activity tracking
 */
import { getDB, eq, and, gte, sql, desc } from '~/server/utils/database';
import { requireAuth } from '~/server/utils/auth';
import {
  users,
  exams,
  studySessions,
  userProgress,
  userAnswers
} from '~/server/database/schema';
import {
  userProfiles,
  certificationPaths,
  userCertificationProgress,
  testResults,
  dailyGoals
} from '~/server/database/schema-dashboard';

export interface DashboardStats {
  user: {
    displayName: string;
    level: number;
    currentXp: number;
    nextLevelXp: number;
    streak: number;
  };
  statistics: {
    availableExams: number;
    activeSessions: number;
    testsCompleted: number;
    averageScore: number;
    passRate: number;
  };
  todayGoal: {
    targetQuestions: number;
    completedQuestions: number;
    targetTime: number;
    completedTime: number;
    isCompleted: boolean;
  };
  recentActivity: {
    lastTestDate?: Date;
    lastTestScore?: number;
    lastStudyDate?: Date;
  };
}

export default defineEventHandler(async (event): Promise<DashboardStats> => {
  // Get authenticated user
  const user = await requireAuth(event);
  const userId = user.id;

  // Set cache headers for edge caching (5 minutes)
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=300');
  setHeader(event, 'CDN-Cache-Control', 'max-age=300');

  const db = getDB();

  try {
    // Get today's date for daily goal query
    const today = new Date().toISOString().split('T')[0];

    // Parallel queries for optimal performance
    const [
      profile,
      availableExamsCount,
      activeSessionsCount,
      completedTestsStats,
      todayGoal,
      recentTest,
      recentSession
    ] = await Promise.all([
      // User profile with XP and level
      db.select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId))
        .get(),
      
      // Count of available active certifications
      db.select({ count: sql<number>`count(*)` })
        .from(certificationPaths)
        .where(eq(certificationPaths.isActive, true))
        .get(),
      
      // Active study sessions count
      db.select({ count: sql<number>`count(*)` })
        .from(studySessions)
        .where(
          and(
            eq(studySessions.userId, userId),
            eq(studySessions.status, 'active')
          )
        )
        .get(),
      
      // Completed tests statistics with aggregations
      db.select({
        total: sql<number>`count(*)`,
        passed: sql<number>`sum(case when passed = 1 then 1 else 0 end)`,
        avgScore: sql<number>`avg(score)`
      })
        .from(testResults)
        .where(eq(testResults.userId, userId))
        .get(),
      
      // Today's daily goal
      db.select()
        .from(dailyGoals)
        .where(
          and(
            eq(dailyGoals.userId, userId),
            eq(dailyGoals.date, today)
          )
        )
        .get(),
      
      // Most recent test result
      db.select()
        .from(testResults)
        .where(eq(testResults.userId, userId))
        .orderBy(desc(testResults.completedAt))
        .limit(1)
        .get(),
      
      // Most recent study session
      db.select()
        .from(studySessions)
        .where(eq(studySessions.userId, userId))
        .orderBy(desc(studySessions.startedAt))
        .limit(1)
        .get()
    ]);

    // Calculate next level XP requirement (linear progression: level * 1000)
    const calculateNextLevelXp = (level: number): number => level * 1000;

    // Build comprehensive dashboard response
    const stats: DashboardStats = {
      user: {
        displayName: profile?.displayName || user.name || 'Student',
        level: profile?.level || 1,
        currentXp: profile?.currentXp || 0,
        nextLevelXp: calculateNextLevelXp(profile?.level || 1),
        streak: profile?.streak || 0
      },
      statistics: {
        availableExams: availableExamsCount?.count || 0,
        activeSessions: activeSessionsCount?.count || 0,
        testsCompleted: completedTestsStats?.total || 0,
        averageScore: Math.round(completedTestsStats?.avgScore || 0),
        passRate: completedTestsStats?.total 
          ? Math.round(((completedTestsStats?.passed || 0) / completedTestsStats.total) * 100)
          : 0
      },
      todayGoal: todayGoal ? {
        targetQuestions: todayGoal.targetQuestions,
        completedQuestions: todayGoal.completedQuestions,
        targetTime: todayGoal.targetTime,
        completedTime: todayGoal.completedTime,
        isCompleted: todayGoal.isCompleted
      } : {
        targetQuestions: 10,
        completedQuestions: 0,
        targetTime: 30,
        completedTime: 0,
        isCompleted: false
      },
      recentActivity: {
        lastTestDate: recentTest?.completedAt,
        lastTestScore: recentTest?.score,
        lastStudyDate: recentSession?.startedAt
      }
    };

    return stats;
  } catch (error) {
    console.error('Dashboard stats error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load dashboard statistics'
    });
  }
});