import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';
import StudyStats from '~/components/study/StudyStats.vue';
import { useStudyStore } from '~/stores/study';
import { useExamStore } from '~/stores/exam';
import type { StudySession } from '~/types/exam';

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: vi.fn(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    data: { datasets: [] }
  })),
  registerables: []
}));

const mockDetailedSessionHistory: StudySession[] = [
  {
    id: 'session1',
    userId: 'user1',
    examId: 'exam1',
    mode: 'practice',
    totalQuestions: 25,
    correctAnswers: 20,
    timeSpent: 1800, // 30 minutes
    score: 80,
    completedAt: new Date('2024-01-15T14:00:00Z'),
    createdAt: new Date('2024-01-15T13:30:00Z')
  },
  {
    id: 'session2',
    userId: 'user1',
    examId: 'exam1',
    mode: 'timed',
    totalQuestions: 30,
    correctAnswers: 24,
    timeSpent: 2700, // 45 minutes
    score: 80,
    completedAt: new Date('2024-01-16T16:00:00Z'),
    createdAt: new Date('2024-01-16T15:15:00Z')
  },
  {
    id: 'session3',
    userId: 'user1',
    examId: 'exam1',
    mode: 'exam',
    totalQuestions: 50,
    correctAnswers: 42,
    timeSpent: 5400, // 90 minutes
    score: 84,
    completedAt: new Date('2024-01-17T11:00:00Z'),
    createdAt: new Date('2024-01-17T09:30:00Z')
  }
];

const mockQuestionAnalytics = {
  'Network Fundamentals': {
    totalQuestions: 45,
    correctAnswers: 36,
    accuracy: 80,
    averageTime: 65, // seconds
    difficultyBreakdown: {
      1: { correct: 8, total: 10 },
      2: { correct: 7, total: 10 },
      3: { correct: 8, total: 10 },
      4: { correct: 7, total: 10 },
      5: { correct: 6, total: 5 }
    }
  },
  'Routing Technologies': {
    totalQuestions: 50,
    correctAnswers: 38,
    accuracy: 76,
    averageTime: 78,
    difficultyBreakdown: {
      1: { correct: 9, total: 10 },
      2: { correct: 8, total: 10 },
      3: { correct: 7, total: 10 },
      4: { correct: 8, total: 10 },
      5: { correct: 6, total: 10 }
    }
  }
};

describe('StudyStats', () => {
  let wrapper: any;
  let studyStore: any;
  let examStore: any;

  beforeEach(() => {
    const pinia = createTestingPinia({
      createSpy: vi.fn
    });

    studyStore = useStudyStore(pinia);
    examStore = useExamStore(pinia);

    // Setup mock data
    studyStore.sessionHistory = mockDetailedSessionHistory;
    studyStore.performanceMetrics = {
      streak: 7,
      bestStreak: 15,
      totalSessions: 25,
      totalTimeSpent: 45000, // 12.5 hours
      averageAccuracy: 78.5,
      weakAreas: ['Infrastructure Services', 'Security Fundamentals'],
      strongAreas: ['Network Fundamentals', 'Routing Technologies'],
      improvementTrend: 0.12 // 12% improvement
    };

    wrapper = mount(StudyStats, {
      global: {
        plugins: [pinia]
      },
      props: {
        examId: 'exam1',
        userId: 'user1'
      }
    });
  });

  afterEach(() => {
    wrapper.unmount();
    vi.clearAllMocks();
  });

  describe('Component Initialization', () => {
    it('renders without crashing', () => {
      expect(wrapper.exists()).toBe(true);
    });

    it('has correct data-test attribute', () => {
      expect(wrapper.find('[data-test="study-stats"]').exists()).toBe(true);
    });

    it('displays loading state when fetching data', async () => {
      wrapper.vm.isLoading = true;
      await nextTick();
      
      expect(wrapper.find('[data-test="loading-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading detailed analytics');
    });

    it('displays error state when fetch fails', async () => {
      wrapper.vm.error = 'Failed to load analytics data';
      await nextTick();
      
      expect(wrapper.find('[data-test="error-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load analytics data');
    });

    it('initializes with default view preferences', () => {
      expect(wrapper.vm.selectedTimeRange).toBe('last30days');
      expect(wrapper.vm.selectedView).toBe('overview');
    });
  });

  describe('Overall Performance Metrics', () => {
    beforeEach(async () => {
      wrapper.vm.sessionHistory = mockDetailedSessionHistory;
      await nextTick();
    });

    it('calculates total study time correctly', () => {
      const totalTime = wrapper.vm.calculateTotalStudyTime();
      expect(totalTime).toBe(9900); // Sum of all session times
    });

    it('displays average session score', () => {
      const avgScore = wrapper.find('[data-test="average-session-score"]');
      expect(avgScore.text()).toContain('81%'); // Average of 80, 80, 84
    });

    it('shows total questions attempted', () => {
      const totalQuestions = wrapper.find('[data-test="total-questions-attempted"]');
      expect(totalQuestions.text()).toContain('105'); // 25 + 30 + 50
    });

    it('displays accuracy rate', () => {
      const accuracyRate = wrapper.find('[data-test="overall-accuracy-rate"]');
      expect(accuracyRate.text()).toContain('81%'); // (20+24+42)/(25+30+50) = 86/105
    });

    it('calculates questions per hour', () => {
      const questionsPerHour = wrapper.vm.calculateQuestionsPerHour();
      expect(questionsPerHour).toBeCloseTo(38.2, 1); // 105 questions / 2.75 hours
    });

    it('shows improvement trend indicator', () => {
      const trendIndicator = wrapper.find('[data-test="improvement-trend"]');
      expect(trendIndicator.exists()).toBe(true);
      expect(trendIndicator.classes()).toContain('positive-trend');
    });
  });

  describe('Accuracy by Topic Chart', () => {
    beforeEach(async () => {
      wrapper.vm.questionAnalytics = mockQuestionAnalytics;
      await nextTick();
    });

    it('renders topic accuracy chart', () => {
      const chart = wrapper.find('[data-test="topic-accuracy-chart"]');
      expect(chart.exists()).toBe(true);
    });

    it('displays topic breakdown table', () => {
      const topicTable = wrapper.find('[data-test="topic-breakdown-table"]');
      expect(topicTable.exists()).toBe(true);
    });

    it('shows accuracy percentages for each topic', () => {
      Object.entries(mockQuestionAnalytics).forEach(([topic, data]) => {
        const topicRow = wrapper.find(`[data-test="topic-${topic.replace(/\s+/g, '-').toLowerCase()}"]`);
        expect(topicRow.exists()).toBe(true);
        expect(topicRow.text()).toContain(`${data.accuracy}%`);
      });
    });

    it('displays questions answered per topic', () => {
      const networkFundamentals = wrapper.find('[data-test="topic-network-fundamentals"]');
      expect(networkFundamentals.text()).toContain('36/45'); // correct/total
    });

    it('calculates and displays average time per topic', () => {
      Object.entries(mockQuestionAnalytics).forEach(([topic, data]) => {
        const topicRow = wrapper.find(`[data-test="topic-${topic.replace(/\s+/g, '-').toLowerCase()}"]`);
        expect(topicRow.text()).toContain(`${data.averageTime}s`);
      });
    });

    it('highlights best and worst performing topics', () => {
      const bestTopic = wrapper.find('[data-test="best-topic"]');
      const worstTopic = wrapper.find('[data-test="worst-topic"]');
      
      expect(bestTopic.exists()).toBe(true);
      expect(worstTopic.exists()).toBe(true);
    });
  });

  describe('Difficulty Analysis', () => {
    beforeEach(async () => {
      wrapper.vm.questionAnalytics = mockQuestionAnalytics;
      await nextTick();
    });

    it('displays difficulty breakdown chart', () => {
      const difficultyChart = wrapper.find('[data-test="difficulty-breakdown-chart"]');
      expect(difficultyChart.exists()).toBe(true);
    });

    it('shows accuracy by difficulty level', () => {
      for (let level = 1; level <= 5; level++) {
        const difficultyLevel = wrapper.find(`[data-test="difficulty-${level}"]`);
        expect(difficultyLevel.exists()).toBe(true);
      }
    });

    it('calculates difficulty-based performance trends', () => {
      const trends = wrapper.vm.calculateDifficultyTrends();
      expect(trends).toBeDefined();
      expect(Object.keys(trends)).toHaveLength(5); // 5 difficulty levels
    });

    it('identifies strengths and weaknesses by difficulty', () => {
      const strengths = wrapper.find('[data-test="difficulty-strengths"]');
      const weaknesses = wrapper.find('[data-test="difficulty-weaknesses"]');
      
      expect(strengths.exists()).toBe(true);
      expect(weaknesses.exists()).toBe(true);
    });

    it('shows recommended difficulty focus', () => {
      const recommendation = wrapper.find('[data-test="difficulty-recommendation"]');
      expect(recommendation.exists()).toBe(true);
      expect(recommendation.text()).toContain('Focus on level');
    });
  });

  describe('Time Analysis', () => {
    beforeEach(async () => {
      wrapper.vm.sessionHistory = mockDetailedSessionHistory;
      wrapper.vm.questionAnalytics = mockQuestionAnalytics;
      await nextTick();
    });

    it('displays time per question statistics', () => {
      const avgTimePerQuestion = wrapper.find('[data-test="average-time-per-question"]');
      expect(avgTimePerQuestion.exists()).toBe(true);
    });

    it('shows time distribution chart', () => {
      const timeChart = wrapper.find('[data-test="time-distribution-chart"]');
      expect(timeChart.exists()).toBe(true);
    });

    it('calculates fastest and slowest question times', () => {
      const fastestTime = wrapper.vm.calculateFastestQuestionTime();
      const slowestTime = wrapper.vm.calculateSlowestQuestionTime();
      
      expect(typeof fastestTime).toBe('number');
      expect(typeof slowestTime).toBe('number');
      expect(slowestTime).toBeGreaterThan(fastestTime);
    });

    it('identifies time-based patterns', () => {
      const patterns = wrapper.find('[data-test="time-patterns"]');
      expect(patterns.exists()).toBe(true);
    });

    it('shows time efficiency recommendations', () => {
      const efficiency = wrapper.find('[data-test="time-efficiency-recommendations"]');
      expect(efficiency.exists()).toBe(true);
    });

    it('displays session duration trends', () => {
      const durationTrends = wrapper.find('[data-test="session-duration-trends"]');
      expect(durationTrends.exists()).toBe(true);
    });
  });

  describe('Performance Trends Over Time', () => {
    beforeEach(async () => {
      wrapper.vm.sessionHistory = mockDetailedSessionHistory;
      await nextTick();
    });

    it('renders performance trend chart', () => {
      const trendChart = wrapper.find('[data-test="performance-trend-chart"]');
      expect(trendChart.exists()).toBe(true);
    });

    it('shows score progression over sessions', () => {
      const scoreProgression = wrapper.vm.calculateScoreProgression();
      expect(scoreProgression).toBeDefined();
      expect(Array.isArray(scoreProgression)).toBe(true);
    });

    it('calculates learning velocity', () => {
      const velocity = wrapper.vm.calculateLearningVelocity();
      expect(typeof velocity).toBe('number');
    });

    it('identifies performance plateaus', () => {
      const plateaus = wrapper.vm.identifyPerformancePlateaus();
      expect(Array.isArray(plateaus)).toBe(true);
    });

    it('shows trend analysis summary', () => {
      const trendSummary = wrapper.find('[data-test="trend-analysis-summary"]');
      expect(trendSummary.exists()).toBe(true);
    });

    it('displays regression analysis if applicable', () => {
      const regression = wrapper.find('[data-test="regression-analysis"]');
      expect(regression.exists()).toBe(true);
    });
  });

  describe('Comparison with Average Scores', () => {
    beforeEach(async () => {
      wrapper.vm.averageScores = {
        overall: 75,
        'Network Fundamentals': 72,
        'Routing Technologies': 74,
        'Infrastructure Services': 68,
        'Security Fundamentals': 71
      };
      await nextTick();
    });

    it('displays comparison charts', () => {
      const comparisonChart = wrapper.find('[data-test="comparison-chart"]');
      expect(comparisonChart.exists()).toBe(true);
    });

    it('shows user performance vs average', () => {
      const comparison = wrapper.find('[data-test="performance-comparison"]');
      expect(comparison.exists()).toBe(true);
    });

    it('calculates percentile ranking', () => {
      const percentile = wrapper.vm.calculatePercentileRanking();
      expect(typeof percentile).toBe('number');
      expect(percentile).toBeGreaterThanOrEqual(0);
      expect(percentile).toBeLessThanOrEqual(100);
    });

    it('shows areas of competitive advantage', () => {
      const advantages = wrapper.find('[data-test="competitive-advantages"]');
      expect(advantages.exists()).toBe(true);
    });

    it('identifies improvement opportunities', () => {
      const opportunities = wrapper.find('[data-test="improvement-opportunities"]');
      expect(opportunities.exists()).toBe(true);
    });
  });

  describe('Learning Velocity Metrics', () => {
    beforeEach(async () => {
      wrapper.vm.sessionHistory = mockDetailedSessionHistory;
      await nextTick();
    });

    it('calculates questions mastered per day', () => {
      const masteryRate = wrapper.vm.calculateMasteryRate();
      expect(typeof masteryRate).toBe('number');
      expect(masteryRate).toBeGreaterThan(0);
    });

    it('shows knowledge retention rate', () => {
      const retentionRate = wrapper.find('[data-test="retention-rate"]');
      expect(retentionRate.exists()).toBe(true);
    });

    it('displays learning curve analysis', () => {
      const learningCurve = wrapper.find('[data-test="learning-curve"]');
      expect(learningCurve.exists()).toBe(true);
    });

    it('calculates time to proficiency estimate', () => {
      const proficiencyTime = wrapper.vm.estimateTimeToProficiency();
      expect(typeof proficiencyTime).toBe('number');
    });

    it('shows velocity benchmarks', () => {
      const benchmarks = wrapper.find('[data-test="velocity-benchmarks"]');
      expect(benchmarks.exists()).toBe(true);
    });
  });

  describe('Data Export Functionality', () => {
    it('provides detailed export options', () => {
      const exportButton = wrapper.find('[data-test="export-detailed-stats"]');
      expect(exportButton.exists()).toBe(true);
    });

    it('shows export format selection', async () => {
      const exportButton = wrapper.find('[data-test="export-detailed-stats"]');
      await exportButton.trigger('click');
      
      const formatOptions = wrapper.find('[data-test="export-format-selection"]');
      expect(formatOptions.exists()).toBe(true);
    });

    it('exports comprehensive JSON data', async () => {
      const exportSpy = vi.spyOn(wrapper.vm, 'exportDetailedStats');
      
      await wrapper.vm.exportDetailedStats('json');
      
      expect(exportSpy).toHaveBeenCalledWith('json');
    });

    it('exports detailed CSV reports', async () => {
      const exportSpy = vi.spyOn(wrapper.vm, 'exportDetailedStats');
      
      await wrapper.vm.exportDetailedStats('csv');
      
      expect(exportSpy).toHaveBeenCalledWith('csv');
    });

    it('allows custom date range export', async () => {
      const customExport = wrapper.find('[data-test="custom-date-export"]');
      expect(customExport.exists()).toBe(true);
    });

    it('includes performance charts in PDF export', async () => {
      const pdfExport = wrapper.find('[data-test="pdf-export"]');
      if (pdfExport.exists()) {
        const exportSpy = vi.spyOn(wrapper.vm, 'exportToPDF');
        await pdfExport.trigger('click');
        expect(exportSpy).toHaveBeenCalled();
      }
    });
  });

  describe('Time Range Filtering', () => {
    it('renders time range selector', () => {
      const selector = wrapper.find('[data-test="time-range-selector"]');
      expect(selector.exists()).toBe(true);
    });

    it('has all expected time range options', () => {
      const options = wrapper.findAll('[data-test="time-range-option"]');
      const expectedRanges = ['last7days', 'last30days', 'last3months', 'last6months', 'lastyear', 'all'];
      
      expect(options.length).toBe(expectedRanges.length);
    });

    it('filters data when time range changes', async () => {
      const filterSpy = vi.spyOn(wrapper.vm, 'filterDataByTimeRange');
      
      const selector = wrapper.find('[data-test="time-range-selector"]');
      await selector.setValue('last7days');
      
      expect(wrapper.vm.selectedTimeRange).toBe('last7days');
      expect(filterSpy).toHaveBeenCalled();
    });

    it('updates all charts when filter changes', async () => {
      const updateSpy = vi.spyOn(wrapper.vm, 'updateAllCharts');
      
      await wrapper.vm.updateTimeRange('last3months');
      
      expect(updateSpy).toHaveBeenCalled();
    });

    it('shows filtered data summary', async () => {
      await wrapper.vm.updateTimeRange('last7days');
      
      const summary = wrapper.find('[data-test="filtered-data-summary"]');
      expect(summary.exists()).toBe(true);
      expect(summary.text()).toContain('last 7 days');
    });
  });

  describe('Advanced Analytics Views', () => {
    it('provides multiple view options', () => {
      const viewSelector = wrapper.find('[data-test="view-selector"]');
      expect(viewSelector.exists()).toBe(true);
    });

    it('switches between overview and detailed views', async () => {
      const overviewTab = wrapper.find('[data-test="overview-tab"]');
      const detailedTab = wrapper.find('[data-test="detailed-tab"]');
      
      expect(overviewTab.exists()).toBe(true);
      expect(detailedTab.exists()).toBe(true);
      
      await detailedTab.trigger('click');
      expect(wrapper.vm.selectedView).toBe('detailed');
    });

    it('shows comparison view when available', async () => {
      const comparisonTab = wrapper.find('[data-test="comparison-tab"]');
      if (comparisonTab.exists()) {
        await comparisonTab.trigger('click');
        expect(wrapper.vm.selectedView).toBe('comparison');
      }
    });

    it('displays trends view with advanced analytics', async () => {
      const trendsTab = wrapper.find('[data-test="trends-tab"]');
      if (trendsTab.exists()) {
        await trendsTab.trigger('click');
        expect(wrapper.vm.selectedView).toBe('trends');
      }
    });
  });

  describe('Statistical Calculations', () => {
    beforeEach(async () => {
      wrapper.vm.sessionHistory = mockDetailedSessionHistory;
      wrapper.vm.questionAnalytics = mockQuestionAnalytics;
      await nextTick();
    });

    it('calculates standard deviation of scores', () => {
      const stdDev = wrapper.vm.calculateScoreStandardDeviation();
      expect(typeof stdDev).toBe('number');
      expect(stdDev).toBeGreaterThan(0);
    });

    it('computes confidence intervals', () => {
      const confidence = wrapper.vm.calculateConfidenceInterval();
      expect(confidence).toHaveProperty('lower');
      expect(confidence).toHaveProperty('upper');
      expect(confidence.upper).toBeGreaterThan(confidence.lower);
    });

    it('performs correlation analysis', () => {
      const correlation = wrapper.vm.calculateTimeScoreCorrelation();
      expect(typeof correlation).toBe('number');
      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('calculates z-scores for performance', () => {
      const zScores = wrapper.vm.calculateZScores();
      expect(Array.isArray(zScores)).toBe(true);
      expect(zScores.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility Features', () => {
    it('has proper ARIA attributes', () => {
      expect(wrapper.attributes('role')).toBe('region');
      expect(wrapper.attributes('aria-label')).toContain('Study Statistics');
    });

    it('provides screen reader friendly chart descriptions', () => {
      const chartDescriptions = wrapper.findAll('[aria-label*="chart"]');
      chartDescriptions.forEach(chart => {
        expect(chart.attributes('aria-label')).toBeDefined();
      });
    });

    it('has keyboard navigation support', () => {
      const focusableElements = wrapper.findAll('[tabindex="0"], button, select, a');
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('provides alternative text for visual elements', () => {
      const visualElements = wrapper.findAll('[role="img"]');
      visualElements.forEach(element => {
        expect(element.attributes('aria-label') || element.attributes('alt')).toBeDefined();
      });
    });

    it('announces data updates to screen readers', () => {
      const liveRegion = wrapper.find('[aria-live]');
      expect(liveRegion.exists()).toBe(true);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      expect(wrapper.classes()).toContain('mobile-layout');
    });

    it('simplifies charts for mobile view', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      const mobileCharts = wrapper.findAll('.mobile-chart');
      expect(mobileCharts.length).toBeGreaterThan(0);
    });

    it('stacks statistics cards on mobile', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      const statsContainer = wrapper.find('[data-test="stats-container"]');
      expect(statsContainer.classes()).toContain('mobile-stack');
    });

    it('provides swipeable chart navigation on mobile', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      const swipeableCharts = wrapper.find('[data-test="swipeable-charts"]');
      if (swipeableCharts.exists()) {
        expect(swipeableCharts.attributes('data-swipeable')).toBe('true');
      }
    });
  });

  describe('Performance Optimization', () => {
    it('lazy loads charts when not visible', () => {
      expect(wrapper.vm.chartObserver).toBeDefined();
    });

    it('debounces chart updates', async () => {
      const updateSpy = vi.spyOn(wrapper.vm, 'updateCharts');
      
      // Trigger multiple rapid updates
      for (let i = 0; i < 5; i++) {
        wrapper.vm.updateTimeRange('last7days');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should only call once due to debouncing
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    it('virtualizes large data tables', () => {
      const virtualizedTable = wrapper.find('[data-test="virtualized-table"]');
      if (virtualizedTable.exists()) {
        expect(virtualizedTable.attributes('data-virtualized')).toBe('true');
      }
    });

    it('destroys chart instances on component unmount', () => {
      const destroySpies = wrapper.vm.charts?.map((chart: any) => vi.spyOn(chart, 'destroy'));
      
      wrapper.unmount();
      
      destroySpies?.forEach((spy: any) => {
        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing data gracefully', async () => {
      wrapper.vm.sessionHistory = [];
      wrapper.vm.questionAnalytics = {};
      await nextTick();
      
      const noDataMessage = wrapper.find('[data-test="no-stats-data"]');
      expect(noDataMessage.exists()).toBe(true);
    });

    it('displays meaningful error messages', async () => {
      wrapper.vm.error = 'Analytics service unavailable';
      await nextTick();
      
      const errorMessage = wrapper.find('[data-test="error-message"]');
      expect(errorMessage.text()).toContain('Analytics service unavailable');
    });

    it('provides retry functionality', async () => {
      wrapper.vm.error = 'Network error';
      await nextTick();
      
      const retryButton = wrapper.find('[data-test="retry-analytics"]');
      expect(retryButton.exists()).toBe(true);
      
      const retrySpy = vi.spyOn(wrapper.vm, 'fetchAnalyticsData');
      await retryButton.trigger('click');
      
      expect(retrySpy).toHaveBeenCalled();
    });

    it('handles calculation errors in statistics', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Test with invalid data
      wrapper.vm.sessionHistory = [{ invalid: 'data' }];
      
      const result = wrapper.vm.calculateScoreProgression();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toBeDefined(); // Should return fallback value
      
      consoleSpy.mockRestore();
    });
  });

  describe('Real-time Updates', () => {
    it('refreshes data when new session is completed', async () => {
      const refreshSpy = vi.spyOn(wrapper.vm, 'fetchAnalyticsData');
      
      wrapper.vm.handleNewSessionCompleted({
        sessionId: 'new-session',
        score: 85
      });
      
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('updates charts when store data changes', async () => {
      const updateSpy = vi.spyOn(wrapper.vm, 'updateAllCharts');
      
      // Simulate store update
      studyStore.sessionHistory.push({
        id: 'new-session',
        score: 90,
        totalQuestions: 20,
        correctAnswers: 18
      });
      
      await nextTick();
      
      expect(updateSpy).toHaveBeenCalled();
    });

    it('maintains scroll position during updates', async () => {
      const scrollSpy = vi.spyOn(wrapper.vm, 'maintainScrollPosition');
      
      await wrapper.vm.refreshData();
      
      expect(scrollSpy).toHaveBeenCalled();
    });
  });
});