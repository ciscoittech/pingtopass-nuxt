import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import QuestionCard from '../../../../components/exam/QuestionCard.vue';
import type { QuestionWithAnswers } from '../../../../types/exam';

// Mock data
const mockQuestion: QuestionWithAnswers = {
  id: 'q1',
  examId: 'exam1',
  type: 'single',
  text: 'What is the default subnet mask for a Class C network?',
  explanation: 'Class C networks use /24 (255.255.255.0) as the default subnet mask.',
  difficulty: 3,
  objectiveId: 'obj-1',
  isActive: true,
  aiGenerated: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  answerOptions: [
    {
      id: 'opt1',
      questionId: 'q1',
      text: '255.255.255.0',
      isCorrect: true,
      order: 1,
      createdAt: new Date(),
    },
    {
      id: 'opt2', 
      questionId: 'q1',
      text: '255.255.0.0',
      isCorrect: false,
      order: 2,
      createdAt: new Date(),
    },
    {
      id: 'opt3',
      questionId: 'q1', 
      text: '255.0.0.0',
      isCorrect: false,
      order: 3,
      createdAt: new Date(),
    },
    {
      id: 'opt4',
      questionId: 'q1',
      text: '255.255.255.255',
      isCorrect: false,
      order: 4,
      createdAt: new Date(),
    }
  ]
};

const mockMultipleQuestion: QuestionWithAnswers = {
  ...mockQuestion,
  id: 'q2',
  type: 'multiple',
  text: 'Which of the following are valid IPv4 address formats? (Select all that apply)',
  answerOptions: [
    {
      id: 'opt5',
      questionId: 'q2',
      text: '192.168.1.1',
      isCorrect: true,
      order: 1,
      createdAt: new Date(),
    },
    {
      id: 'opt6',
      questionId: 'q2', 
      text: '10.0.0.256',
      isCorrect: false,
      order: 2,
      createdAt: new Date(),
    },
    {
      id: 'opt7',
      questionId: 'q2',
      text: '172.16.0.1',
      isCorrect: true,
      order: 3,
      createdAt: new Date(),
    }
  ]
};

describe('QuestionCard.vue', () => {
  let wrapper: any;

  const createWrapper = (props = {}) => {
    wrapper = mount(QuestionCard, {
      props: {
        question: mockQuestion,
        questionNumber: 1,
        totalQuestions: 10,
        ...props,
      },
    });
    return wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the question card correctly', () => {
      createWrapper();
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('[data-test="question-card"]').exists()).toBe(true);
    });

    it('should display question text', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="question-text"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('What is the default subnet mask for a Class C network?');
    });

    it('should display question number and total', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="question-number"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Question 1 of 10');
    });

    it('should display difficulty indicator', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="difficulty-indicator"]').exists()).toBe(true);
      expect(wrapper.findAll('[data-test="difficulty-star"]')).toHaveLength(5);
      expect(wrapper.findAll('[data-test="difficulty-star"].filled')).toHaveLength(3);
    });

    it('should display question type indicator', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="question-type"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Single Choice');
    });

    it('should display multiple choice indicator for multiple questions', () => {
      createWrapper({ question: mockMultipleQuestion });
      
      expect(wrapper.text()).toContain('Multiple Choice');
      expect(wrapper.text()).toContain('Select all that apply');
    });
  });

  describe('Answer Options Integration', () => {
    it('should render answer options component', () => {
      createWrapper();
      
      expect(wrapper.findComponent('[data-test="answer-options"]').exists()).toBe(true);
    });

    it('should pass correct props to answer options', () => {
      createWrapper();
      
      const answerOptions = wrapper.findComponent('[data-test="answer-options"]');
      expect(answerOptions.props('options')).toEqual(mockQuestion.answerOptions);
      expect(answerOptions.props('questionType')).toBe('single');
    });

    it('should handle answer selection events', async () => {
      createWrapper();
      
      const answerOptions = wrapper.findComponent('[data-test="answer-options"]');
      await answerOptions.vm.$emit('answer-selected', ['opt1']);
      
      expect(wrapper.emitted('answer-selected')).toBeTruthy();
      expect(wrapper.emitted('answer-selected')[0]).toEqual([['opt1']]);
    });

    it('should show selected answers state', () => {
      createWrapper({ selectedAnswers: ['opt1', 'opt2'] });
      
      const answerOptions = wrapper.findComponent('[data-test="answer-options"]');
      expect(answerOptions.props('selectedAnswers')).toEqual(['opt1', 'opt2']);
    });
  });

  describe('Navigation Controls', () => {
    it('should show navigation buttons when enabled', () => {
      createWrapper({ showNavigation: true });
      
      expect(wrapper.find('[data-test="nav-previous"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="nav-next"]').exists()).toBe(true);
    });

    it('should disable previous button on first question', () => {
      createWrapper({ 
        showNavigation: true,
        questionNumber: 1,
        isFirstQuestion: true 
      });
      
      const prevButton = wrapper.find('[data-test="nav-previous"]');
      expect(prevButton.element.disabled).toBe(true);
    });

    it('should disable next button on last question', () => {
      createWrapper({ 
        showNavigation: true,
        questionNumber: 10,
        totalQuestions: 10,
        isLastQuestion: true 
      });
      
      const nextButton = wrapper.find('[data-test="nav-next"]');
      expect(nextButton.element.disabled).toBe(true);
    });

    it('should emit navigation events', async () => {
      createWrapper({ showNavigation: true });
      
      const prevButton = wrapper.find('[data-test="nav-previous"]');
      const nextButton = wrapper.find('[data-test="nav-next"]');
      
      await prevButton.trigger('click');
      await nextButton.trigger('click');
      
      expect(wrapper.emitted('previous-question')).toBeTruthy();
      expect(wrapper.emitted('next-question')).toBeTruthy();
    });

    it('should show question jump selector when enabled', () => {
      createWrapper({ 
        showNavigation: true,
        enableQuestionJump: true 
      });
      
      expect(wrapper.find('[data-test="question-jump"]').exists()).toBe(true);
    });

    it('should emit jump-to-question event', async () => {
      createWrapper({ 
        showNavigation: true,
        enableQuestionJump: true 
      });
      
      const jumpSelect = wrapper.find('[data-test="question-jump"]');
      await jumpSelect.setValue('5');
      
      expect(wrapper.emitted('jump-to-question')).toBeTruthy();
      expect(wrapper.emitted('jump-to-question')[0]).toEqual([5]);
    });
  });

  describe('Explanation Display', () => {
    it('should not show explanation by default', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="explanation"]').exists()).toBe(false);
    });

    it('should show explanation when showExplanation is true', () => {
      createWrapper({ showExplanation: true });
      
      expect(wrapper.find('[data-test="explanation"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Class C networks use /24');
    });

    it('should show explanation toggle button', () => {
      createWrapper({ enableExplanationToggle: true });
      
      expect(wrapper.find('[data-test="toggle-explanation"]').exists()).toBe(true);
    });

    it('should toggle explanation visibility', async () => {
      createWrapper({ enableExplanationToggle: true });
      
      const toggleButton = wrapper.find('[data-test="toggle-explanation"]');
      await toggleButton.trigger('click');
      
      expect(wrapper.find('[data-test="explanation"]').exists()).toBe(true);
      
      await toggleButton.trigger('click');
      expect(wrapper.find('[data-test="explanation"]').exists()).toBe(false);
    });

    it('should handle questions without explanations', () => {
      const questionNoExplanation = { ...mockQuestion, explanation: undefined };
      createWrapper({ 
        question: questionNoExplanation,
        showExplanation: true 
      });
      
      expect(wrapper.find('[data-test="explanation"]').exists()).toBe(false);
    });
  });

  describe('Question Meta Information', () => {
    it('should show objective ID when available', () => {
      createWrapper({ showObjective: true });
      
      expect(wrapper.find('[data-test="objective"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('obj-1');
    });

    it('should show AI generated indicator', () => {
      const aiQuestion = { ...mockQuestion, aiGenerated: true };
      createWrapper({ 
        question: aiQuestion,
        showAiIndicator: true 
      });
      
      expect(wrapper.find('[data-test="ai-indicator"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('AI Generated');
    });

    it('should show question ID for debugging', () => {
      createWrapper({ showDebugInfo: true });
      
      expect(wrapper.find('[data-test="question-id"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('q1');
    });

    it('should display creation date when enabled', () => {
      createWrapper({ showMetadata: true });
      
      expect(wrapper.find('[data-test="created-date"]').exists()).toBe(true);
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state', () => {
      createWrapper({ loading: true });
      
      expect(wrapper.find('[data-test="loading-spinner"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="question-text"]').exists()).toBe(false);
    });

    it('should show error state', () => {
      createWrapper({ 
        question: null,
        error: 'Failed to load question' 
      });
      
      expect(wrapper.find('[data-test="error-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Failed to load question');
    });

    it('should show retry button in error state', async () => {
      createWrapper({ 
        question: null,
        error: 'Network error' 
      });
      
      const retryButton = wrapper.find('[data-test="retry-button"]');
      expect(retryButton.exists()).toBe(true);
      
      await retryButton.trigger('click');
      expect(wrapper.emitted('retry-load')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      createWrapper();
      
      const questionCard = wrapper.find('[data-test="question-card"]');
      expect(questionCard.attributes('role')).toBe('article');
      expect(questionCard.attributes('aria-label')).toContain('Question 1 of 10');
    });

    it('should have proper heading structure', () => {
      createWrapper();
      
      expect(wrapper.find('h2').exists()).toBe(true);
      expect(wrapper.find('[data-test="question-text"]').attributes('role')).toBe('heading');
    });

    it('should support keyboard navigation for controls', async () => {
      createWrapper({ showNavigation: true });
      
      const prevButton = wrapper.find('[data-test="nav-previous"]');
      const nextButton = wrapper.find('[data-test="nav-next"]');
      
      // Buttons are naturally focusable, check they exist and can be focused
      expect(prevButton.exists()).toBe(true);
      expect(nextButton.exists()).toBe(true);
      expect(prevButton.element.tagName).toBe('BUTTON');
      expect(nextButton.element.tagName).toBe('BUTTON');
    });

    it('should have screen reader friendly content', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="difficulty-sr"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="type-sr"]').exists()).toBe(true);
    });
  });

  describe('Responsive Design', () => {
    it('should apply mobile layout classes', () => {
      createWrapper({ isMobile: true });
      
      const questionCard = wrapper.find('[data-test="question-card"]');
      expect(questionCard.classes()).toContain('mobile-layout');
    });

    it('should stack navigation buttons on mobile', () => {
      createWrapper({ 
        showNavigation: true,
        isMobile: true 
      });
      
      const navSection = wrapper.find('[data-test="navigation-section"]');
      expect(navSection.classes()).toContain('flex-col');
    });
  });

  describe('Question Types', () => {
    it('should handle drag-drop question type', () => {
      const dragDropQuestion = { 
        ...mockQuestion, 
        type: 'drag-drop' as const,
        text: 'Drag the correct network components to their proper locations'
      };
      createWrapper({ question: dragDropQuestion });
      
      expect(wrapper.text()).toContain('Drag & Drop');
    });

    it('should show appropriate instructions for question type', () => {
      createWrapper({ question: mockMultipleQuestion });
      
      expect(wrapper.find('[data-test="question-instructions"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Select all that apply');
    });

    it('should handle questions without answer options', () => {
      const questionNoOptions = { 
        ...mockQuestion, 
        answerOptions: [] 
      };
      
      expect(() => createWrapper({ question: questionNoOptions })).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long question text', () => {
      const longQuestion = {
        ...mockQuestion,
        text: 'This is a very long question text that might wrap multiple lines and could potentially break the layout if not handled properly. It should be displayed correctly regardless of the length and maintain proper formatting and readability for the user taking the exam.'
      };
      createWrapper({ question: longQuestion });
      
      expect(wrapper.find('[data-test="question-text"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('This is a very long question text');
    });

    it('should handle zero difficulty', () => {
      const zeroDifficultyQuestion = { ...mockQuestion, difficulty: 0 as any };
      createWrapper({ question: zeroDifficultyQuestion });
      
      // Should still render without errors
      expect(wrapper.find('[data-test="difficulty-indicator"]').exists()).toBe(true);
    });

    it('should handle maximum difficulty', () => {
      const maxDifficultyQuestion = { ...mockQuestion, difficulty: 5 };
      createWrapper({ question: maxDifficultyQuestion });
      
      expect(wrapper.findAll('[data-test="difficulty-star"].filled')).toHaveLength(5);
    });
  });
});