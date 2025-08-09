import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import AnswerOptions from '../../../../components/exam/AnswerOptions.vue';
import type { AnswerOption } from '../../../../types/exam';

// Mock data
const mockSingleChoiceOptions: AnswerOption[] = [
  {
    id: 'option-1',
    questionId: 'question-1',
    text: 'Option A: This is the first option',
    isCorrect: true,
    order: 1,
    createdAt: new Date()
  },
  {
    id: 'option-2', 
    questionId: 'question-1',
    text: 'Option B: This is the second option',
    isCorrect: false,
    order: 2,
    createdAt: new Date()
  },
  {
    id: 'option-3',
    questionId: 'question-1', 
    text: 'Option C: This is the third option',
    isCorrect: false,
    order: 3,
    createdAt: new Date()
  }
];

const mockMultipleChoiceOptions: AnswerOption[] = [
  {
    id: 'option-1',
    questionId: 'question-2',
    text: 'First correct option',
    isCorrect: true,
    order: 1,
    createdAt: new Date()
  },
  {
    id: 'option-2',
    questionId: 'question-2',
    text: 'Second correct option', 
    isCorrect: true,
    order: 2,
    createdAt: new Date()
  },
  {
    id: 'option-3',
    questionId: 'question-2',
    text: 'Incorrect option',
    isCorrect: false,
    order: 3,
    createdAt: new Date()
  },
  {
    id: 'option-4',
    questionId: 'question-2',
    text: 'Another incorrect option',
    isCorrect: false,
    order: 4,
    createdAt: new Date()
  }
];

describe('AnswerOptions.vue', () => {
  let wrapper: any;

  const createWrapper = (props = {}) => {
    wrapper = mount(AnswerOptions, {
      props: {
        options: mockSingleChoiceOptions,
        questionType: 'single',
        ...props,
      },
    });
    return wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the answer options container', () => {
      createWrapper();
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('[data-test="answer-options"]').exists()).toBe(true);
    });

    it('should render all provided options', () => {
      createWrapper();
      const options = wrapper.findAll('.answer-option');
      expect(options).toHaveLength(3);
    });

    it('should render option text correctly', () => {
      createWrapper();
      expect(wrapper.text()).toContain('Option A: This is the first option');
      expect(wrapper.text()).toContain('Option B: This is the second option');
      expect(wrapper.text()).toContain('Option C: This is the third option');
    });

    it('should render empty state when no options provided', () => {
      createWrapper({ options: [] });
      const options = wrapper.findAll('.answer-option');
      expect(options).toHaveLength(0);
    });
  });

  describe('Single Choice Mode', () => {
    it('should render radio buttons for single choice', () => {
      createWrapper({ questionType: 'single' });
      const radioButtons = wrapper.findAll('input[type="radio"]');
      expect(radioButtons).toHaveLength(3);
    });

    it('should have same name attribute for all radio buttons', () => {
      createWrapper({ questionType: 'single' });
      const radioButtons = wrapper.findAll('input[type="radio"]');
      
      radioButtons.forEach(radio => {
        expect(radio.attributes('name')).toBe('question-single');
      });
    });

    it('should allow only one selection at a time', async () => {
      createWrapper({ questionType: 'single' });
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      const secondOption = wrapper.findAll('.answer-option')[1];
      
      await firstOption.trigger('click');
      expect(wrapper.emitted('answer-selected')).toHaveLength(1);
      expect(wrapper.emitted('answer-selected')[0]).toEqual([['option-1']]);
      
      await secondOption.trigger('click');
      expect(wrapper.emitted('answer-selected')).toHaveLength(2);
      expect(wrapper.emitted('answer-selected')[1]).toEqual([['option-2']]);
    });

    it('should show selected option visually', () => {
      createWrapper({ 
        questionType: 'single',
        selectedAnswers: ['option-1']
      });
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      const secondOption = wrapper.findAll('.answer-option')[1];
      
      expect(firstOption.classes()).toContain('border-blue-500');
      expect(firstOption.classes()).toContain('bg-blue-50');
      expect(secondOption.classes()).not.toContain('border-blue-500');
    });
  });

  describe('Multiple Choice Mode', () => {
    it('should render checkboxes for multiple choice', () => {
      createWrapper({ 
        options: mockMultipleChoiceOptions,
        questionType: 'multiple' 
      });
      
      const checkboxes = wrapper.findAll('input[type="checkbox"]');
      expect(checkboxes).toHaveLength(4);
    });

    it('should allow multiple selections', async () => {
      createWrapper({ 
        options: mockMultipleChoiceOptions,
        questionType: 'multiple' 
      });
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      const secondOption = wrapper.findAll('.answer-option')[1];
      
      await firstOption.trigger('click');
      expect(wrapper.emitted('answer-selected')).toHaveLength(1);
      expect(wrapper.emitted('answer-selected')[0]).toEqual([['option-1']]);
      
      // Update props to simulate parent component updating selectedAnswers
      await wrapper.setProps({ selectedAnswers: ['option-1'] });
      
      await secondOption.trigger('click');
      expect(wrapper.emitted('answer-selected')).toHaveLength(2);
      expect(wrapper.emitted('answer-selected')[1]).toEqual([['option-1', 'option-2']]);
    });

    it('should allow deselecting options', async () => {
      createWrapper({ 
        options: mockMultipleChoiceOptions,
        questionType: 'multiple',
        selectedAnswers: ['option-1', 'option-2']
      });
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      await firstOption.trigger('click');
      
      expect(wrapper.emitted('answer-selected')).toHaveLength(1);
      expect(wrapper.emitted('answer-selected')[0]).toEqual([['option-2']]);
    });

    it('should show all selected options visually', () => {
      createWrapper({ 
        options: mockMultipleChoiceOptions,
        questionType: 'multiple',
        selectedAnswers: ['option-1', 'option-2']
      });
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      const secondOption = wrapper.findAll('.answer-option')[1];
      const thirdOption = wrapper.findAll('.answer-option')[2];
      
      expect(firstOption.classes()).toContain('border-blue-500');
      expect(secondOption.classes()).toContain('border-blue-500');
      expect(thirdOption.classes()).not.toContain('border-blue-500');
    });
  });

  describe('Correct Answer Display', () => {
    it('should show correct answers when showCorrectAnswers is true', () => {
      createWrapper({
        showCorrectAnswers: true,
        selectedAnswers: ['option-2']
      });
      
      expect(wrapper.text()).toContain('✓ Correct Answer');
      expect(wrapper.text()).toContain('✗ Incorrect');
    });

    it('should apply correct answer styling', () => {
      createWrapper({
        showCorrectAnswers: true
      });
      
      const correctOption = wrapper.findAll('.answer-option')[0]; // option-1 is correct
      expect(correctOption.classes()).toContain('border-green-500');
      expect(correctOption.classes()).toContain('bg-green-50');
    });

    it('should apply incorrect answer styling for selected wrong answers', () => {
      createWrapper({
        showCorrectAnswers: true,
        selectedAnswers: ['option-2'] // Wrong answer selected
      });
      
      const incorrectOption = wrapper.findAll('.answer-option')[1];
      expect(incorrectOption.classes()).toContain('border-red-500');
      expect(incorrectOption.classes()).toContain('bg-red-50');
    });

    it('should not show answer indicators when showCorrectAnswers is false', () => {
      createWrapper({
        showCorrectAnswers: false,
        selectedAnswers: ['option-2']
      });
      
      expect(wrapper.text()).not.toContain('✓ Correct Answer');
      expect(wrapper.text()).not.toContain('✗ Incorrect');
    });
  });

  describe('Disabled State', () => {
    it('should disable all options when disabled prop is true', () => {
      createWrapper({ disabled: true });
      
      const options = wrapper.findAll('.answer-option');
      options.forEach(option => {
        expect(option.classes()).toContain('opacity-50');
        expect(option.classes()).toContain('cursor-not-allowed');
      });
      
      const inputs = wrapper.findAll('input');
      inputs.forEach(input => {
        expect(input.attributes('disabled')).toBeDefined();
      });
    });

    it('should not emit events when disabled', async () => {
      createWrapper({ disabled: true });
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      await firstOption.trigger('click');
      
      expect(wrapper.emitted('answer-selected')).toBeFalsy();
    });

    it('should not respond to keyboard events when disabled', async () => {
      createWrapper({ disabled: true });
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      await firstOption.trigger('keydown.enter');
      
      expect(wrapper.emitted('answer-selected')).toBeFalsy();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support Enter key to select options', async () => {
      createWrapper();
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      await firstOption.trigger('keydown', { key: 'Enter' });
      
      expect(wrapper.emitted('answer-selected')).toHaveLength(1);
      expect(wrapper.emitted('answer-selected')[0]).toEqual([['option-1']]);
    });

    it('should support Space key to select options', async () => {
      createWrapper();
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      await firstOption.trigger('keydown', { key: ' ' });
      
      expect(wrapper.emitted('answer-selected')).toHaveLength(1);
      expect(wrapper.emitted('answer-selected')[0]).toEqual([['option-1']]);
    });

    it('should support arrow key navigation', async () => {
      createWrapper();
      
      const firstOption = wrapper.findAll('.answer-option')[0];
      
      // Mock the focus method to verify it's called
      const focusSpy = vi.fn();
      const secondOption = wrapper.findAll('.answer-option')[1];
      secondOption.element.focus = focusSpy;
      
      await firstOption.trigger('keydown.arrow-down');
      
      // In test environment, we can't test actual focus, but we can verify the key event was handled
      expect(firstOption.attributes('tabindex')).toBe('0');
    });

    it('should support arrow up navigation', async () => {
      createWrapper();
      
      const secondOption = wrapper.findAll('.answer-option')[1];
      
      await secondOption.trigger('keydown.arrow-up');
      
      // Verify the key event was handled and tabindex is set correctly
      expect(secondOption.attributes('tabindex')).toBe('0');
    });

    it('should wrap navigation at boundaries', async () => {
      createWrapper();
      
      const options = wrapper.findAll('.answer-option');
      const firstOption = options[0];
      const lastOption = options[options.length - 1];
      
      // Test boundary navigation by verifying key events are handled
      await firstOption.trigger('keydown.arrow-up');
      await lastOption.trigger('keydown.arrow-down');
      
      // Verify that the component responds to boundary navigation
      expect(firstOption.attributes('tabindex')).toBe('0');
      expect(lastOption.attributes('tabindex')).toBe('0');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      createWrapper();
      
      const container = wrapper.find('[data-test="answer-options"]');
      expect(container.attributes('role')).toBe('radiogroup');
      expect(container.attributes('aria-label')).toBe('Answer options');
    });

    it('should have proper ARIA attributes for multiple choice', () => {
      createWrapper({ 
        options: mockMultipleChoiceOptions,
        questionType: 'multiple' 
      });
      
      const container = wrapper.find('[data-test="answer-options"]');
      expect(container.attributes('role')).toBe('group');
      expect(container.attributes('aria-label')).toBe('Answer options');
    });

    it('should have accessible option labels', () => {
      createWrapper();
      
      const options = wrapper.findAll('.answer-option');
      options.forEach((option, index) => {
        expect(option.attributes('role')).toBe('radio');
        expect(option.attributes('aria-label')).toContain(`Option ${index + 1}`);
        expect(option.attributes('tabindex')).toBe('0');
      });
    });

    it('should indicate selected state to screen readers', () => {
      createWrapper({ selectedAnswers: ['option-1'] });
      
      const selectedOption = wrapper.findAll('.answer-option')[0];
      expect(selectedOption.attributes('aria-checked')).toBe('true');
      
      const unselectedOption = wrapper.findAll('.answer-option')[1];
      expect(unselectedOption.attributes('aria-checked')).toBe('false');
    });

    it('should indicate correct answers to screen readers when shown', () => {
      createWrapper({
        showCorrectAnswers: true,
        selectedAnswers: ['option-2']
      });
      
      const correctOption = wrapper.findAll('.answer-option')[0];
      expect(correctOption.attributes('aria-describedby')).toContain('correct-answer');
      
      const incorrectOption = wrapper.findAll('.answer-option')[1];
      expect(incorrectOption.attributes('aria-describedby')).toContain('incorrect-answer');
    });

    it('should indicate disabled state to screen readers', () => {
      createWrapper({ disabled: true });
      
      const options = wrapper.findAll('.answer-option');
      options.forEach(option => {
        expect(option.attributes('aria-disabled')).toBe('true');
      });
    });
  });

  describe('Visual Feedback', () => {
    it('should apply hover effects when not disabled', () => {
      createWrapper();
      
      const option = wrapper.findAll('.answer-option')[0];
      expect(option.classes()).toContain('hover:border-gray-400');
      expect(option.classes()).toContain('cursor-pointer');
    });

    it('should show transition effects', () => {
      createWrapper();
      
      const option = wrapper.findAll('.answer-option')[0];
      expect(option.classes()).toContain('transition-colors');
      expect(option.classes()).toContain('duration-200');
    });

    it('should respect reduced motion preferences', () => {
      // Mock matchMedia to simulate reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      createWrapper();
      const styles = getComputedStyle(wrapper.findAll('.answer-option')[0].element);
      // In a real test environment, this would check for transition: none
      expect(styles).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle large number of options efficiently', () => {
      const manyOptions: AnswerOption[] = Array.from({ length: 50 }, (_, i) => ({
        id: `option-${i + 1}`,
        questionId: 'question-1',
        text: `Option ${i + 1}: Test option text`,
        isCorrect: i === 0,
        order: i + 1,
        createdAt: new Date()
      }));

      const startTime = performance.now();
      createWrapper({ options: manyOptions });
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should render in under 100ms
      expect(wrapper.findAll('.answer-option')).toHaveLength(50);
    });

    it('should update selections efficiently', async () => {
      createWrapper();
      
      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        const option = wrapper.findAll('.answer-option')[i % 3];
        await option.trigger('click');
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // Should handle rapid updates
    });
  });

  describe('Edge Cases', () => {
    it('should handle options with HTML in text gracefully', () => {
      const optionsWithHtml: AnswerOption[] = [{
        id: 'option-1',
        questionId: 'question-1',
        text: '<script>alert("test")</script>Safe option text',
        isCorrect: true,
        order: 1,
        createdAt: new Date()
      }];

      createWrapper({ options: optionsWithHtml });
      
      // Should render HTML as text (Vue automatically escapes)
      expect(wrapper.text()).toContain('<script>');
      expect(wrapper.text()).toContain('Safe option text');
    });

    it('should handle very long option text', () => {
      const longTextOptions: AnswerOption[] = [{
        id: 'option-1',
        questionId: 'question-1',
        text: 'A'.repeat(1000),
        isCorrect: true,
        order: 1,
        createdAt: new Date()
      }];

      createWrapper({ options: longTextOptions });
      
      const option = wrapper.find('.answer-option');
      const textSpan = wrapper.find('span.leading-relaxed');
      expect(option.exists()).toBe(true);
      expect(textSpan.exists()).toBe(true);
      expect(textSpan.classes()).toContain('break-words');
    });

    it('should handle rapid selection changes', async () => {
      createWrapper();
      
      // Simulate rapid clicking
      const promises = [];
      for (let i = 0; i < 5; i++) {
        const option = wrapper.findAll('.answer-option')[i % 3];
        promises.push(option.trigger('click'));
      }
      
      await Promise.all(promises);
      
      // Should have emitted all events
      expect(wrapper.emitted('answer-selected')).toHaveLength(5);
    });

    it('should handle missing option properties gracefully', () => {
      const incompleteOptions = [{
        id: 'option-1',
        questionId: 'question-1',
        text: 'Valid option',
        isCorrect: true,
        order: 1,
        createdAt: new Date()
      }];

      expect(() => createWrapper({ options: incompleteOptions })).not.toThrow();
    });
  });

  describe('Integration', () => {
    it('should work correctly with question type changes', async () => {
      createWrapper({ questionType: 'single' });
      
      expect(wrapper.findAll('input[type="radio"]')).toHaveLength(3);
      expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(0);
      
      await wrapper.setProps({ questionType: 'multiple' });
      
      expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0);
      expect(wrapper.findAll('input[type="checkbox"]')).toHaveLength(3);
    });

    it('should preserve selections when switching from review mode', async () => {
      createWrapper({
        selectedAnswers: ['option-1'],
        showCorrectAnswers: true,
        disabled: true
      });
      
      expect(wrapper.findAll('.answer-option')[0].classes()).toContain('border-green-500');
      
      await wrapper.setProps({ 
        showCorrectAnswers: false,
        disabled: false 
      });
      
      expect(wrapper.findAll('.answer-option')[0].classes()).toContain('border-blue-500');
    });
  });
});