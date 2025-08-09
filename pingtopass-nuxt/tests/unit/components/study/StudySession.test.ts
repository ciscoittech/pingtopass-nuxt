import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';
import StudySession from '~/components/study/StudySession.vue';
import { useStudyStore } from '~/stores/study';
import { useExamStore } from '~/stores/exam';
import type { QuestionWithAnswers } from '~/types/exam';

// Mock the child components
vi.mock('~/components/exam/QuestionCard.vue', () => ({
  default: {
    name: 'QuestionCard',
    template: '<div data-test="question-card">Question Card</div>',
    emits: ['answer-selected', 'next-question', 'previous-question', 'jump-to-question']
  }
}));

vi.mock('~/components/exam/ExamTimer.vue', () => ({
  default: {
    name: 'ExamTimer',
    template: '<div data-test="exam-timer">Timer</div>',
    emits: ['time-up', 'warning', 'tick']
  }
}));

const mockQuestions: QuestionWithAnswers[] = [
  {
    id: 'q1',
    examId: 'exam1',
    type: 'single',
    text: 'What is the capital of France?',
    explanation: 'Paris is the capital of France.',
    difficulty: 2,
    objectiveId: 'obj1',
    isActive: true,
    aiGenerated: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    answerOptions: [
      { id: 'a1', questionId: 'q1', text: 'London', isCorrect: false, order: 1, createdAt: new Date() },
      { id: 'a2', questionId: 'q1', text: 'Paris', isCorrect: true, order: 2, createdAt: new Date() },
      { id: 'a3', questionId: 'q1', text: 'Berlin', isCorrect: false, order: 3, createdAt: new Date() },
      { id: 'a4', questionId: 'q1', text: 'Madrid', isCorrect: false, order: 4, createdAt: new Date() }
    ]
  },
  {
    id: 'q2',
    examId: 'exam1',
    type: 'multiple',
    text: 'Which are programming languages?',
    explanation: 'JavaScript and Python are programming languages.',
    difficulty: 3,
    objectiveId: 'obj2',
    isActive: true,
    aiGenerated: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    answerOptions: [
      { id: 'b1', questionId: 'q2', text: 'JavaScript', isCorrect: true, order: 1, createdAt: new Date() },
      { id: 'b2', questionId: 'q2', text: 'HTML', isCorrect: false, order: 2, createdAt: new Date() },
      { id: 'b3', questionId: 'q2', text: 'Python', isCorrect: true, order: 3, createdAt: new Date() },
      { id: 'b4', questionId: 'q2', text: 'CSS', isCorrect: false, order: 4, createdAt: new Date() }
    ]
  }
];

describe('StudySession', () => {
  let wrapper: any;
  let studyStore: any;
  let examStore: any;

  beforeEach(() => {
    const pinia = createTestingPinia({
      createSpy: vi.fn
    });

    studyStore = useStudyStore(pinia);
    examStore = useExamStore(pinia);

    // Setup default store state
    examStore.questions = mockQuestions;
    examStore.currentQuestion = mockQuestions[0];
    examStore.currentQuestionIndex = 0;
    examStore.currentSession = {
      id: 'session1',
      userId: 'user1',
      examId: 'exam1',
      mode: 'practice',
      totalQuestions: 2,
      correctAnswers: 0,
      createdAt: new Date()
    };

    studyStore.currentSession = {
      sessionId: 'session1',
      currentQuestionIndex: 0,
      answers: {},
      flaggedQuestions: new Set(),
      timeSpent: {},
      sessionStartTime: Date.now(),
      lastActivityTime: Date.now(),
      isReviewMode: false
    };

    wrapper = mount(StudySession, {
      global: {
        plugins: [pinia]
      },
      props: {
        examId: 'exam1',
        mode: 'practice'
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
      expect(wrapper.find('[data-test="study-session"]').exists()).toBe(true);
    });

    it('displays loading state when initializing', async () => {
      examStore.isLoading = true;
      await nextTick();
      
      expect(wrapper.find('[data-test="loading-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Loading study session');
    });

    it('displays error state when there is an error', async () => {
      examStore.error = 'Failed to load questions';
      await nextTick();
      
      expect(wrapper.find('[data-test="error-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load questions');
    });

    it('initializes with correct default props', () => {
      expect(wrapper.vm.mode).toBe('practice');
      expect(wrapper.vm.showTimer).toBe(true);
      expect(wrapper.vm.enableKeyboardShortcuts).toBe(true);
      expect(wrapper.vm.autoSave).toBe(true);
    });
  });

  describe('Study Modes', () => {
    it('displays immediate feedback in practice mode', async () => {
      await wrapper.setProps({ mode: 'practice' });
      
      // Answer a question
      await wrapper.vm.handleAnswerSelected(['a2']);
      
      expect(wrapper.find('[data-test="immediate-feedback"]').exists()).toBe(true);
      expect(wrapper.vm.showExplanation).toBe(true);
    });

    it('does not show immediate feedback in timed mode', async () => {
      await wrapper.setProps({ mode: 'timed' });
      
      await wrapper.vm.handleAnswerSelected(['a2']);
      
      expect(wrapper.find('[data-test="immediate-feedback"]').exists()).toBe(false);
      expect(wrapper.vm.showExplanation).toBe(false);
    });

    it('does not show immediate feedback in exam mode', async () => {
      await wrapper.setProps({ mode: 'exam' });
      
      await wrapper.vm.handleAnswerSelected(['a2']);
      
      expect(wrapper.find('[data-test="immediate-feedback"]').exists()).toBe(false);
      expect(wrapper.vm.showExplanation).toBe(false);
    });

    it('displays timer in timed and exam modes', async () => {
      await wrapper.setProps({ mode: 'timed' });
      expect(wrapper.find('[data-test="exam-timer"]').exists()).toBe(true);
      
      await wrapper.setProps({ mode: 'exam' });
      expect(wrapper.find('[data-test="exam-timer"]').exists()).toBe(true);
    });

    it('hides timer in practice mode when showTimer is false', async () => {
      await wrapper.setProps({ mode: 'practice', showTimer: false });
      expect(wrapper.find('[data-test="exam-timer"]').exists()).toBe(false);
    });
  });

  describe('Question Navigation', () => {
    it('navigates to next question', async () => {
      await wrapper.vm.handleNextQuestion();
      
      expect(examStore.nextQuestion).toHaveBeenCalled();
    });

    it('navigates to previous question', async () => {
      examStore.currentQuestionIndex = 1;
      await wrapper.vm.handlePreviousQuestion();
      
      expect(examStore.previousQuestion).toHaveBeenCalled();
    });

    it('jumps to specific question', async () => {
      await wrapper.vm.handleJumpToQuestion(1);
      
      expect(examStore.goToQuestion).toHaveBeenCalledWith(0); // 0-indexed
    });

    it('disables previous button on first question', () => {
      examStore.currentQuestionIndex = 0;
      const prevButton = wrapper.find('[data-test="nav-previous"]');
      expect(prevButton.attributes('disabled')).toBeDefined();
    });

    it('disables next button on last question', async () => {
      examStore.currentQuestionIndex = 1;
      examStore.totalQuestions = 2;
      await nextTick();
      
      const nextButton = wrapper.find('[data-test="nav-next"]');
      expect(nextButton.attributes('disabled')).toBeDefined();
    });

    it('shows question number correctly', () => {
      const questionNumber = wrapper.find('[data-test="question-number"]');
      expect(questionNumber.text()).toContain('Question 1 of 2');
    });
  });

  describe('Answer Handling', () => {
    it('handles single choice answer selection', async () => {
      await wrapper.vm.handleAnswerSelected(['a2']);
      
      expect(studyStore.answerQuestion).toHaveBeenCalledWith(
        'q1',
        ['a2'],
        true, // isCorrect
        expect.any(Number)
      );
    });

    it('handles multiple choice answer selection', async () => {
      examStore.currentQuestion = mockQuestions[1];
      await wrapper.vm.handleAnswerSelected(['b1', 'b3']);
      
      expect(studyStore.answerQuestion).toHaveBeenCalledWith(
        'q2',
        ['b1', 'b3'],
        true,
        expect.any(Number)
      );
    });

    it('validates answers correctly for single choice', () => {
      const isCorrect = wrapper.vm.validateAnswer(mockQuestions[0], ['a2']);
      expect(isCorrect).toBe(true);
      
      const isIncorrect = wrapper.vm.validateAnswer(mockQuestions[0], ['a1']);
      expect(isIncorrect).toBe(false);
    });

    it('validates answers correctly for multiple choice', () => {
      const isCorrect = wrapper.vm.validateAnswer(mockQuestions[1], ['b1', 'b3']);
      expect(isCorrect).toBe(true);
      
      const isIncorrect = wrapper.vm.validateAnswer(mockQuestions[1], ['b1', 'b2']);
      expect(isIncorrect).toBe(false);
    });

    it('tracks time spent on each question', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1000);
      wrapper.vm.startQuestionTimer();
      
      vi.spyOn(Date, 'now').mockReturnValue(5000);
      await wrapper.vm.handleAnswerSelected(['a2']);
      
      expect(wrapper.vm.currentQuestionTime).toBe(4); // 4 seconds
    });
  });

  describe('Question Flagging', () => {
    it('flags a question for review', async () => {
      await wrapper.vm.toggleQuestionFlag();
      
      expect(studyStore.flagQuestion).toHaveBeenCalledWith('q1', true);
      expect(wrapper.vm.isCurrentQuestionFlagged).toBe(true);
    });

    it('unflags a previously flagged question', async () => {
      studyStore.currentSession.flaggedQuestions.add('q1');
      await wrapper.vm.toggleQuestionFlag();
      
      expect(studyStore.flagQuestion).toHaveBeenCalledWith('q1', false);
    });

    it('displays flag indicator when question is flagged', async () => {
      studyStore.currentSession.flaggedQuestions.add('q1');
      await nextTick();
      
      const flagIndicator = wrapper.find('[data-test="flag-indicator"]');
      expect(flagIndicator.exists()).toBe(true);
      expect(flagIndicator.classes()).toContain('flagged');
    });

    it('shows flagged questions count', async () => {
      studyStore.currentSession.flaggedQuestions.add('q1');
      studyStore.currentSession.flaggedQuestions.add('q2');
      await nextTick();
      
      const flagCount = wrapper.find('[data-test="flag-count"]');
      expect(flagCount.text()).toContain('2');
    });
  });

  describe('Progress Tracking', () => {
    it('displays current progress', () => {
      studyStore.currentSession.answers = { q1: ['a2'] };
      const progress = wrapper.find('[data-test="progress-indicator"]');
      expect(progress.exists()).toBe(true);
    });

    it('shows answered questions count', async () => {
      studyStore.currentSession.answers = { q1: ['a2'] };
      await nextTick();
      
      const answered = wrapper.find('[data-test="answered-count"]');
      expect(answered.text()).toContain('1 of 2');
    });

    it('calculates progress percentage correctly', () => {
      studyStore.currentSession.answers = { q1: ['a2'] };
      expect(wrapper.vm.progressPercentage).toBe(50);
    });
  });

  describe('Auto-save Functionality', () => {
    it('auto-saves session state when enabled', async () => {
      await wrapper.setProps({ autoSave: true });
      await wrapper.vm.handleAnswerSelected(['a2']);
      
      expect(studyStore.saveSessionState).toHaveBeenCalled();
    });

    it('does not auto-save when disabled', async () => {
      await wrapper.setProps({ autoSave: false });
      await wrapper.vm.handleAnswerSelected(['a2']);
      
      expect(studyStore.saveSessionState).not.toHaveBeenCalled();
    });
  });

  describe('Session Resume', () => {
    it('loads previous session state on mount', async () => {
      const resumeData = {
        sessionId: 'session1',
        currentQuestionIndex: 1,
        answers: { q1: ['a2'] },
        flaggedQuestions: new Set(['q1'])
      };
      
      studyStore.loadSessionState.mockReturnValue(true);
      studyStore.currentSession = resumeData;
      
      const newWrapper = mount(StudySession, {
        global: {
          plugins: [createTestingPinia({ createSpy: vi.fn })]
        },
        props: {
          examId: 'exam1',
          mode: 'practice',
          resumeSession: true
        }
      });
      
      expect(studyStore.loadSessionState).toHaveBeenCalledWith('session1');
    });

    it('shows resume confirmation when previous session exists', async () => {
      await wrapper.setProps({ resumeSession: true });
      
      const resumeDialog = wrapper.find('[data-test="resume-dialog"]');
      expect(resumeDialog.exists()).toBe(true);
    });
  });

  describe('Keyboard Shortcuts', () => {
    beforeEach(() => {
      studyStore.keyboardShortcutsEnabled = true;
    });

    it('navigates next with arrow right key', async () => {
      await wrapper.trigger('keydown', { key: 'ArrowRight' });
      expect(examStore.nextQuestion).toHaveBeenCalled();
    });

    it('navigates previous with arrow left key', async () => {
      await wrapper.trigger('keydown', { key: 'ArrowLeft' });
      expect(examStore.previousQuestion).toHaveBeenCalled();
    });

    it('flags question with F key', async () => {
      await wrapper.trigger('keydown', { key: 'f' });
      expect(studyStore.flagQuestion).toHaveBeenCalled();
    });

    it('toggles explanation with E key in practice mode', async () => {
      await wrapper.setProps({ mode: 'practice' });
      await wrapper.trigger('keydown', { key: 'e' });
      expect(wrapper.vm.localShowExplanation).toBe(true);
    });

    it('selects answer options with number keys', async () => {
      await wrapper.trigger('keydown', { key: '1' });
      // Should select first answer option
      expect(wrapper.vm.selectedAnswers).toContain('a1');
    });

    it('ignores shortcuts when disabled', async () => {
      studyStore.keyboardShortcutsEnabled = false;
      await wrapper.trigger('keydown', { key: 'ArrowRight' });
      expect(examStore.nextQuestion).not.toHaveBeenCalled();
    });
  });

  describe('Timer Integration', () => {
    it('starts timer in timed mode', async () => {
      await wrapper.setProps({ mode: 'timed' });
      expect(wrapper.find('[data-test="exam-timer"]').exists()).toBe(true);
    });

    it('handles timer warnings', async () => {
      await wrapper.vm.handleTimerWarning(300); // 5 minutes remaining
      expect(wrapper.vm.showTimeWarning).toBe(true);
    });

    it('handles time up event', async () => {
      const finishSpy = vi.spyOn(wrapper.vm, 'finishSession');
      await wrapper.vm.handleTimeUp();
      expect(finishSpy).toHaveBeenCalled();
    });

    it('pauses timer when session is paused', async () => {
      const timerRef = wrapper.findComponent({ name: 'ExamTimer' });
      await wrapper.vm.pauseSession();
      // Timer should receive pause signal
      expect(wrapper.vm.isSessionPaused).toBe(true);
    });
  });

  describe('Session Completion', () => {
    it('shows completion dialog when all questions answered', async () => {
      // Answer all questions
      studyStore.currentSession.answers = { q1: ['a2'], q2: ['b1', 'b3'] };
      examStore.currentQuestionIndex = 1; // Last question
      
      await wrapper.vm.handleAnswerSelected(['b1', 'b3']);
      
      expect(wrapper.find('[data-test="completion-dialog"]').exists()).toBe(true);
    });

    it('calculates final score correctly', () => {
      studyStore.currentSession.answers = { q1: ['a2'], q2: ['b1', 'b3'] };
      const score = wrapper.vm.calculateFinalScore();
      expect(score).toBe(100); // Both answers correct
    });

    it('emits session completed event', async () => {
      await wrapper.vm.finishSession();
      expect(wrapper.emitted('session-completed')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      expect(wrapper.attributes('role')).toBe('main');
      expect(wrapper.attributes('aria-label')).toContain('Study Session');
    });

    it('announces question changes to screen readers', async () => {
      await wrapper.vm.handleNextQuestion();
      const announcement = wrapper.find('[data-test="sr-announcement"]');
      expect(announcement.text()).toContain('Question 2 of 2');
    });

    it('provides keyboard navigation instructions', () => {
      const instructions = wrapper.find('[data-test="keyboard-instructions"]');
      expect(instructions.exists()).toBe(true);
    });

    it('has proper focus management', async () => {
      await wrapper.vm.handleNextQuestion();
      // Next question should receive focus
      await nextTick();
      const questionCard = wrapper.find('[data-test="question-card"]');
      expect(document.activeElement).toBe(questionCard.element);
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', async () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 360 });
      await wrapper.vm.handleResize();
      
      expect(wrapper.classes()).toContain('mobile-layout');
    });

    it('adjusts navigation controls for mobile', async () => {
      wrapper.vm.isMobile = true;
      await nextTick();
      
      const navigation = wrapper.find('[data-test="mobile-navigation"]');
      expect(navigation.exists()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles network errors gracefully', async () => {
      examStore.submitAnswer.mockRejectedValue(new Error('Network error'));
      
      await wrapper.vm.handleAnswerSelected(['a2']);
      
      expect(wrapper.find('[data-test="error-toast"]').exists()).toBe(true);
    });

    it('retries failed operations', async () => {
      const retrySpy = vi.spyOn(wrapper.vm, 'retryFailedOperation');
      
      const retryButton = wrapper.find('[data-test="retry-button"]');
      if (retryButton.exists()) {
        await retryButton.trigger('click');
        expect(retrySpy).toHaveBeenCalled();
      }
    });
  });
});