/**
 * QuestionCard Component Tests
 * Comprehensive test suite covering all functionality
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import QuestionCard from '@/components/QuestionCard.vue';
import { QuestionFactory } from '@/tests/factories';

// Component type for better TypeScript support
type QuestionCardWrapper = VueWrapper<InstanceType<typeof QuestionCard>>;

// Mock question data
const mockQuestion = QuestionFactory.create({
  id: 1,
  text: 'What is the primary purpose of a router in networking?',
  type: 'multiple_choice',
  difficulty: 3,
  answers: [
    { id: 'a', text: 'To connect different networks', is_correct: true },
    { id: 'b', text: 'To store data locally', is_correct: false },
    { id: 'c', text: 'To provide electricity', is_correct: false },
    { id: 'd', text: 'To display images', is_correct: false }
  ],
  tags: ['networking', 'hardware']
});

const mockMultipleSelectQuestion = QuestionFactory.createMultipleSelect({
  id: 2,
  text: 'Which of the following are valid HTTP methods?',
  answers: [
    { id: 'a', text: 'GET', is_correct: true },
    { id: 'b', text: 'POST', is_correct: true },
    { id: 'c', text: 'SEND', is_correct: false },
    { id: 'd', text: 'DELETE', is_correct: true },
    { id: 'e', text: 'RECEIVE', is_correct: false }
  ]
});

describe('QuestionCard', () => {
  let wrapper: QuestionCardWrapper;

  const createWrapper = (props = {}) => {
    return mount(QuestionCard, {
      props: {
        question: mockQuestion,
        ...props
      }
    }) as QuestionCardWrapper;
  };

  beforeEach(() => {
    wrapper = createWrapper();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Rendering', () => {
    it('should render the component with correct test ids', () => {
      expect(wrapper.find('[data-testid="question-card"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="question-number"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="question-difficulty"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="question-text"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="question-type"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="answers-container"]').exists()).toBe(true);
    });

    it('should display question number correctly', () => {
      const questionNumber = wrapper.find('[data-testid="question-number"]');
      expect(questionNumber.text()).toBe('Question 1');
    });

    it('should display question text correctly', () => {
      const questionText = wrapper.find('[data-testid="question-text"]');
      expect(questionText.text()).toContain(mockQuestion.text);
    });

    it('should display difficulty level correctly', () => {
      const difficulty = wrapper.find('[data-testid="question-difficulty"]');
      expect(difficulty.text()).toContain('Difficulty: 3/5');
      expect(difficulty.classes()).toContain('difficulty-3');
    });

    it('should display question type correctly', () => {
      const questionType = wrapper.find('[data-testid="question-type"]');
      expect(questionType.text()).toContain('Multiple Choice');
    });

    it('should render all answer options', () => {
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      expect(answerOptions).toHaveLength(4);
    });

    it('should display question tags when provided', () => {
      expect(wrapper.find('[data-testid="question-tags"]').exists()).toBe(true);
      const tags = wrapper.findAll('.tag');
      expect(tags).toHaveLength(2);
      expect(tags[0].text()).toBe('networking');
      expect(tags[1].text()).toBe('hardware');
    });

    it('should not display tags when none provided', () => {
      const questionWithoutTags = { ...mockQuestion, tags: [] };
      wrapper = createWrapper({ question: questionWithoutTags });
      expect(wrapper.find('[data-testid="question-tags"]').exists()).toBe(false);
    });
  });

  describe('Props Validation', () => {
    it('should accept a valid question prop', () => {
      expect(wrapper.props('question')).toEqual(mockQuestion);
    });

    it('should have correct default prop values', () => {
      expect(wrapper.props('disabled')).toBe(false);
      expect(wrapper.props('showCorrectAnswer')).toBe(false);
      expect(wrapper.props('showFeedback')).toBe(false);
    });

    it('should apply disabled prop correctly', () => {
      wrapper = createWrapper({ disabled: true });
      expect(wrapper.classes()).toContain('disabled');
    });

    it('should show correct answers when prop is true', () => {
      wrapper = createWrapper({ showCorrectAnswer: true });
      // Click an incorrect answer first
      const incorrectAnswer = wrapper.findAll('[data-testid="answer-option"]')[1];
      incorrectAnswer.trigger('click');
      
      // Check if correct answer has the correct class
      const correctAnswer = wrapper.findAll('[data-testid="answer-option"]')[0];
      expect(correctAnswer.classes()).toContain('correct');
    });
  });

  describe('Answer Selection - Single Choice', () => {
    it('should select an answer when clicked', async () => {
      const answerOption = wrapper.findAll('[data-testid="answer-option"]')[0];
      await answerOption.trigger('click');
      
      expect(answerOption.classes()).toContain('selected');
    });

    it('should select only one answer at a time for multiple choice', async () => {
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      
      // Click first answer
      await answerOptions[0].trigger('click');
      expect(answerOptions[0].classes()).toContain('selected');
      
      // Click second answer
      await answerOptions[1].trigger('click');
      expect(answerOptions[0].classes()).not.toContain('selected');
      expect(answerOptions[1].classes()).toContain('selected');
    });

    it('should emit answer-selected event when answer is clicked', async () => {
      const answerOption = wrapper.findAll('[data-testid="answer-option"]')[0];
      await answerOption.trigger('click');
      
      const emittedEvents = wrapper.emitted('answer-selected');
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents![0]).toEqual([{
        questionId: 1,
        answerId: 'a',
        isCorrect: true
      }]);
    });

    it('should emit answer-changed event when answer is clicked', async () => {
      const answerOption = wrapper.findAll('[data-testid="answer-option"]')[0];
      await answerOption.trigger('click');
      
      const emittedEvents = wrapper.emitted('answer-changed');
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents![0]).toEqual([{
        questionId: 1,
        answerId: 'a',
        isCorrect: true
      }]);
    });

    it('should not allow selection when disabled', async () => {
      wrapper = createWrapper({ disabled: true });
      const answerOption = wrapper.findAll('[data-testid="answer-option"]')[0];
      
      await answerOption.trigger('click');
      
      expect(answerOption.classes()).not.toContain('selected');
      expect(wrapper.emitted('answer-selected')).toBeFalsy();
    });
  });

  describe('Answer Selection - Multiple Select', () => {
    beforeEach(() => {
      wrapper = createWrapper({ question: mockMultipleSelectQuestion });
    });

    it('should allow multiple answer selection for multiple_select type', async () => {
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      
      // Click first answer
      await answerOptions[0].trigger('click');
      expect(answerOptions[0].classes()).toContain('selected');
      
      // Click second answer - both should be selected
      await answerOptions[1].trigger('click');
      expect(answerOptions[0].classes()).toContain('selected');
      expect(answerOptions[1].classes()).toContain('selected');
    });

    it('should toggle answer selection for multiple_select type', async () => {
      const answerOption = wrapper.findAll('[data-testid="answer-option"]')[0];
      
      // Click to select
      await answerOption.trigger('click');
      expect(answerOption.classes()).toContain('selected');
      
      // Click again to deselect
      await answerOption.trigger('click');
      expect(answerOption.classes()).not.toContain('selected');
    });

    it('should emit correct array of answers for multiple_select', async () => {
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      
      // Select correct answers (a, b, d)
      await answerOptions[0].trigger('click'); // a
      await answerOptions[1].trigger('click'); // b
      await answerOptions[3].trigger('click'); // d
      
      const emittedEvents = wrapper.emitted('answer-selected');
      const lastEvent = emittedEvents![emittedEvents!.length - 1];
      expect(lastEvent).toEqual([{
        questionId: 2,
        answerId: ['a', 'b', 'd'],
        isCorrect: true
      }]);
    });
  });

  describe('Keyboard Navigation', () => {
    it('should select answer on Enter key press', async () => {
      const answerOption = wrapper.findAll('[data-testid="answer-option"]')[0];
      await answerOption.trigger('keydown.enter');
      
      expect(answerOption.classes()).toContain('selected');
    });

    it('should select answer on Space key press', async () => {
      const answerOption = wrapper.findAll('[data-testid="answer-option"]')[0];
      await answerOption.trigger('keydown.space');
      
      expect(answerOption.classes()).toContain('selected');
    });

    it('should have proper tabindex for keyboard navigation', () => {
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      answerOptions.forEach(option => {
        expect(option.attributes('tabindex')).toBe('0');
      });
    });

    it('should disable keyboard navigation when disabled', () => {
      wrapper = createWrapper({ disabled: true });
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      answerOptions.forEach(option => {
        expect(option.attributes('tabindex')).toBe('-1');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const answersContainer = wrapper.find('[data-testid="answers-container"]');
      expect(answersContainer.attributes('role')).toBe('radiogroup');
      expect(answersContainer.attributes('aria-label')).toContain('Answers for question 1');
    });

    it('should have proper role and aria-checked for answer options', () => {
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      answerOptions.forEach(option => {
        expect(option.attributes('role')).toBe('radio');
        expect(option.attributes('aria-checked')).toBe('false');
      });
    });

    it('should update aria-checked when answer is selected', async () => {
      const answerOption = wrapper.findAll('[data-testid="answer-option"]')[0];
      await answerOption.trigger('click');
      
      expect(answerOption.attributes('aria-checked')).toBe('true');
    });

    it('should have proper aria-label for input elements', () => {
      const inputs = wrapper.findAll('input');
      inputs.forEach((input, index) => {
        const expectedLabel = `Select answer ${mockQuestion.answers[index].id}`;
        expect(input.attributes('aria-label')).toBe(expectedLabel);
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should show feedback when showFeedback prop is true', () => {
      wrapper = createWrapper({ showFeedback: true });
      // No feedback should be visible initially
      expect(wrapper.find('[data-testid="feedback-container"]').exists()).toBe(false);
    });

    it('should display feedback after answering when showFeedback is true', async () => {
      wrapper = createWrapper({ showFeedback: true });
      
      // Answer the question
      await wrapper.findAll('[data-testid="answer-option"]')[0].trigger('click');
      
      expect(wrapper.find('[data-testid="feedback-container"]').exists()).toBe(true);
      const feedbackMessage = wrapper.find('.feedback-message');
      expect(feedbackMessage.classes()).toContain('correct');
      expect(feedbackMessage.text()).toContain('Correct!');
    });

    it('should show incorrect feedback for wrong answers', async () => {
      wrapper = createWrapper({ showFeedback: true });
      
      // Answer incorrectly
      await wrapper.findAll('[data-testid="answer-option"]')[1].trigger('click');
      
      const feedbackMessage = wrapper.find('.feedback-message');
      expect(feedbackMessage.classes()).toContain('incorrect');
      expect(feedbackMessage.text()).toContain('Incorrect');
    });

    it('should apply answered class when answer is selected', async () => {
      const answerOption = wrapper.findAll('[data-testid="answer-option"]')[0];
      await answerOption.trigger('click');
      
      expect(wrapper.classes()).toContain('answered');
    });
  });

  describe('Correctness Calculation', () => {
    it('should calculate correctness for single choice questions', async () => {
      // Test correct answer
      await wrapper.findAll('[data-testid="answer-option"]')[0].trigger('click');
      let emittedEvents = wrapper.emitted('answer-selected');
      expect(emittedEvents![0][0].isCorrect).toBe(true);
      
      // Test incorrect answer
      wrapper = createWrapper();
      await wrapper.findAll('[data-testid="answer-option"]')[1].trigger('click');
      emittedEvents = wrapper.emitted('answer-selected');
      expect(emittedEvents![0][0].isCorrect).toBe(false);
    });

    it('should calculate correctness for multiple select questions', async () => {
      wrapper = createWrapper({ question: mockMultipleSelectQuestion });
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      
      // Select all correct answers (a, b, d)
      await answerOptions[0].trigger('click'); // a (correct)
      await answerOptions[1].trigger('click'); // b (correct)
      await answerOptions[3].trigger('click'); // d (correct)
      
      const emittedEvents = wrapper.emitted('answer-selected');
      const lastEvent = emittedEvents![emittedEvents!.length - 1];
      expect(lastEvent[0].isCorrect).toBe(true);
    });

    it('should be incorrect if not all correct answers are selected', async () => {
      wrapper = createWrapper({ question: mockMultipleSelectQuestion });
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      
      // Select only some correct answers
      await answerOptions[0].trigger('click'); // a (correct)
      await answerOptions[1].trigger('click'); // b (correct)
      // Missing d
      
      const emittedEvents = wrapper.emitted('answer-selected');
      const lastEvent = emittedEvents![emittedEvents!.length - 1];
      expect(lastEvent[0].isCorrect).toBe(false);
    });
  });

  describe('Question Type Formatting', () => {
    it('should format multiple_choice type correctly', () => {
      const typeDisplay = wrapper.find('[data-testid="question-type"]');
      expect(typeDisplay.text()).toContain('Multiple Choice');
    });

    it('should format multiple_select type correctly', () => {
      wrapper = createWrapper({ question: mockMultipleSelectQuestion });
      const typeDisplay = wrapper.find('[data-testid="question-type"]');
      expect(typeDisplay.text()).toContain('Multiple Select');
    });

    it('should format drag_drop type correctly', () => {
      const dragDropQuestion = QuestionFactory.createDragDrop();
      wrapper = createWrapper({ question: dragDropQuestion });
      const typeDisplay = wrapper.find('[data-testid="question-type"]');
      expect(typeDisplay.text()).toContain('Drag & Drop');
    });
  });

  describe('Component Lifecycle', () => {
    it('should reset state when question changes', async () => {
      // Select an answer
      await wrapper.findAll('[data-testid="answer-option"]')[0].trigger('click');
      expect(wrapper.classes()).toContain('answered');
      
      // Change question
      const newQuestion = QuestionFactory.create({ id: 999 });
      await wrapper.setProps({ question: newQuestion });
      
      // State should be reset
      expect(wrapper.classes()).not.toContain('answered');
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      answerOptions.forEach(option => {
        expect(option.classes()).not.toContain('selected');
      });
    });

    it('should expose methods for testing via defineExpose', () => {
      expect(wrapper.vm.selectAnswer).toBeDefined();
      expect(wrapper.vm.selectedAnswer).toBeDefined();
      expect(wrapper.vm.isCorrect).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty answers array gracefully', () => {
      const questionWithoutAnswers = { ...mockQuestion, answers: [] };
      wrapper = createWrapper({ question: questionWithoutAnswers });
      
      const answerOptions = wrapper.findAll('[data-testid="answer-option"]');
      expect(answerOptions).toHaveLength(0);
    });

    it('should handle questions with undefined tags', () => {
      const questionWithoutTags = { ...mockQuestion, tags: undefined };
      wrapper = createWrapper({ question: questionWithoutTags });
      
      expect(wrapper.find('[data-testid="question-tags"]').exists()).toBe(false);
    });

    it('should handle extreme difficulty values', () => {
      const extremeDifficultyQuestion = { ...mockQuestion, difficulty: 5 as const };
      wrapper = createWrapper({ question: extremeDifficultyQuestion });
      
      const difficulty = wrapper.find('[data-testid="question-difficulty"]');
      expect(difficulty.classes()).toContain('difficulty-5');
    });
  });

  describe('Snapshot Testing', () => {
    it('should match snapshot for multiple choice question', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot for multiple select question', () => {
      wrapper = createWrapper({ question: mockMultipleSelectQuestion });
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot when disabled', () => {
      wrapper = createWrapper({ disabled: true });
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot with selected answer', async () => {
      await wrapper.findAll('[data-testid="answer-option"]')[0].trigger('click');
      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});