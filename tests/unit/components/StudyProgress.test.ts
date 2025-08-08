/**
 * StudyProgress Component Tests
 * Comprehensive test suite covering all functionality
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import StudyProgress from '@/components/StudyProgress.vue';

// Component type for better TypeScript support
type StudyProgressWrapper = VueWrapper<InstanceType<typeof StudyProgress>>;

const defaultProps = {
  currentProgress: 5,
  totalQuestions: 10,
  timeElapsed: 300, // 5 minutes
  correctAnswers: 3,
  incorrectAnswers: 2
};

describe('StudyProgress', () => {
  let wrapper: StudyProgressWrapper;

  const createWrapper = (props = {}) => {
    return mount(StudyProgress, {
      props: {
        ...defaultProps,
        ...props
      }
    }) as StudyProgressWrapper;
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
      expect(wrapper.find('[data-testid="study-progress"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="progress-title"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="session-status"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="progress-stats"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="progress-bar-container"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="time-info"]').exists()).toBe(true);
    });

    it('should display progress title correctly', () => {
      const title = wrapper.find('[data-testid="progress-title"]');
      expect(title.text()).toBe('Study Progress');
    });

    it('should display session status correctly', () => {
      const status = wrapper.find('[data-testid="session-status"]');
      expect(status.text()).toBe('In Progress');
      expect(status.classes()).toContain('active');
    });

    it('should display progress statistics correctly', () => {
      const stats = wrapper.find('[data-testid="progress-stats"]');
      const text = stats.text();
      
      expect(text).toContain('5 of 10 questions');
      expect(text).toContain('50% complete');
    });

    it('should show detailed stats by default', () => {
      expect(wrapper.find('[data-testid="detailed-stats"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="correct-count"]').text()).toBe('3');
      expect(wrapper.find('[data-testid="incorrect-count"]').text()).toBe('2');
      expect(wrapper.find('[data-testid="accuracy-rate"]').text()).toBe('60%');
      expect(wrapper.find('[data-testid="average-time"]').text()).toBe('60s');
    });
  });

  describe('Props Validation', () => {
    it('should accept all required props', () => {
      expect(wrapper.props('currentProgress')).toBe(5);
      expect(wrapper.props('totalQuestions')).toBe(10);
      expect(wrapper.props('timeElapsed')).toBe(300);
    });

    it('should have correct default prop values', () => {
      wrapper = mount(StudyProgress, {
        props: { currentProgress: 1, totalQuestions: 10, timeElapsed: 60 }
      }) as StudyProgressWrapper;

      expect(wrapper.props('correctAnswers')).toBe(0);
      expect(wrapper.props('incorrectAnswers')).toBe(0);
      expect(wrapper.props('showDetailedStats')).toBe(true);
      expect(wrapper.props('showActions')).toBe(false);
      expect(wrapper.props('sessionStatus')).toBe('active');
    });

    it('should hide detailed stats when prop is false', () => {
      wrapper = createWrapper({ showDetailedStats: false });
      expect(wrapper.find('[data-testid="detailed-stats"]').exists()).toBe(false);
    });

    it('should show action buttons when showActions is true', () => {
      wrapper = createWrapper({ 
        showActions: true, 
        canPause: true, 
        canFinish: true 
      });
      
      expect(wrapper.find('[data-testid="progress-actions"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="pause-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="finish-button"]').exists()).toBe(true);
    });
  });

  describe('Progress Calculations', () => {
    it('should calculate progress percentage correctly', () => {
      const progressBar = wrapper.find('[data-testid="progress-bar-fill"]');
      expect(progressBar.attributes('style')).toContain('width: 50%');
      expect(progressBar.attributes('aria-valuenow')).toBe('50');
    });

    it('should handle zero total questions', () => {
      wrapper = createWrapper({ totalQuestions: 0 });
      
      const progressBar = wrapper.find('[data-testid="progress-bar-fill"]');
      expect(progressBar.attributes('style')).toContain('width: 0%');
    });

    it('should calculate accuracy rate correctly', () => {
      expect(wrapper.find('[data-testid="accuracy-rate"]').text()).toBe('60%');
    });

    it('should handle zero answered questions for accuracy', () => {
      wrapper = createWrapper({ correctAnswers: 0, incorrectAnswers: 0 });
      expect(wrapper.find('[data-testid="accuracy-rate"]').text()).toBe('0%');
    });

    it('should calculate average time per question', () => {
      // 300 seconds / 5 questions = 60 seconds per question
      expect(wrapper.find('[data-testid="average-time"]').text()).toBe('60s');
    });

    it('should handle zero progress for average time', () => {
      wrapper = createWrapper({ currentProgress: 0 });
      expect(wrapper.find('[data-testid="average-time"]').text()).toBe('0s');
    });
  });

  describe('Time Formatting', () => {
    it('should format elapsed time correctly in minutes and seconds', () => {
      const timeElapsed = wrapper.find('[data-testid="time-elapsed"]');
      expect(timeElapsed.text()).toContain('05:00');
    });

    it('should format time with hours when needed', () => {
      wrapper = createWrapper({ timeElapsed: 3665 }); // 1 hour, 1 minute, 5 seconds
      const timeElapsed = wrapper.find('[data-testid="time-elapsed"]');
      expect(timeElapsed.text()).toContain('01:01:05');
    });

    it('should estimate remaining time correctly', () => {
      // 300 seconds / 5 questions = 60 seconds per question
      // 5 remaining questions * 60 seconds = 300 seconds = 05:00
      const timeRemaining = wrapper.find('[data-testid="time-remaining"]');
      expect(timeRemaining.text()).toContain('05:00');
    });

    it('should show placeholder when no progress made', () => {
      wrapper = createWrapper({ currentProgress: 0 });
      const timeRemaining = wrapper.find('[data-testid="time-remaining"]');
      expect(timeRemaining.text()).toContain('--:--');
    });

    it('should handle negative time values', () => {
      // Test the exposed formatTime method
      expect(wrapper.vm.formatTime(-10)).toBe('00:00');
    });
  });

  describe('Session Status', () => {
    it('should display active status correctly', () => {
      wrapper = createWrapper({ sessionStatus: 'active' });
      const status = wrapper.find('[data-testid="session-status"]');
      
      expect(status.text()).toBe('In Progress');
      expect(status.classes()).toContain('active');
    });

    it('should display paused status correctly', () => {
      wrapper = createWrapper({ sessionStatus: 'paused' });
      const status = wrapper.find('[data-testid="session-status"]');
      
      expect(status.text()).toBe('Paused');
      expect(status.classes()).toContain('paused');
    });

    it('should display completed status correctly', () => {
      wrapper = createWrapper({ sessionStatus: 'completed' });
      const status = wrapper.find('[data-testid="session-status"]');
      
      expect(status.text()).toBe('Completed');
      expect(status.classes()).toContain('completed');
    });

    it('should display idle status correctly', () => {
      wrapper = createWrapper({ sessionStatus: 'idle' });
      const status = wrapper.find('[data-testid="session-status"]');
      
      expect(status.text()).toBe('Ready');
      expect(status.classes()).toContain('idle');
    });
  });

  describe('Progress Bar and Milestones', () => {
    it('should render progress milestones correctly', () => {
      const milestones = wrapper.findAll('[data-testid="progress-milestone"]');
      expect(milestones).toHaveLength(3); // Default milestones: [25, 50, 75]
    });

    it('should mark reached milestones correctly', () => {
      wrapper = createWrapper({ currentProgress: 8, totalQuestions: 10 }); // 80% progress
      const milestones = wrapper.findAll('[data-testid="progress-milestone"]');
      
      // 25%, 50%, 75% should be reached (80% > 75%)
      expect(milestones[0].classes()).toContain('reached'); // 25%
      expect(milestones[1].classes()).toContain('reached'); // 50%
      expect(milestones[2].classes()).toContain('reached'); // 75%
    });

    it('should position milestones correctly', () => {
      const milestones = wrapper.findAll('[data-testid="progress-milestone"]');
      expect(milestones[0].attributes('style')).toContain('left: 25%');
      expect(milestones[1].attributes('style')).toContain('left: 50%');
      expect(milestones[2].attributes('style')).toContain('left: 75%');
    });

    it('should accept custom milestones', () => {
      wrapper = createWrapper({ milestones: [20, 40, 60, 80] });
      const milestones = wrapper.findAll('[data-testid="progress-milestone"]');
      expect(milestones).toHaveLength(4);
    });
  });

  describe('Action Buttons', () => {
    it('should show pause button when canPause is true', () => {
      wrapper = createWrapper({ showActions: true, canPause: true });
      expect(wrapper.find('[data-testid="pause-button"]').exists()).toBe(true);
    });

    it('should show resume button when canResume is true', () => {
      wrapper = createWrapper({ showActions: true, canResume: true });
      expect(wrapper.find('[data-testid="resume-button"]').exists()).toBe(true);
    });

    it('should show finish button when canFinish is true', () => {
      wrapper = createWrapper({ showActions: true, canFinish: true });
      expect(wrapper.find('[data-testid="finish-button"]').exists()).toBe(true);
    });

    it('should emit pause event when pause button is clicked', async () => {
      wrapper = createWrapper({ showActions: true, canPause: true });
      await wrapper.find('[data-testid="pause-button"]').trigger('click');
      
      const emittedEvents = wrapper.emitted('pause');
      expect(emittedEvents).toHaveLength(1);
    });

    it('should emit resume event when resume button is clicked', async () => {
      wrapper = createWrapper({ showActions: true, canResume: true });
      await wrapper.find('[data-testid="resume-button"]').trigger('click');
      
      const emittedEvents = wrapper.emitted('resume');
      expect(emittedEvents).toHaveLength(1);
    });

    it('should emit finish event when finish button is clicked', async () => {
      wrapper = createWrapper({ showActions: true, canFinish: true });
      await wrapper.find('[data-testid="finish-button"]').trigger('click');
      
      const emittedEvents = wrapper.emitted('finish');
      expect(emittedEvents).toHaveLength(1);
    });
  });

  describe('Milestone Events', () => {
    it('should emit milestone-reached event when milestone is achieved', async () => {
      // Start at 20% progress
      wrapper = createWrapper({ currentProgress: 2, totalQuestions: 10 });
      
      // Progress to 30% (should trigger 25% milestone)
      await wrapper.setProps({ currentProgress: 3 });
      
      const emittedEvents = wrapper.emitted('milestone-reached');
      expect(emittedEvents).toHaveLength(1);
      expect(emittedEvents![0]).toEqual([25]);
    });

    it('should emit multiple milestone events when crossing multiple milestones', async () => {
      // Start at 10% progress
      wrapper = createWrapper({ currentProgress: 1, totalQuestions: 10 });
      
      // Jump to 80% (should trigger 25%, 50%, 75% milestones)
      await wrapper.setProps({ currentProgress: 8 });
      
      const emittedEvents = wrapper.emitted('milestone-reached');
      expect(emittedEvents).toHaveLength(3);
      expect(emittedEvents![0]).toEqual([25]);
      expect(emittedEvents![1]).toEqual([50]);
      expect(emittedEvents![2]).toEqual([75]);
    });

    it('should not emit milestone events when going backwards', async () => {
      // Start at 80% progress
      wrapper = createWrapper({ currentProgress: 8, totalQuestions: 10 });
      
      // Go back to 40%
      await wrapper.setProps({ currentProgress: 4 });
      
      const emittedEvents = wrapper.emitted('milestone-reached');
      expect(emittedEvents).toBeFalsy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes on progress bar', () => {
      const progressBar = wrapper.find('[data-testid="progress-bar-fill"]');
      
      expect(progressBar.attributes('role')).toBe('progressbar');
      expect(progressBar.attributes('aria-valuenow')).toBe('50');
      expect(progressBar.attributes('aria-valuemin')).toBe('0');
      expect(progressBar.attributes('aria-valuemax')).toBe('100');
      expect(progressBar.attributes('aria-label')).toContain('Study progress: 50% complete');
    });

    it('should update ARIA attributes when progress changes', async () => {
      await wrapper.setProps({ currentProgress: 7 }); // 70% progress
      
      const progressBar = wrapper.find('[data-testid="progress-bar-fill"]');
      expect(progressBar.attributes('aria-valuenow')).toBe('70');
      expect(progressBar.attributes('aria-label')).toContain('Study progress: 70% complete');
    });
  });

  describe('Responsive Design', () => {
    it('should render all components for mobile view', () => {
      // This test verifies that the component structure supports responsive design
      expect(wrapper.find('.progress-header').exists()).toBe(true);
      expect(wrapper.find('.progress-stats').exists()).toBe(true);
      expect(wrapper.find('.time-info').exists()).toBe(true);
      expect(wrapper.find('.detailed-stats').exists()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle 100% completion', () => {
      wrapper = createWrapper({ currentProgress: 10, totalQuestions: 10 });
      
      const progressBar = wrapper.find('[data-testid="progress-bar-fill"]');
      expect(progressBar.attributes('style')).toContain('width: 100%');
      
      const stats = wrapper.find('[data-testid="progress-stats"]');
      expect(stats.text()).toContain('100% complete');
    });

    it('should handle zero progress', () => {
      wrapper = createWrapper({ currentProgress: 0, totalQuestions: 10 });
      
      const progressBar = wrapper.find('[data-testid="progress-bar-fill"]');
      expect(progressBar.attributes('style')).toContain('width: 0%');
      
      const stats = wrapper.find('[data-testid="progress-stats"]');
      expect(stats.text()).toContain('0% complete');
    });

    it('should handle large numbers', () => {
      wrapper = createWrapper({ 
        currentProgress: 500, 
        totalQuestions: 1000,
        timeElapsed: 36000 // 10 hours
      });
      
      const stats = wrapper.find('[data-testid="progress-stats"]');
      expect(stats.text()).toContain('500 of 1000 questions');
      expect(stats.text()).toContain('50% complete');
      
      const timeElapsed = wrapper.find('[data-testid="time-elapsed"]');
      expect(timeElapsed.text()).toContain('10:00:00');
    });

    it('should handle very short time values', () => {
      wrapper = createWrapper({ timeElapsed: 5 });
      
      const timeElapsed = wrapper.find('[data-testid="time-elapsed"]');
      expect(timeElapsed.text()).toContain('00:05');
    });
  });

  describe('Component Methods', () => {
    it('should expose formatTime method', () => {
      expect(wrapper.vm.formatTime).toBeDefined();
      expect(typeof wrapper.vm.formatTime).toBe('function');
    });

    it('should expose computed properties for testing', () => {
      expect(wrapper.vm.progressPercentage).toBe(50);
      expect(wrapper.vm.accuracyRate).toBe(60);
      expect(wrapper.vm.averageTimePerQuestion).toBe(60);
    });

    it('should format time correctly through exposed method', () => {
      expect(wrapper.vm.formatTime(0)).toBe('00:00');
      expect(wrapper.vm.formatTime(59)).toBe('00:59');
      expect(wrapper.vm.formatTime(60)).toBe('01:00');
      expect(wrapper.vm.formatTime(3661)).toBe('01:01:01');
    });
  });

  describe('Snapshot Testing', () => {
    it('should match snapshot for default state', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot for completed state', () => {
      wrapper = createWrapper({ 
        currentProgress: 10, 
        totalQuestions: 10, 
        sessionStatus: 'completed' 
      });
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot with actions enabled', () => {
      wrapper = createWrapper({ 
        showActions: true, 
        canPause: true, 
        canFinish: true 
      });
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot without detailed stats', () => {
      wrapper = createWrapper({ showDetailedStats: false });
      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});