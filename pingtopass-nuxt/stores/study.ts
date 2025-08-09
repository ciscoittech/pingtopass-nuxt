import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { 
  QuestionWithAnswers, 
  StudySession, 
  UserAnswer 
} from '~/types/exam';

export interface StudySessionState {
  sessionId: string;
  currentQuestionIndex: number;
  answers: Record<string, string[]>; // questionId -> selectedOptions
  flaggedQuestions: Set<string>; // questionIds that are flagged for review
  timeSpent: Record<string, number>; // questionId -> seconds spent
  sessionStartTime: number;
  lastActivityTime: number;
  isReviewMode: boolean;
}

export interface StudyStatistics {
  totalTimeSpent: number; // in seconds
  averageTimePerQuestion: number;
  correctAnswers: number;
  totalAnswered: number;
  accuracyRate: number;
  questionsReviewed: number;
  flaggedCount: number;
  difficultyBreakdown: Record<number, { correct: number; total: number }>;
  objectiveBreakdown: Record<string, { correct: number; total: number }>;
}

export const useStudyStore = defineStore('study', () => {
  // State
  const currentSession = ref<StudySessionState | null>(null);
  const sessionHistory = ref<StudySessionState[]>([]);
  const isAutoSaveEnabled = ref(true);
  const autoSaveInterval = ref<NodeJS.Timeout | null>(null);
  const keyboardShortcutsEnabled = ref(true);

  // Study preferences
  const studyPreferences = ref({
    immediateExplanations: true,
    showDifficulty: true,
    showObjectives: true,
    enableSounds: true,
    reviewIncorrectOnly: false,
    randomizeOrder: false,
    practiceMode: 'review' as 'practice' | 'timed' | 'exam' | 'review'
  });

  // Performance tracking
  const performanceMetrics = ref({
    streak: 0, // current correct answer streak
    bestStreak: 0,
    totalSessions: 0,
    totalTimeSpent: 0,
    averageAccuracy: 0,
    weakAreas: [] as string[], // objective IDs where performance is below average
    strongAreas: [] as string[], // objective IDs where performance is above average
    improvementTrend: 0 // positive = improving, negative = declining
  });

  // Computed properties
  const hasActiveSession = computed(() => currentSession.value !== null);
  
  const currentQuestionId = computed(() => {
    if (!currentSession.value) return null;
    // This would need to be derived from the questions array
    return null; // Placeholder - would need questions array
  });

  const sessionProgress = computed(() => {
    if (!currentSession.value) return 0;
    const answered = Object.keys(currentSession.value.answers).length;
    // Would need total questions count from session
    return answered;
  });

  const currentAccuracy = computed(() => {
    if (!currentSession.value) return 0;
    // Would calculate based on correct answers vs total answered
    return 0; // Placeholder
  });

  const timeSpentInCurrentSession = computed(() => {
    if (!currentSession.value) return 0;
    return Date.now() - currentSession.value.sessionStartTime;
  });

  const flaggedQuestionsCount = computed(() => {
    return currentSession.value?.flaggedQuestions.size || 0;
  });

  // Actions
  const startStudySession = (sessionId: string, mode: 'practice' | 'timed' | 'exam' | 'review' = 'practice') => {
    const now = Date.now();
    
    currentSession.value = {
      sessionId,
      currentQuestionIndex: 0,
      answers: {},
      flaggedQuestions: new Set(),
      timeSpent: {},
      sessionStartTime: now,
      lastActivityTime: now,
      isReviewMode: mode === 'review'
    };

    studyPreferences.value.practiceMode = mode;

    // Start auto-save if enabled
    if (isAutoSaveEnabled.value) {
      startAutoSave();
    }

    // Update performance metrics
    performanceMetrics.value.totalSessions++;
  };

  const answerQuestion = (questionId: string, selectedOptions: string[], isCorrect: boolean, timeSpent?: number) => {
    if (!currentSession.value) return;

    currentSession.value.answers[questionId] = selectedOptions;
    currentSession.value.lastActivityTime = Date.now();

    if (timeSpent !== undefined) {
      currentSession.value.timeSpent[questionId] = timeSpent;
    }

    // Update streak
    if (isCorrect) {
      performanceMetrics.value.streak++;
      if (performanceMetrics.value.streak > performanceMetrics.value.bestStreak) {
        performanceMetrics.value.bestStreak = performanceMetrics.value.streak;
      }
    } else {
      performanceMetrics.value.streak = 0;
    }

    saveSessionState();
  };

  const flagQuestion = (questionId: string, flagged: boolean = true) => {
    if (!currentSession.value) return;

    if (flagged) {
      currentSession.value.flaggedQuestions.add(questionId);
    } else {
      currentSession.value.flaggedQuestions.delete(questionId);
    }

    currentSession.value.lastActivityTime = Date.now();
    saveSessionState();
  };

  const navigateToQuestion = (index: number) => {
    if (!currentSession.value) return false;

    // Would validate against total questions
    currentSession.value.currentQuestionIndex = index;
    currentSession.value.lastActivityTime = Date.now();
    saveSessionState();
    return true;
  };

  const nextQuestion = () => {
    if (!currentSession.value) return false;

    currentSession.value.currentQuestionIndex++;
    currentSession.value.lastActivityTime = Date.now();
    saveSessionState();
    return true;
  };

  const previousQuestion = () => {
    if (!currentSession.value) return false;
    
    if (currentSession.value.currentQuestionIndex > 0) {
      currentSession.value.currentQuestionIndex--;
      currentSession.value.lastActivityTime = Date.now();
      saveSessionState();
      return true;
    }
    return false;
  };

  const toggleReviewMode = () => {
    if (!currentSession.value) return;

    currentSession.value.isReviewMode = !currentSession.value.isReviewMode;
    currentSession.value.lastActivityTime = Date.now();
    saveSessionState();
  };

  const endStudySession = async () => {
    if (!currentSession.value) return null;

    const session = { ...currentSession.value };
    
    // Calculate final statistics
    const stats = calculateSessionStatistics(session);
    
    // Update performance metrics
    updatePerformanceMetrics(stats);
    
    // Archive session
    sessionHistory.value.push(session);
    
    // Clear current session
    currentSession.value = null;
    
    // Stop auto-save
    stopAutoSave();
    
    return { session, statistics: stats };
  };

  const pauseSession = () => {
    if (!currentSession.value) return;
    
    currentSession.value.lastActivityTime = Date.now();
    saveSessionState();
    stopAutoSave();
  };

  const resumeSession = () => {
    if (!currentSession.value) return;
    
    currentSession.value.lastActivityTime = Date.now();
    if (isAutoSaveEnabled.value) {
      startAutoSave();
    }
  };

  const updatePreferences = (newPreferences: Partial<typeof studyPreferences.value>) => {
    studyPreferences.value = { ...studyPreferences.value, ...newPreferences };
    savePreferences();
  };

  const toggleKeyboardShortcuts = () => {
    keyboardShortcutsEnabled.value = !keyboardShortcutsEnabled.value;
  };

  // Auto-save functionality
  const startAutoSave = () => {
    if (autoSaveInterval.value) {
      clearInterval(autoSaveInterval.value);
    }
    
    autoSaveInterval.value = setInterval(() => {
      saveSessionState();
    }, 30000); // Save every 30 seconds
  };

  const stopAutoSave = () => {
    if (autoSaveInterval.value) {
      clearInterval(autoSaveInterval.value);
      autoSaveInterval.value = null;
    }
  };

  const saveSessionState = () => {
    if (!currentSession.value) return;
    
    // In a real implementation, this would persist to localStorage or send to server
    try {
      const sessionData = JSON.stringify(currentSession.value);
      localStorage.setItem(`study-session-${currentSession.value.sessionId}`, sessionData);
    } catch (error) {
      console.warn('Failed to save session state:', error);
    }
  };

  const loadSessionState = (sessionId: string): boolean => {
    try {
      const sessionData = localStorage.getItem(`study-session-${sessionId}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        // Convert Set back from array
        session.flaggedQuestions = new Set(session.flaggedQuestions);
        currentSession.value = session;
        
        if (isAutoSaveEnabled.value) {
          startAutoSave();
        }
        
        return true;
      }
    } catch (error) {
      console.warn('Failed to load session state:', error);
    }
    return false;
  };

  const savePreferences = () => {
    try {
      localStorage.setItem('study-preferences', JSON.stringify(studyPreferences.value));
    } catch (error) {
      console.warn('Failed to save preferences:', error);
    }
  };

  const loadPreferences = () => {
    try {
      const preferences = localStorage.getItem('study-preferences');
      if (preferences) {
        studyPreferences.value = { ...studyPreferences.value, ...JSON.parse(preferences) };
      }
    } catch (error) {
      console.warn('Failed to load preferences:', error);
    }
  };

  // Statistics calculation
  const calculateSessionStatistics = (session: StudySessionState): StudyStatistics => {
    const totalTimeSpent = Object.values(session.timeSpent).reduce((sum, time) => sum + time, 0);
    const totalAnswered = Object.keys(session.answers).length;
    
    return {
      totalTimeSpent,
      averageTimePerQuestion: totalAnswered > 0 ? totalTimeSpent / totalAnswered : 0,
      correctAnswers: 0, // Would need to calculate based on actual answers
      totalAnswered,
      accuracyRate: 0, // Would need to calculate
      questionsReviewed: totalAnswered,
      flaggedCount: session.flaggedQuestions.size,
      difficultyBreakdown: {},
      objectiveBreakdown: {}
    };
  };

  const updatePerformanceMetrics = (stats: StudyStatistics) => {
    performanceMetrics.value.totalTimeSpent += stats.totalTimeSpent;
    
    // Update average accuracy (simple moving average)
    const totalSessions = performanceMetrics.value.totalSessions;
    if (totalSessions > 0) {
      performanceMetrics.value.averageAccuracy = 
        (performanceMetrics.value.averageAccuracy * (totalSessions - 1) + stats.accuracyRate) / totalSessions;
    } else {
      performanceMetrics.value.averageAccuracy = stats.accuracyRate;
    }
  };

  // Export data functionality
  const exportSessionData = (format: 'json' | 'csv' = 'json') => {
    if (!currentSession.value && sessionHistory.value.length === 0) {
      return null;
    }

    const allSessions = currentSession.value 
      ? [...sessionHistory.value, currentSession.value]
      : sessionHistory.value;

    if (format === 'json') {
      return JSON.stringify({
        sessions: allSessions,
        preferences: studyPreferences.value,
        performance: performanceMetrics.value,
        exportedAt: new Date().toISOString()
      }, null, 2);
    }

    // CSV export would be implemented here
    return null;
  };

  const clearSessionHistory = () => {
    sessionHistory.value = [];
    performanceMetrics.value = {
      streak: 0,
      bestStreak: 0,
      totalSessions: 0,
      totalTimeSpent: 0,
      averageAccuracy: 0,
      weakAreas: [],
      strongAreas: [],
      improvementTrend: 0
    };
  };

  // Initialize store
  const initializeStore = () => {
    loadPreferences();
    // Could also load recent session history from localStorage
  };

  return {
    // State
    currentSession,
    sessionHistory,
    isAutoSaveEnabled,
    keyboardShortcutsEnabled,
    studyPreferences,
    performanceMetrics,

    // Computed
    hasActiveSession,
    currentQuestionId,
    sessionProgress,
    currentAccuracy,
    timeSpentInCurrentSession,
    flaggedQuestionsCount,

    // Actions
    startStudySession,
    answerQuestion,
    flagQuestion,
    navigateToQuestion,
    nextQuestion,
    previousQuestion,
    toggleReviewMode,
    endStudySession,
    pauseSession,
    resumeSession,
    updatePreferences,
    toggleKeyboardShortcuts,
    saveSessionState,
    loadSessionState,
    exportSessionData,
    clearSessionHistory,
    initializeStore
  };
});

export type StudyStore = ReturnType<typeof useStudyStore>;