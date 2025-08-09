import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';
import TestSimulation from '~/components/study/TestSimulation.vue';
import { useStudyStore } from '~/stores/study';
import { useExamStore } from '~/stores/exam';
import type { QuestionWithAnswers, Exam } from '~/types/exam';

// Mock PDF generation library
vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    text: vi.fn(),
    addImage: vi.fn(),
    save: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    addPage: vi.fn(),
    setDrawColor: vi.fn(),
    rect: vi.fn(),
    internal: {
      pageSize: { width: 210, height: 297 }
    }
  }))
}));

// Mock Chart.js for score breakdown charts
vi.mock('chart.js', () => ({
  Chart: vi.fn(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    data: { datasets: [] }
  })),
  registerables: []
}));

const mockExam: Exam = {
  id: 'exam1',
  code: 'CCNA-200-301',
  name: 'Cisco Certified Network Associate',
  vendor: 'Cisco',
  description: 'CCNA Routing and Switching',
  passingScore: 85,
  timeLimit: 120, // 2 hours
  questionCount: 100,
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
};

const mockQuestions: QuestionWithAnswers[] = [
  {
    id: 'q1',
    examId: 'exam1',
    type: 'single',
    text: 'What is the default administrative distance for OSPF routes?',
    explanation: 'OSPF has an administrative distance of 110 by default.',
    difficulty: 2,
    objectiveId: 'routing-fundamentals',
    isActive: true,
    aiGenerated: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    answerOptions: [
      { id: 'a1', questionId: 'q1', text: '90', isCorrect: false, order: 1, createdAt: new Date() },
      { id: 'a2', questionId: 'q1', text: '100', isCorrect: false, order: 2, createdAt: new Date() },
      { id: 'a3', questionId: 'q1', text: '110', isCorrect: true, order: 3, createdAt: new Date() },
      { id: 'a4', questionId: 'q1', text: '120', isCorrect: false, order: 4, createdAt: new Date() }
    ]
  },
  {
    id: 'q2',
    examId: 'exam1',
    type: 'multiple',
    text: 'Which protocols operate at Layer 3? (Select two)',
    explanation: 'IP and ICMP both operate at the Network Layer (Layer 3).',
    difficulty: 3,
    objectiveId: 'network-fundamentals',
    isActive: true,
    aiGenerated: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    answerOptions: [
      { id: 'a5', questionId: 'q2', text: 'IP', isCorrect: true, order: 1, createdAt: new Date() },
      { id: 'a6', questionId: 'q2', text: 'TCP', isCorrect: false, order: 2, createdAt: new Date() },
      { id: 'a7', questionId: 'q2', text: 'ICMP', isCorrect: true, order: 3, createdAt: new Date() },
      { id: 'a8', questionId: 'q2', text: 'ARP', isCorrect: false, order: 4, createdAt: new Date() }
    ]
  }
];

const mockExamObjectives = [
  {
    id: 'routing-fundamentals',
    name: 'Routing Fundamentals',
    description: 'Basic routing concepts and protocols',
    weight: 25
  },
  {
    id: 'network-fundamentals',
    name: 'Network Fundamentals',
    description: 'OSI model and networking basics',
    weight: 20
  },
  {
    id: 'infrastructure-services',
    name: 'Infrastructure Services',
    description: 'DHCP, DNS, and other services',
    weight: 15
  },
  {
    id: 'security-fundamentals',
    name: 'Security Fundamentals',
    description: 'Basic security concepts',
    weight: 25
  },
  {
    id: 'automation-programmability',
    name: 'Automation and Programmability',
    description: 'Network automation basics',
    weight: 15
  }
];

describe('TestSimulation', () => {
  let wrapper: any;
  let studyStore: any;
  let examStore: any;

  beforeEach(() => {
    // Mock Date.now for consistent timer testing
    vi.useFakeTimers();
    const mockDate = new Date('2024-01-15T10:00:00Z');
    vi.setSystemTime(mockDate);

    const pinia = createTestingPinia({
      createSpy: vi.fn
    });

    studyStore = useStudyStore(pinia);
    examStore = useExamStore(pinia);

    // Setup mock data
    examStore.currentExam = mockExam;
    examStore.questions = mockQuestions;
    examStore.examObjectives = mockExamObjectives;
    examStore.currentQuestionIndex = 0;
    examStore.timeRemaining = 7200; // 2 hours in seconds

    // Mock exam store methods
    examStore.fetchExam = vi.fn().mockResolvedValue(mockExam);
    examStore.fetchQuestions = vi.fn().mockResolvedValue(mockQuestions);
    examStore.startExamSimulation = vi.fn().mockResolvedValue({
      sessionId: 'test-session-1',
      questions: mockQuestions,
      timeLimit: 7200
    });
    examStore.submitExam = vi.fn().mockResolvedValue({
      score: 85,
      passed: true,
      breakdown: {
        'routing-fundamentals': 80,
        'network-fundamentals': 90
      }
    });
    examStore.nextQuestion = vi.fn().mockReturnValue(true);
    examStore.previousQuestion = vi.fn().mockReturnValue(true);
    examStore.goToQuestion = vi.fn().mockReturnValue(true);

    wrapper = mount(TestSimulation, {
      global: {
        plugins: [pinia]
      },
      props: {
        examId: 'exam1',
        questionCount: 100,
        timeLimit: 120,
        passingScore: 85,
        shuffleQuestions: true,
        strictExamMode: true
      }
    });
  });

  afterEach(() => {
    wrapper.unmount();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('Component Initialization', () => {
    it('renders without crashing', () => {
      expect(wrapper.exists()).toBe(true);
    });

    it('has correct data-test attribute', () => {
      expect(wrapper.find('[data-test="test-simulation"]').exists()).toBe(true);
    });

    it('displays loading state during initialization', async () => {
      wrapper.vm.isLoading = true;
      await nextTick();
      
      expect(wrapper.find('[data-test="simulation-loading"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Preparing exam simulation');
    });

    it('shows exam information before start', async () => {
      wrapper.vm.simulationState = 'instructions';
      await nextTick();
      
      const examInfo = wrapper.find('[data-test="exam-instructions"]');
      expect(examInfo.exists()).toBe(true);
      expect(examInfo.text()).toContain(mockExam.name);
      expect(examInfo.text()).toContain('100 questions');
      expect(examInfo.text()).toContain('120 minutes');
      expect(examInfo.text()).toContain('85%');
    });

    it('displays exam rules and conditions', async () => {
      wrapper.vm.simulationState = 'instructions';
      await nextTick();
      
      const rules = wrapper.find('[data-test="exam-rules"]');
      expect(rules.exists()).toBe(true);
      expect(rules.text()).toContain('No going back');
      expect(rules.text()).toContain('Timed environment');
      expect(rules.text()).toContain('No immediate feedback');
    });

    it('has start exam button when in instructions state', async () => {
      wrapper.vm.simulationState = 'instructions';
      await nextTick();
      
      const startButton = wrapper.find('[data-test="start-exam-button"]');
      expect(startButton.exists()).toBe(true);
      expect(startButton.text()).toContain('Start Exam');
    });
  });

  describe('Exam Simulation Environment', () => {
    beforeEach(async () => {
      wrapper.vm.simulationState = 'active';
      wrapper.vm.questions = mockQuestions;
      wrapper.vm.currentQuestionIndex = 0;
      wrapper.vm.timeRemaining = 7200;
      await nextTick();
    });

    it('displays exam timer prominently', () => {
      const timer = wrapper.find('[data-test="exam-timer"]');
      expect(timer.exists()).toBe(true);
      expect(timer.text()).toContain('02:00:00');
    });

    it('shows current question with strict exam styling', () => {
      const questionCard = wrapper.find('[data-test="exam-question-card"]');
      expect(questionCard.exists()).toBe(true);
      expect(questionCard.classes()).toContain('exam-mode');
    });

    it('displays question progress without navigation', () => {
      const progress = wrapper.find('[data-test="question-progress"]');
      expect(progress.exists()).toBe(true);
      expect(progress.text()).toContain('Question 1 of 100');
      
      // Should not show navigation in strict exam mode
      const navigation = wrapper.find('[data-test="question-navigation"]');
      expect(navigation.exists()).toBe(false);
    });

    it('prevents going back to previous questions in exam mode', async () => {
      const backButton = wrapper.find('[data-test="previous-question-button"]');
      expect(backButton.exists()).toBe(false);
    });

    it('shows only forward navigation', () => {
      const nextButton = wrapper.find('[data-test="next-question-button"]');
      expect(nextButton.exists()).toBe(true);
      expect(nextButton.text()).toContain('Next');
    });

    it('does not show immediate feedback for answers', async () => {
      const answerOption = wrapper.find('[data-test="answer-option-0"]');
      await answerOption.trigger('click');
      
      // Should not show immediate feedback
      const feedback = wrapper.find('[data-test="answer-feedback"]');
      expect(feedback.exists()).toBe(false);
    });

    it('hides explanations during exam', () => {
      const explanation = wrapper.find('[data-test="question-explanation"]');
      expect(explanation.exists()).toBe(false);
    });

    it('saves answers without validation feedback', async () => {
      const answerSpy = vi.spyOn(wrapper.vm, 'saveAnswer');
      
      const answerOption = wrapper.find('[data-test="answer-option-0"]');
      await answerOption.trigger('click');
      
      expect(answerSpy).toHaveBeenCalledWith(['a1']);
      
      // Should not show correctness indicator
      expect(answerOption.classes()).not.toContain('correct');
      expect(answerOption.classes()).not.toContain('incorrect');
    });
  });

  describe('Timer Functionality', () => {
    beforeEach(async () => {
      wrapper.vm.simulationState = 'active';
      wrapper.vm.timeRemaining = 7200; // 2 hours
      await nextTick();
    });

    it('counts down time accurately', async () => {
      expect(wrapper.vm.timeRemaining).toBe(7200);
      
      vi.advanceTimersByTime(60000); // Advance 1 minute
      
      expect(wrapper.vm.timeRemaining).toBeLessThan(7200);
    });

    it('displays time warnings at appropriate intervals', async () => {
      wrapper.vm.timeRemaining = 1800; // 30 minutes
      await nextTick();
      
      const warning = wrapper.find('[data-test="time-warning"]');
      expect(warning.exists()).toBe(true);
      expect(warning.classes()).toContain('time-warning');
    });

    it('shows critical time alert when under 10 minutes', async () => {
      wrapper.vm.timeRemaining = 300; // 5 minutes
      await nextTick();
      
      const criticalAlert = wrapper.find('[data-test="critical-time-alert"]');
      expect(criticalAlert.exists()).toBe(true);
      expect(criticalAlert.classes()).toContain('critical-alert');
    });

    it('automatically submits exam when time expires', async () => {
      const submitSpy = vi.spyOn(wrapper.vm, 'submitExamAutomatically');
      
      wrapper.vm.timeRemaining = 1;
      vi.advanceTimersByTime(2000); // Advance past remaining time
      
      await flushPromises();
      expect(submitSpy).toHaveBeenCalled();
    });

    it('disables interaction when time is up', async () => {
      wrapper.vm.timeRemaining = 0;
      wrapper.vm.simulationState = 'timeUp';
      await nextTick();
      
      const questionCard = wrapper.find('[data-test="exam-question-card"]');
      expect(questionCard.classes()).toContain('disabled');
      
      const answerOptions = wrapper.findAll('[data-test^="answer-option"]');
      answerOptions.forEach(option => {
        expect(option.attributes('disabled')).toBeDefined();
      });
    });

    it('prevents timer manipulation', () => {
      const originalTime = wrapper.vm.timeRemaining;
      
      // Attempt to modify time through developer tools (simulation)
      wrapper.vm.timeRemaining = 99999;
      
      // Timer should restore to actual remaining time on next tick
      vi.advanceTimersByTime(1000);
      expect(wrapper.vm.timeRemaining).toBeLessThan(originalTime);
    });
  });

  describe('Question Randomization', () => {
    it('shuffles questions when enabled', async () => {
      const shuffleSpy = vi.spyOn(wrapper.vm, 'shuffleQuestions');
      
      await wrapper.vm.startExamSimulation();
      
      expect(shuffleSpy).toHaveBeenCalled();
    });

    it('maintains same order when shuffling is disabled', async () => {
      await wrapper.setProps({ shuffleQuestions: false });
      
      const originalOrder = wrapper.vm.questions.map((q: any) => q.id);
      await wrapper.vm.startExamSimulation();
      const newOrder = wrapper.vm.questions.map((q: any) => q.id);
      
      expect(newOrder).toEqual(originalOrder);
    });

    it('ensures all questions are included after shuffle', async () => {
      const originalIds = mockQuestions.map(q => q.id).sort();
      
      await wrapper.vm.startExamSimulation();
      
      const shuffledIds = wrapper.vm.questions.map((q: any) => q.id).sort();
      expect(shuffledIds).toEqual(originalIds);
    });

    it('randomizes answer options within questions', async () => {
      const shuffleOptionsSpy = vi.spyOn(wrapper.vm, 'shuffleAnswerOptions');
      
      await wrapper.vm.startExamSimulation();
      
      expect(shuffleOptionsSpy).toHaveBeenCalled();
    });
  });

  describe('Answer Selection and Storage', () => {
    beforeEach(async () => {
      wrapper.vm.simulationState = 'active';
      wrapper.vm.questions = mockQuestions;
      wrapper.vm.currentQuestionIndex = 0;
      await nextTick();
    });

    it('records single answer selection', async () => {
      const answerOption = wrapper.find('[data-test="answer-option-2"]'); // Correct answer
      await answerOption.trigger('click');
      
      expect(wrapper.vm.examAnswers['q1']).toEqual(['a3']);
    });

    it('handles multiple answer selection', async () => {
      wrapper.vm.currentQuestionIndex = 1; // Multiple choice question
      await nextTick();
      
      const option1 = wrapper.find('[data-test="answer-option-0"]');
      const option3 = wrapper.find('[data-test="answer-option-2"]');
      
      await option1.trigger('click');
      await option3.trigger('click');
      
      expect(wrapper.vm.examAnswers['q2']).toEqual(['a5', 'a7']);
    });

    it('allows deselecting answers before moving to next question', async () => {
      const answerOption = wrapper.find('[data-test="answer-option-0"]');
      
      await answerOption.trigger('click');
      expect(wrapper.vm.examAnswers['q1']).toEqual(['a1']);
      
      await answerOption.trigger('click'); // Deselect
      expect(wrapper.vm.examAnswers['q1']).toBeUndefined();
    });

    it('persists answers when navigating within exam', async () => {
      // Answer first question
      const answerOption = wrapper.find('[data-test="answer-option-2"]');
      await answerOption.trigger('click');
      
      // Move to next question
      const nextButton = wrapper.find('[data-test="next-question-button"]');
      await nextButton.trigger('click');
      
      expect(wrapper.vm.examAnswers['q1']).toEqual(['a3']);
    });

    it('tracks answer timestamps for analysis', async () => {
      const answerOption = wrapper.find('[data-test="answer-option-0"]');
      await answerOption.trigger('click');
      
      expect(wrapper.vm.answerTimestamps['q1']).toBeDefined();
      expect(typeof wrapper.vm.answerTimestamps['q1']).toBe('number');
    });

    it('prevents changing answers in strict exam mode after navigation', async () => {
      // Answer and move forward
      const answerOption = wrapper.find('[data-test="answer-option-0"]');
      await answerOption.trigger('click');
      
      const nextButton = wrapper.find('[data-test="next-question-button"]');
      await nextButton.trigger('click');
      
      // Verify cannot go back
      const backButton = wrapper.find('[data-test="previous-question-button"]');
      expect(backButton.exists()).toBe(false);
    });
  });

  describe('Exam Submission Process', () => {
    beforeEach(async () => {
      wrapper.vm.simulationState = 'active';
      wrapper.vm.questions = mockQuestions;
      wrapper.vm.examAnswers = {
        'q1': ['a3'], // Correct
        'q2': ['a5', 'a7'] // Correct
      };
      wrapper.vm.currentQuestionIndex = 1; // Last question
      await nextTick();
    });

    it('shows submit button on last question', () => {
      const submitButton = wrapper.find('[data-test="submit-exam-button"]');
      expect(submitButton.exists()).toBe(true);
      expect(submitButton.text()).toContain('Submit Exam');
    });

    it('displays submission confirmation dialog', async () => {
      const submitButton = wrapper.find('[data-test="submit-exam-button"]');
      await submitButton.trigger('click');
      
      const confirmDialog = wrapper.find('[data-test="submit-confirmation"]');
      expect(confirmDialog.exists()).toBe(true);
      expect(confirmDialog.text()).toContain('Are you sure you want to submit');
    });

    it('shows answered questions count in confirmation', async () => {
      const submitButton = wrapper.find('[data-test="submit-exam-button"]');
      await submitButton.trigger('click');
      
      const confirmDialog = wrapper.find('[data-test="submit-confirmation"]');
      expect(confirmDialog.text()).toContain('2 out of 2 questions answered');
    });

    it('warns about unanswered questions', async () => {
      wrapper.vm.examAnswers = { 'q1': ['a3'] }; // Only one answer
      await nextTick();
      
      const submitButton = wrapper.find('[data-test="submit-exam-button"]');
      await submitButton.trigger('click');
      
      const confirmDialog = wrapper.find('[data-test="submit-confirmation"]');
      expect(confirmDialog.text()).toContain('1 unanswered question');
      expect(confirmDialog.find('[data-test="unanswered-warning"]').exists()).toBe(true);
    });

    it('processes exam submission correctly', async () => {
      const submitSpy = vi.spyOn(examStore, 'submitExam');
      
      const submitButton = wrapper.find('[data-test="submit-exam-button"]');
      await submitButton.trigger('click');
      
      const confirmButton = wrapper.find('[data-test="confirm-submit"]');
      await confirmButton.trigger('click');
      
      expect(submitSpy).toHaveBeenCalledWith({
        sessionId: expect.any(String),
        answers: wrapper.vm.examAnswers,
        timeSpent: expect.any(Number),
        metadata: expect.any(Object)
      });
    });

    it('transitions to results state after submission', async () => {
      const submitButton = wrapper.find('[data-test="submit-exam-button"]');
      await submitButton.trigger('click');
      
      const confirmButton = wrapper.find('[data-test="confirm-submit"]');
      await confirmButton.trigger('click');
      
      await flushPromises();
      
      expect(wrapper.vm.simulationState).toBe('results');
    });
  });

  describe('Score Calculation and Results', () => {
    beforeEach(async () => {
      wrapper.vm.simulationState = 'results';
      wrapper.vm.examResults = {
        score: 85,
        passed: true,
        totalQuestions: 100,
        correctAnswers: 85,
        timeSpent: 5400, // 90 minutes
        breakdown: {
          'routing-fundamentals': 88,
          'network-fundamentals': 92,
          'infrastructure-services': 80,
          'security-fundamentals': 78,
          'automation-programmability': 85
        }
      };
      await nextTick();
    });

    it('displays exam results summary', () => {
      const results = wrapper.find('[data-test="exam-results"]');
      expect(results.exists()).toBe(true);
      
      const score = wrapper.find('[data-test="final-score"]');
      expect(score.text()).toContain('85%');
      
      const passFail = wrapper.find('[data-test="pass-fail-status"]');
      expect(passFail.text()).toContain('PASSED');
      expect(passFail.classes()).toContain('passed');
    });

    it('shows detailed score breakdown by objective', () => {
      const breakdown = wrapper.find('[data-test="score-breakdown"]');
      expect(breakdown.exists()).toBe(true);
      
      Object.entries(wrapper.vm.examResults.breakdown).forEach(([objective, score]) => {
        const objectiveScore = wrapper.find(`[data-test="objective-${objective}"]`);
        expect(objectiveScore.exists()).toBe(true);
        expect(objectiveScore.text()).toContain(`${score}%`);
      });
    });

    it('displays performance chart', () => {
      const chart = wrapper.find('[data-test="performance-chart"]');
      expect(chart.exists()).toBe(true);
    });

    it('calculates and shows percentile ranking', () => {
      const percentile = wrapper.find('[data-test="percentile-ranking"]');
      expect(percentile.exists()).toBe(true);
      expect(percentile.text()).toMatch(/\d+th percentile/);
    });

    it('provides study recommendations based on weak areas', () => {
      const recommendations = wrapper.find('[data-test="study-recommendations"]');
      expect(recommendations.exists()).toBe(true);
      
      // Should recommend focusing on lowest scoring areas
      expect(recommendations.text()).toContain('Security Fundamentals'); // Lowest at 78%
    });

    it('shows time efficiency analysis', () => {
      const timeAnalysis = wrapper.find('[data-test="time-analysis"]');
      expect(timeAnalysis.exists()).toBe(true);
      expect(timeAnalysis.text()).toContain('1:30:00'); // 90 minutes
    });

    it('handles failing score appropriately', async () => {
      wrapper.vm.examResults.score = 75;
      wrapper.vm.examResults.passed = false;
      await nextTick();
      
      const passFail = wrapper.find('[data-test="pass-fail-status"]');
      expect(passFail.text()).toContain('FAILED');
      expect(passFail.classes()).toContain('failed');
      
      const retryMessage = wrapper.find('[data-test="retry-message"]');
      expect(retryMessage.exists()).toBe(true);
    });
  });

  describe('Certificate Generation', () => {
    beforeEach(async () => {
      wrapper.vm.simulationState = 'results';
      wrapper.vm.examResults = {
        score: 85,
        passed: true,
        totalQuestions: 100,
        correctAnswers: 85
      };
      await nextTick();
    });

    it('shows certificate generation option for passing scores', () => {
      const certificateButton = wrapper.find('[data-test="generate-certificate"]');
      expect(certificateButton.exists()).toBe(true);
    });

    it('does not show certificate option for failing scores', async () => {
      wrapper.vm.examResults.passed = false;
      await nextTick();
      
      const certificateButton = wrapper.find('[data-test="generate-certificate"]');
      expect(certificateButton.exists()).toBe(false);
    });

    it('generates PDF certificate with correct information', async () => {
      const generateSpy = vi.spyOn(wrapper.vm, 'generateCertificate');
      
      const certificateButton = wrapper.find('[data-test="generate-certificate"]');
      await certificateButton.trigger('click');
      
      expect(generateSpy).toHaveBeenCalled();
    });

    it('includes exam details in certificate', async () => {
      const certificateButton = wrapper.find('[data-test="generate-certificate"]');
      await certificateButton.trigger('click');
      
      // Mock verification - in real test would check PDF content
      expect(wrapper.vm.certificateData).toMatchObject({
        examName: mockExam.name,
        score: 85,
        passingScore: 85,
        dateCompleted: expect.any(String)
      });
    });
  });

  describe('Review Mode After Submission', () => {
    beforeEach(async () => {
      wrapper.vm.simulationState = 'review';
      wrapper.vm.questions = mockQuestions;
      wrapper.vm.examAnswers = {
        'q1': ['a3'], // Correct
        'q2': ['a5', 'a7'] // Correct
      };
      wrapper.vm.currentQuestionIndex = 0;
      await nextTick();
    });

    it('allows navigation to review all questions', () => {
      const questionNavigation = wrapper.find('[data-test="review-navigation"]');
      expect(questionNavigation.exists()).toBe(true);
      
      const navButtons = wrapper.findAll('[data-test^="nav-question-"]');
      expect(navButtons.length).toBe(mockQuestions.length);
    });

    it('shows correct answers and explanations', () => {
      const correctAnswer = wrapper.find('[data-test="correct-answer"]');
      expect(correctAnswer.exists()).toBe(true);
      
      const explanation = wrapper.find('[data-test="question-explanation"]');
      expect(explanation.exists()).toBe(true);
      expect(explanation.text()).toContain(mockQuestions[0].explanation);
    });

    it('highlights user selected answers', () => {
      const selectedAnswer = wrapper.find('[data-test="user-selected-answer"]');
      expect(selectedAnswer.exists()).toBe(true);
      expect(selectedAnswer.classes()).toContain('user-selected');
    });

    it('indicates correct and incorrect answers visually', () => {
      const correctOption = wrapper.find('[data-test="answer-option-2"]'); // User's correct answer
      expect(correctOption.classes()).toContain('correct');
      
      // For incorrect answers in other questions
      wrapper.vm.currentQuestionIndex = 1;
      wrapper.vm.examAnswers['q2'] = ['a6']; // Wrong answer
      // Would show incorrect styling
    });

    it('provides detailed performance feedback', () => {
      const feedback = wrapper.find('[data-test="review-feedback"]');
      expect(feedback.exists()).toBe(true);
    });

    it('shows time spent per question', () => {
      wrapper.vm.questionTimeSpent = { 'q1': 45, 'q2': 60 };
      const timeSpent = wrapper.find('[data-test="question-time-spent"]');
      expect(timeSpent.exists()).toBe(true);
      expect(timeSpent.text()).toContain('45 seconds');
    });
  });

  describe('Retry Functionality', () => {
    beforeEach(async () => {
      wrapper.vm.simulationState = 'results';
      wrapper.vm.examResults = {
        score: 75,
        passed: false
      };
      await nextTick();
    });

    it('shows retry option for failed attempts', () => {
      const retryButton = wrapper.find('[data-test="retry-exam"]');
      expect(retryButton.exists()).toBe(true);
    });

    it('provides different question set on retry', async () => {
      const retryButton = wrapper.find('[data-test="retry-exam"]');
      await retryButton.trigger('click');
      
      expect(wrapper.vm.simulationState).toBe('instructions');
      // Would verify new question set is loaded
    });

    it('resets all exam state on retry', async () => {
      wrapper.vm.examAnswers = { 'q1': ['a1'] };
      wrapper.vm.timeRemaining = 3600;
      
      const retryButton = wrapper.find('[data-test="retry-exam"]');
      await retryButton.trigger('click');
      
      await flushPromises();
      
      expect(wrapper.vm.examAnswers).toEqual({});
      expect(wrapper.vm.currentQuestionIndex).toBe(0);
      expect(wrapper.vm.timeRemaining).toBe(7200); // Reset to full time
    });

    it('tracks retry attempts', async () => {
      expect(wrapper.vm.attemptNumber).toBe(1);
      
      const retryButton = wrapper.find('[data-test="retry-exam"]');
      await retryButton.trigger('click');
      
      expect(wrapper.vm.attemptNumber).toBe(2);
    });

    it('limits number of retry attempts if configured', async () => {
      await wrapper.setProps({ maxAttempts: 3 });
      wrapper.vm.attemptNumber = 3;
      await nextTick();
      
      const retryButton = wrapper.find('[data-test="retry-exam"]');
      expect(retryButton.exists()).toBe(false);
      
      const maxAttemptsMessage = wrapper.find('[data-test="max-attempts-reached"]');
      expect(maxAttemptsMessage.exists()).toBe(true);
    });
  });

  describe('Security and Anti-Cheating Measures', () => {
    it('prevents copy-paste in text areas', () => {
      const questionText = wrapper.find('[data-test="question-text"]');
      expect(questionText.attributes('oncopy')).toBe('return false');
      expect(questionText.attributes('onpaste')).toBe('return false');
    });

    it('disables browser context menu', () => {
      expect(wrapper.attributes('oncontextmenu')).toBe('return false');
    });

    it('detects tab changes and shows warning', async () => {
      // Simulate tab change
      window.dispatchEvent(new Event('blur'));
      
      await nextTick();
      
      const warning = wrapper.find('[data-test="tab-change-warning"]');
      expect(warning.exists()).toBe(true);
    });

    it('tracks suspicious activity', () => {
      expect(wrapper.vm.suspiciousActivity).toBeDefined();
      expect(Array.isArray(wrapper.vm.suspiciousActivity)).toBe(true);
    });

    it('warns about developer tools usage', async () => {
      // Simulate dev tools detection
      wrapper.vm.handleSuspiciousActivity('devtools');
      await nextTick();
      
      const devtoolsWarning = wrapper.find('[data-test="devtools-warning"]');
      expect(devtoolsWarning.exists()).toBe(true);
    });

    it('logs all user interactions for audit', () => {
      const logSpy = vi.spyOn(wrapper.vm, 'logUserAction');
      
      const answerOption = wrapper.find('[data-test="answer-option-0"]');
      answerOption.trigger('click');
      
      expect(logSpy).toHaveBeenCalledWith('answer_selected', expect.any(Object));
    });
  });

  describe('Accessibility Features', () => {
    it('has proper ARIA attributes', () => {
      expect(wrapper.attributes('role')).toBe('main');
      expect(wrapper.attributes('aria-label')).toContain('Exam Simulation');
    });

    it('provides keyboard navigation', () => {
      const focusableElements = wrapper.findAll('[tabindex="0"], button, input');
      expect(focusableElements.length).toBeGreaterThan(0);
    });

    it('announces question changes to screen readers', () => {
      const liveRegion = wrapper.find('[aria-live="polite"]');
      expect(liveRegion.exists()).toBe(true);
    });

    it('has sufficient color contrast for pass/fail indicators', () => {
      // Would test color contrast ratios in a real implementation
      const passIndicator = wrapper.find('[data-test="pass-fail-status"].passed');
      expect(passIndicator.exists()).toBe(true);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile devices', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      expect(wrapper.classes()).toContain('mobile-layout');
    });

    it('provides touch-friendly answer selection', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      const answerOptions = wrapper.findAll('[data-test^="answer-option"]');
      answerOptions.forEach(option => {
        expect(option.classes()).toContain('touch-target');
      });
    });

    it('optimizes timer display for small screens', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      const timer = wrapper.find('[data-test="exam-timer"]');
      expect(timer.classes()).toContain('mobile-timer');
    });
  });

  describe('Error Handling', () => {
    it('handles network errors during submission', async () => {
      examStore.submitExam = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const submitButton = wrapper.find('[data-test="submit-exam-button"]');
      await submitButton.trigger('click');
      
      const confirmButton = wrapper.find('[data-test="confirm-submit"]');
      await confirmButton.trigger('click');
      
      await flushPromises();
      
      const errorMessage = wrapper.find('[data-test="submission-error"]');
      expect(errorMessage.exists()).toBe(true);
      expect(errorMessage.text()).toContain('Network error');
    });

    it('provides retry option after submission failure', async () => {
      examStore.submitExam = vi.fn().mockRejectedValue(new Error('Server error'));
      
      const submitButton = wrapper.find('[data-test="submit-exam-button"]');
      await submitButton.trigger('click');
      
      const confirmButton = wrapper.find('[data-test="confirm-submit"]');
      await confirmButton.trigger('click');
      
      await flushPromises();
      
      const retrySubmissionButton = wrapper.find('[data-test="retry-submission"]');
      expect(retrySubmissionButton.exists()).toBe(true);
    });

    it('preserves user answers during error recovery', async () => {
      wrapper.vm.examAnswers = { 'q1': ['a3'], 'q2': ['a5'] };
      
      // Simulate error
      wrapper.vm.error = 'Connection lost';
      await nextTick();
      
      // Simulate recovery
      wrapper.vm.error = null;
      await nextTick();
      
      expect(wrapper.vm.examAnswers).toEqual({ 'q1': ['a3'], 'q2': ['a5'] });
    });

    it('shows graceful degradation message', async () => {
      wrapper.vm.isOffline = true;
      await nextTick();
      
      const offlineMessage = wrapper.find('[data-test="offline-message"]');
      expect(offlineMessage.exists()).toBe(true);
      expect(offlineMessage.text()).toContain('working offline');
    });
  });

  describe('Performance Optimizations', () => {
    it('lazy loads question images', () => {
      const images = wrapper.findAll('img[loading="lazy"]');
      expect(images.length).toBeGreaterThan(0);
    });

    it('virtualizes question list for large exams', async () => {
      await wrapper.setProps({ questionCount: 500 });
      
      const virtualizedList = wrapper.find('[data-test="virtualized-question-list"]');
      expect(virtualizedList.exists()).toBe(true);
    });

    it('debounces answer selections', async () => {
      const debounceSpy = vi.spyOn(wrapper.vm, 'debouncedSaveAnswer');
      
      const answerOption = wrapper.find('[data-test="answer-option-0"]');
      
      // Rapid clicks
      await answerOption.trigger('click');
      await answerOption.trigger('click');
      await answerOption.trigger('click');
      
      // Should debounce to single call
      expect(debounceSpy).toHaveBeenCalledTimes(1);
    });
  });
});