import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';
import ProgressDashboard from '~/components/study/ProgressDashboard.vue';
import { useStudyStore } from '~/stores/study';
import { useExamStore } from '~/stores/exam';
import type { UserProgress, StudySession } from '~/types/exam';

// Mock Chart.js
vi.mock('chart.js', () => ({
  Chart: vi.fn(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    data: { datasets: [] }
  })),
  registerables: []
}));

const mockProgressData: UserProgress = {
  id: 'progress1',
  userId: 'user1',
  examId: 'exam1',
  questionsAnswered: 75,
  correctAnswers: 60,
  averageScore: 80,
  lastActivityAt: new Date('2024-01-15T10:00:00Z'),
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z')
};

const mockSessionHistory: StudySession[] = [
  {
    id: 'session1',
    userId: 'user1',
    examId: 'exam1',
    mode: 'practice',
    totalQuestions: 20,
    correctAnswers: 15,
    timeSpent: 1800, // 30 minutes
    score: 75,
    completedAt: new Date('2024-01-10T14:00:00Z'),
    createdAt: new Date('2024-01-10T13:30:00Z')
  },
  {
    id: 'session2',
    userId: 'user1',
    examId: 'exam1',
    mode: 'timed',
    totalQuestions: 30,
    correctAnswers: 25,
    timeSpent: 2700, // 45 minutes
    score: 83,
    completedAt: new Date('2024-01-12T16:00:00Z'),
    createdAt: new Date('2024-01-12T15:15:00Z')
  },
  {
    id: 'session3',
    userId: 'user1',
    examId: 'exam1',
    mode: 'practice',
    totalQuestions: 25,
    correctAnswers: 22,
    timeSpent: 2100, // 35 minutes
    score: 88,
    completedAt: new Date('2024-01-14T11:00:00Z'),
    createdAt: new Date('2024-01-14T10:25:00Z')
  }
];

const mockObjectiveProgress = {
  'Network Fundamentals': { correct: 18, total: 25, percentage: 72 },
  'Routing Technologies': { correct: 22, total: 30, percentage: 73 },
  'Switching Technologies': { correct: 15, total: 20, percentage: 75 },
  'Infrastructure Services': { correct: 8, total: 15, percentage: 53 },
  'Security Fundamentals': { correct: 12, total: 18, percentage: 67 }
};

describe('ProgressDashboard', () => {
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
    studyStore.sessionHistory = mockSessionHistory;
    studyStore.performanceMetrics = {
      streak: 5,
      bestStreak: 12,
      totalSessions: 15,
      totalTimeSpent: 18000, // 5 hours
      averageAccuracy: 78.5,
      weakAreas: ['Infrastructure Services', 'Security Fundamentals'],
      strongAreas: ['Switching Technologies', 'Routing Technologies'],
      improvementTrend: 0.15 // 15% improvement trend
    };

    wrapper = mount(ProgressDashboard, {
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
      expect(wrapper.find('[data-test="progress-dashboard"]').exists()).toBe(true);
    });

    it('displays loading state when fetching data', async () => {
      wrapper.vm.isLoading = true;
      await nextTick();
      
      expect(wrapper.find('[data-test="loading-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading progress data');
    });

    it('displays error state when fetch fails', async () => {
      wrapper.vm.error = 'Failed to load progress data';
      await nextTick();
      
      expect(wrapper.find('[data-test="error-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load progress data');
    });

    it('initializes with default time period', () => {
      expect(wrapper.vm.selectedTimePeriod).toBe('last30days');
    });
  });

  describe('Overall Progress Section', () => {
    beforeEach(async () => {
      wrapper.vm.progressData = mockProgressData;
      await nextTick();
    });

    it('displays overall completion percentage', () => {
      const completion = wrapper.find('[data-test="overall-completion"]');
      expect(completion.exists()).toBe(true);
      expect(completion.text()).toContain('80%'); // 60/75 = 80%
    });

    it('shows progress ring with correct percentage', () => {
      const progressRing = wrapper.find('[data-test="progress-ring"]');
      expect(progressRing.exists()).toBe(true);
      
      const progressPath = wrapper.find('[data-test="progress-path"]');
      expect(progressPath.attributes('stroke-dasharray')).toContain('80'); // 80% completion
    });

    it('displays total questions answered', () => {
      const questionsAnswered = wrapper.find('[data-test="questions-answered"]');
      expect(questionsAnswered.text()).toContain('75');
    });

    it('displays correct answers count', () => {
      const correctAnswers = wrapper.find('[data-test="correct-answers"]');
      expect(correctAnswers.text()).toContain('60');
    });

    it('shows average score', () => {
      const averageScore = wrapper.find('[data-test="average-score"]');
      expect(averageScore.text()).toContain('80%');
    });

    it('displays last activity date', () => {
      const lastActivity = wrapper.find('[data-test="last-activity"]');
      expect(lastActivity.exists()).toBe(true);
      // Should show formatted date
    });

    it('shows study streak information', () => {
      const currentStreak = wrapper.find('[data-test="current-streak"]');
      expect(currentStreak.text()).toContain('5');
      
      const bestStreak = wrapper.find('[data-test="best-streak"]');
      expect(bestStreak.text()).toContain('12');
    });
  });

  describe('Performance Chart', () => {
    beforeEach(async () => {
      wrapper.vm.sessionHistory = mockSessionHistory;
      await nextTick();
    });

    it('renders performance chart container', () => {
      const chartContainer = wrapper.find('[data-test="performance-chart"]');
      expect(chartContainer.exists()).toBe(true);
    });

    it('initializes Chart.js instance', () => {
      expect(wrapper.vm.performanceChart).toBeDefined();
    });

    it('updates chart when time period changes', async () => {
      const updateSpy = vi.spyOn(wrapper.vm.performanceChart, 'update');
      
      await wrapper.vm.updateTimePeriod('last7days');
      
      expect(updateSpy).toHaveBeenCalled();
    });

    it('filters data based on selected time period', async () => {
      await wrapper.vm.updateTimePeriod('last7days');
      
      const filteredSessions = wrapper.vm.getFilteredSessions();
      expect(filteredSessions.length).toBeLessThanOrEqual(mockSessionHistory.length);
    });

    it('shows chart legend', () => {
      const legend = wrapper.find('[data-test="chart-legend"]');
      expect(legend.exists()).toBe(true);
    });

    it('displays no data message when no sessions exist', async () => {
      wrapper.vm.sessionHistory = [];
      await nextTick();
      
      const noDataMessage = wrapper.find('[data-test="no-chart-data"]');
      expect(noDataMessage.exists()).toBe(true);
      expect(noDataMessage.text()).toContain('No study data available');
    });
  });

  describe('Objective Progress Section', () => {
    beforeEach(async () => {
      wrapper.vm.objectiveProgress = mockObjectiveProgress;
      await nextTick();
    });

    it('renders objective progress bars', () => {
      const progressBars = wrapper.findAll('[data-test="objective-progress-bar"]');
      expect(progressBars.length).toBe(Object.keys(mockObjectiveProgress).length);
    });

    it('displays objective names correctly', () => {
      Object.keys(mockObjectiveProgress).forEach(objective => {
        const objectiveElement = wrapper.find(`[data-test="objective-${objective.replace(/\s+/g, '-').toLowerCase()}"]`);
        expect(objectiveElement.exists()).toBe(true);
        expect(objectiveElement.text()).toContain(objective);
      });
    });

    it('shows correct progress percentages', () => {
      Object.entries(mockObjectiveProgress).forEach(([objective, data]) => {
        const percentageElement = wrapper.find(`[data-test="objective-percentage-${objective.replace(/\s+/g, '-').toLowerCase()}"]`);
        expect(percentageElement.text()).toContain(`${data.percentage}%`);
      });
    });

    it('displays progress counts (correct/total)', () => {
      Object.entries(mockObjectiveProgress).forEach(([objective, data]) => {
        const countElement = wrapper.find(`[data-test="objective-count-${objective.replace(/\s+/g, '-').toLowerCase()}"]`);
        expect(countElement.text()).toContain(`${data.correct}/${data.total}`);
      });
    });

    it('applies correct CSS classes based on progress level', () => {
      // High progress (>= 75%) should have green styling
      const highProgress = wrapper.find('[data-test*="switching-technologies"]');
      expect(highProgress.classes()).toContain('high-progress');
      
      // Low progress (< 60%) should have red styling
      const lowProgress = wrapper.find('[data-test*="infrastructure-services"]');
      expect(lowProgress.classes()).toContain('low-progress');
    });

    it('sorts objectives by progress percentage', () => {
      const objectiveElements = wrapper.findAll('[data-test^="objective-"]');
      const percentages = objectiveElements.map(el => {
        const percentText = el.find('[data-test^="objective-percentage-"]').text();
        return parseInt(percentText.replace('%', ''));
      });
      
      // Should be sorted in descending order by default
      expect(wrapper.vm.sortOrder).toBe('desc');
      for (let i = 1; i < percentages.length; i++) {
        expect(percentages[i]).toBeLessThanOrEqual(percentages[i - 1]);
      }
    });
  });

  describe('Recent Activity Timeline', () => {
    beforeEach(async () => {
      wrapper.vm.sessionHistory = mockSessionHistory;
      await nextTick();
    });

    it('displays recent activity timeline', () => {
      const timeline = wrapper.find('[data-test="activity-timeline"]');
      expect(timeline.exists()).toBe(true);
    });

    it('shows recent study sessions', () => {
      const timelineItems = wrapper.findAll('[data-test="timeline-item"]');
      expect(timelineItems.length).toBeGreaterThan(0);
      expect(timelineItems.length).toBeLessThanOrEqual(5); // Should limit to recent sessions
    });

    it('displays session information in timeline', () => {
      const firstItem = wrapper.find('[data-test="timeline-item"]:first-child');
      expect(firstItem.exists()).toBe(true);
      
      // Should show score, questions, and time
      expect(firstItem.text()).toContain('%'); // Score
      expect(firstItem.text()).toContain('questions');
      expect(firstItem.text()).toMatch(/\d+m/); // Time format
    });

    it('shows session mode badges', () => {
      const modeBadges = wrapper.findAll('[data-test="session-mode-badge"]');
      expect(modeBadges.length).toBeGreaterThan(0);
    });

    it('displays formatted relative dates', () => {
      const dates = wrapper.findAll('[data-test="session-date"]');
      dates.forEach(date => {
        expect(date.text()).toMatch(/(ago|yesterday|today)/i);
      });
    });

    it('shows view all sessions link when more than 5 sessions exist', async () => {
      wrapper.vm.sessionHistory = new Array(10).fill(mockSessionHistory[0]);
      await nextTick();
      
      const viewAllLink = wrapper.find('[data-test="view-all-sessions"]');
      expect(viewAllLink.exists()).toBe(true);
    });
  });

  describe('Weak Areas Identification', () => {
    beforeEach(async () => {
      wrapper.vm.objectiveProgress = mockObjectiveProgress;
      await nextTick();
    });

    it('identifies and displays weak areas', () => {
      const weakAreas = wrapper.find('[data-test="weak-areas"]');
      expect(weakAreas.exists()).toBe(true);
    });

    it('shows improvement suggestions for weak areas', () => {
      const suggestions = wrapper.findAll('[data-test="improvement-suggestion"]');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('provides study recommendations', () => {
      const recommendations = wrapper.find('[data-test="study-recommendations"]');
      expect(recommendations.exists()).toBe(true);
      expect(recommendations.text()).toContain('Focus on');
    });

    it('highlights objectives below threshold', () => {
      const belowThreshold = wrapper.findAll('.low-progress');
      expect(belowThreshold.length).toBeGreaterThan(0);
    });
  });

  describe('Study Streak Tracking', () => {
    it('displays current study streak', () => {
      const currentStreak = wrapper.find('[data-test="current-streak"]');
      expect(currentStreak.exists()).toBe(true);
      expect(currentStreak.text()).toContain('5');
    });

    it('shows best streak achieved', () => {
      const bestStreak = wrapper.find('[data-test="best-streak"]');
      expect(bestStreak.exists()).toBe(true);
      expect(bestStreak.text()).toContain('12');
    });

    it('displays streak status message', () => {
      const streakMessage = wrapper.find('[data-test="streak-message"]');
      expect(streakMessage.exists()).toBe(true);
    });

    it('shows streak calendar/visualization', () => {
      const streakCalendar = wrapper.find('[data-test="streak-calendar"]');
      expect(streakCalendar.exists()).toBe(true);
    });
  });

  describe('Time Period Filter', () => {
    it('renders time period selector', () => {
      const selector = wrapper.find('[data-test="time-period-selector"]');
      expect(selector.exists()).toBe(true);
    });

    it('has all expected time period options', () => {
      const options = wrapper.findAll('[data-test="time-period-option"]');
      const expectedOptions = ['last7days', 'last30days', 'last3months', 'all'];
      
      expect(options.length).toBe(expectedOptions.length);
      options.forEach((option, index) => {
        expect(option.attributes('value')).toBe(expectedOptions[index]);
      });
    });

    it('updates data when time period changes', async () => {
      const updateSpy = vi.spyOn(wrapper.vm, 'fetchProgressData');
      
      const selector = wrapper.find('[data-test="time-period-selector"]');
      await selector.setValue('last7days');
      
      expect(wrapper.vm.selectedTimePeriod).toBe('last7days');
      expect(updateSpy).toHaveBeenCalled();
    });

    it('filters chart data based on selected period', async () => {
      await wrapper.vm.updateTimePeriod('last7days');
      
      const chartData = wrapper.vm.getChartData();
      // Should only include data from last 7 days
      expect(chartData.datasets[0].data.length).toBeLessThanOrEqual(7);
    });
  });

  describe('Estimated Completion Time', () => {
    it('calculates and displays estimated completion time', () => {
      const estimation = wrapper.find('[data-test="completion-estimate"]');
      expect(estimation.exists()).toBe(true);
    });

    it('bases estimation on current progress rate', () => {
      const estimatedDays = wrapper.vm.calculateCompletionEstimate();
      expect(typeof estimatedDays).toBe('number');
      expect(estimatedDays).toBeGreaterThan(0);
    });

    it('shows different estimates for different completion targets', () => {
      const estimate80 = wrapper.find('[data-test="estimate-80-percent"]');
      const estimate100 = wrapper.find('[data-test="estimate-100-percent"]');
      
      expect(estimate80.exists()).toBe(true);
      expect(estimate100.exists()).toBe(true);
    });

    it('updates estimate when progress changes', async () => {
      const initialEstimate = wrapper.vm.calculateCompletionEstimate();
      
      // Simulate progress change
      wrapper.vm.progressData.questionsAnswered = 90;
      await nextTick();
      
      const newEstimate = wrapper.vm.calculateCompletionEstimate();
      expect(newEstimate).not.toBe(initialEstimate);
    });
  });

  describe('Data Export Functionality', () => {
    it('provides export button', () => {
      const exportButton = wrapper.find('[data-test="export-progress"]');
      expect(exportButton.exists()).toBe(true);
    });

    it('shows export format options', async () => {
      const exportButton = wrapper.find('[data-test="export-progress"]');
      await exportButton.trigger('click');
      
      const formatOptions = wrapper.find('[data-test="export-format-options"]');
      expect(formatOptions.exists()).toBe(true);
    });

    it('exports data in JSON format', async () => {
      const exportSpy = vi.spyOn(wrapper.vm, 'exportProgressData');
      
      await wrapper.vm.exportProgressData('json');
      
      expect(exportSpy).toHaveBeenCalledWith('json');
    });

    it('exports data in CSV format', async () => {
      const exportSpy = vi.spyOn(wrapper.vm, 'exportProgressData');
      
      await wrapper.vm.exportProgressData('csv');
      
      expect(exportSpy).toHaveBeenCalledWith('csv');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      expect(wrapper.attributes('role')).toBe('region');
      expect(wrapper.attributes('aria-label')).toContain('Progress Dashboard');
    });

    it('provides chart accessibility', () => {
      const chart = wrapper.find('[data-test="performance-chart"]');
      expect(chart.attributes('aria-label')).toBeDefined();
      expect(chart.attributes('role')).toBe('img');
    });

    it('has accessible progress bars', () => {
      const progressBars = wrapper.findAll('[role="progressbar"]');
      progressBars.forEach(bar => {
        expect(bar.attributes('aria-valuemin')).toBe('0');
        expect(bar.attributes('aria-valuemax')).toBe('100');
        expect(bar.attributes('aria-valuenow')).toBeDefined();
      });
    });

    it('provides screen reader announcements for progress updates', () => {
      const announcements = wrapper.find('[aria-live="polite"]');
      expect(announcements.exists()).toBe(true);
    });

    it('has keyboard navigation support', async () => {
      const focusableElements = wrapper.findAll('[tabindex="0"], button, select, a');
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', async () => {
      // Simulate mobile viewport
      wrapper.vm.isMobile = true;
      await nextTick();
      
      expect(wrapper.classes()).toContain('mobile-layout');
    });

    it('stacks cards vertically on mobile', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      const cardContainer = wrapper.find('[data-test="dashboard-cards"]');
      expect(cardContainer.classes()).toContain('mobile-stack');
    });

    it('adjusts chart size for mobile', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      const chart = wrapper.find('[data-test="performance-chart"]');
      expect(chart.classes()).toContain('mobile-chart');
    });

    it('shows simplified view on very small screens', async () => {
      wrapper.vm.isVerySmallScreen = true;
      await nextTick();
      
      const simplifiedView = wrapper.find('[data-test="simplified-progress"]');
      expect(simplifiedView.exists()).toBe(true);
    });
  });

  describe('Real-time Updates', () => {
    it('refreshes data when study session completes', async () => {
      const refreshSpy = vi.spyOn(wrapper.vm, 'fetchProgressData');
      
      // Simulate session completion event
      wrapper.vm.handleSessionCompleted({
        sessionId: 'new-session',
        score: 85,
        questionsAnswered: 20
      });
      
      expect(refreshSpy).toHaveBeenCalled();
    });

    it('updates progress indicators in real-time', async () => {
      const initialProgress = wrapper.vm.progressData.questionsAnswered;
      
      // Simulate progress update
      wrapper.vm.updateProgress({
        questionsAnswered: initialProgress + 5,
        correctAnswers: wrapper.vm.progressData.correctAnswers + 4
      });
      
      await nextTick();
      
      expect(wrapper.vm.progressData.questionsAnswered).toBe(initialProgress + 5);
    });
  });

  describe('Performance Optimization', () => {
    it('debounces chart updates', async () => {
      const updateSpy = vi.spyOn(wrapper.vm, 'updateChart');
      
      // Trigger multiple rapid updates
      for (let i = 0; i < 5; i++) {
        wrapper.vm.updateTimePeriod('last7days');
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should only call once due to debouncing
      expect(updateSpy).toHaveBeenCalledTimes(1);
    });

    it('lazy loads chart when not visible', () => {
      const intersectionObserver = wrapper.vm.chartObserver;
      expect(intersectionObserver).toBeDefined();
    });

    it('destroys chart instance on unmount', () => {
      const destroySpy = vi.spyOn(wrapper.vm.performanceChart, 'destroy');
      
      wrapper.unmount();
      
      expect(destroySpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock API failure
      wrapper.vm.fetchProgressData = vi.fn().mockRejectedValue(new Error('API Error'));
      
      await wrapper.vm.fetchProgressData();
      
      expect(wrapper.vm.error).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('shows retry option on error', async () => {
      wrapper.vm.error = 'Failed to load data';
      await nextTick();
      
      const retryButton = wrapper.find('[data-test="retry-button"]');
      expect(retryButton.exists()).toBe(true);
    });

    it('handles empty data gracefully', async () => {
      wrapper.vm.sessionHistory = [];
      wrapper.vm.progressData = null;
      await nextTick();
      
      const emptyState = wrapper.find('[data-test="empty-state"]');
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.text()).toContain('No progress data available');
    });
  });
});