import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ExamCard from '../../../../components/exam/ExamCard.vue';
import type { ExamListItem } from '../../../../types/exam';

// Mock data
const mockExam: ExamListItem = {
  id: '1',
  code: 'CCNA',
  name: 'Cisco Certified Network Associate',
  vendor: 'Cisco',
  description: 'Foundation networking certification for IT professionals',
  questionCount: 120,
  timeLimit: 90,
  progress: {
    id: 'progress-1',
    userId: 'user-1', 
    examId: '1',
    questionsAnswered: 50,
    correctAnswers: 40,
    averageScore: 80.0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
};

const mockExamNoProgress: ExamListItem = {
  id: '2',
  code: 'AWS-SAA',
  name: 'AWS Solutions Architect Associate',
  vendor: 'Amazon Web Services',
  description: 'Cloud architecture and design certification',
  questionCount: 65,
  timeLimit: 130,
};

describe('ExamCard.vue', () => {
  let wrapper: any;

  const createWrapper = (props = {}) => {
    wrapper = mount(ExamCard, {
      props: {
        exam: mockExam,
        ...props,
      },
    });
    return wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render the exam card correctly', () => {
      createWrapper();
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('[data-test="exam-card"]').exists()).toBe(true);
    });

    it('should display exam basic information', () => {
      createWrapper();
      
      expect(wrapper.text()).toContain('CCNA');
      expect(wrapper.text()).toContain('Cisco Certified Network Associate');
      expect(wrapper.text()).toContain('Cisco');
      expect(wrapper.text()).toContain('Foundation networking certification');
    });

    it('should display exam statistics', () => {
      createWrapper();
      
      expect(wrapper.text()).toContain('120 questions');
      expect(wrapper.text()).toContain('90 min');
    });

    it('should not display time limit when not provided', () => {
      const examWithoutTime = { ...mockExam, timeLimit: undefined };
      createWrapper({ exam: examWithoutTime });
      
      expect(wrapper.text()).not.toContain('min');
    });

    it('should handle missing description gracefully', () => {
      const examNoDescription = { ...mockExam, description: undefined };
      createWrapper({ exam: examNoDescription });
      
      expect(wrapper.find('[data-test="exam-description"]').exists()).toBe(false);
    });
  });

  describe('Progress Display', () => {
    it('should show progress information when available', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="progress-section"]').exists()).toBe(true);
      expect(wrapper.text()).toContain('Progress');
      expect(wrapper.text()).toContain('42%'); // 50/120 * 100
      expect(wrapper.text()).toContain('50 answered');
      expect(wrapper.text()).toContain('Avg: 80%');
    });

    it('should not show progress when not available', () => {
      createWrapper({ exam: mockExamNoProgress });
      
      expect(wrapper.find('[data-test="progress-section"]').exists()).toBe(false);
    });

    it('should calculate progress percentage correctly', () => {
      createWrapper();
      
      const progressBar = wrapper.find('[data-test="progress-bar"]');
      expect(progressBar.exists()).toBe(true);
      
      // Should be 50/120 = 41.67% rounded to 42%
      const progressText = wrapper.find('[data-test="progress-percentage"]').text();
      expect(progressText).toBe('42%');
    });

    it('should handle zero progress correctly', () => {
      const examZeroProgress = {
        ...mockExam,
        progress: {
          ...mockExam.progress!,
          questionsAnswered: 0,
          correctAnswers: 0,
          averageScore: 0
        }
      };
      createWrapper({ exam: examZeroProgress });
      
      expect(wrapper.text()).toContain('0%');
      expect(wrapper.text()).toContain('0 answered');
    });
  });

  describe('Action Buttons', () => {
    it('should show "Start Study" button when no progress', () => {
      createWrapper({ exam: mockExamNoProgress });
      
      const actionButton = wrapper.find('[data-test="action-button"]');
      expect(actionButton.exists()).toBe(true);
      expect(actionButton.text()).toBe('Start Study');
    });

    it('should show "Continue Study" button when progress exists', () => {
      createWrapper();
      
      const actionButton = wrapper.find('[data-test="action-button"]');
      expect(actionButton.exists()).toBe(true);
      expect(actionButton.text()).toBe('Continue Study');
    });

    it('should emit start-exam event when action button clicked', async () => {
      createWrapper();
      
      const actionButton = wrapper.find('[data-test="action-button"]');
      await actionButton.trigger('click');
      
      expect(wrapper.emitted('start-exam')).toBeTruthy();
      expect(wrapper.emitted('start-exam')[0]).toEqual([mockExam]);
    });

    it('should show custom button text when provided', () => {
      createWrapper({ buttonText: 'Take Exam' });
      
      const actionButton = wrapper.find('[data-test="action-button"]');
      expect(actionButton.text()).toBe('Take Exam');
    });

    it('should disable button when loading prop is true', () => {
      createWrapper({ loading: true });
      
      const actionButton = wrapper.find('[data-test="action-button"]');
      expect(actionButton.element.disabled).toBe(true);
      expect(actionButton.classes()).toContain('cursor-not-allowed');
    });
  });

  describe('User Interactions', () => {
    it('should emit card-click event when card is clicked', async () => {
      createWrapper();
      
      const card = wrapper.find('[data-test="exam-card"]');
      await card.trigger('click');
      
      expect(wrapper.emitted('card-click')).toBeTruthy();
      expect(wrapper.emitted('card-click')[0]).toEqual([mockExam]);
    });

    it('should support keyboard navigation', async () => {
      createWrapper();
      
      const card = wrapper.find('[data-test="exam-card"]');
      await card.trigger('keydown.enter');
      
      expect(wrapper.emitted('card-click')).toBeTruthy();
      expect(wrapper.emitted('card-click')[0]).toEqual([mockExam]);
    });

    it('should support space key for activation', async () => {
      createWrapper();
      
      const card = wrapper.find('[data-test="exam-card"]');
      await card.trigger('keydown.space');
      
      expect(wrapper.emitted('card-click')).toBeTruthy();
    });

    it('should not bubble events when action button is clicked', async () => {
      createWrapper();
      
      const actionButton = wrapper.find('[data-test="action-button"]');
      await actionButton.trigger('click');
      
      // Only start-exam should be emitted, not card-click
      expect(wrapper.emitted('start-exam')).toBeTruthy();
      expect(wrapper.emitted('card-click')).toBeFalsy();
    });
  });

  describe('Styling and Variants', () => {
    it('should apply hover styles correctly', () => {
      createWrapper();
      
      const card = wrapper.find('[data-test="exam-card"]');
      expect(card.classes()).toContain('hover:shadow-lg');
      expect(card.classes()).toContain('transition-all');
    });

    it('should support compact variant', () => {
      createWrapper({ variant: 'compact' });
      
      const card = wrapper.find('[data-test="exam-card"]');
      expect(card.classes()).toContain('compact');
    });

    it('should support selected state', () => {
      createWrapper({ selected: true });
      
      const card = wrapper.find('[data-test="exam-card"]');
      expect(card.classes()).toContain('ring-2');
      expect(card.classes()).toContain('ring-blue-500');
    });

    it('should apply custom CSS classes', () => {
      createWrapper({ class: 'custom-exam-card' });
      
      const card = wrapper.find('[data-test="exam-card"]');
      expect(card.classes()).toContain('custom-exam-card');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      createWrapper();
      
      const card = wrapper.find('[data-test="exam-card"]');
      expect(card.attributes('role')).toBe('button');
      expect(card.attributes('tabindex')).toBe('0');
      expect(card.attributes('aria-label')).toContain('CCNA exam');
    });

    it('should have accessible button text', () => {
      createWrapper();
      
      const actionButton = wrapper.find('[data-test="action-button"]');
      expect(actionButton.attributes('aria-label')).toBeTruthy();
    });

    it('should support screen readers with proper labels', () => {
      createWrapper();
      
      expect(wrapper.find('[data-test="exam-code"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="exam-name"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="exam-vendor"]').exists()).toBe(true);
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when loading prop is true', () => {
      createWrapper({ loading: true });
      
      expect(wrapper.find('[data-test="loading-spinner"]').exists()).toBe(true);
      
      const actionButton = wrapper.find('[data-test="action-button"]');
      expect(actionButton.text()).toContain('Loading');
    });

    it('should hide action button content when loading', () => {
      createWrapper({ loading: true });
      
      const actionButton = wrapper.find('[data-test="action-button"]');
      expect(actionButton.text()).not.toContain('Continue Study');
      expect(actionButton.text()).toContain('Loading');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long exam names gracefully', () => {
      const longNameExam = {
        ...mockExam,
        name: 'Very Long Certification Name That Might Break The Layout If Not Handled Properly'
      };
      createWrapper({ exam: longNameExam });
      
      const examName = wrapper.find('[data-test="exam-name"]');
      expect(examName.classes()).toContain('line-clamp-2');
    });

    it('should handle missing exam data gracefully', () => {
      const minimalExam = {
        id: '3',
        code: 'TEST',
        name: 'Test Exam',
        vendor: 'Test Vendor',
        questionCount: 10
      };
      
      expect(() => createWrapper({ exam: minimalExam })).not.toThrow();
    });

    it('should handle zero question count', () => {
      const zeroQuestionsExam = { ...mockExam, questionCount: 0 };
      createWrapper({ exam: zeroQuestionsExam });
      
      expect(wrapper.text()).toContain('0 questions');
    });
  });
});