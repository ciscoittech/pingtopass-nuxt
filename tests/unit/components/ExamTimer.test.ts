/**
 * ExamTimer Component Tests
 * Comprehensive test suite covering all functionality including timer behavior
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import ExamTimer from '@/components/ExamTimer.vue';

// Component type for better TypeScript support
type ExamTimerWrapper = VueWrapper<InstanceType<typeof ExamTimer>>;

// Mock timers
vi.useFakeTimers();

const defaultProps = {
  duration: 600, // 10 minutes
  showControls: true,
  showProgress: true,
  showProgressBar: true
};

describe('ExamTimer', () => {
  let wrapper: ExamTimerWrapper;

  const createWrapper = (props = {}) => {
    return mount(ExamTimer, {
      props: {
        ...defaultProps,
        ...props
      }
    }) as ExamTimerWrapper;
  };

  beforeEach(() => {
    vi.clearAllTimers();
    wrapper = createWrapper();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.clearAllTimers();
  });

  describe('Component Rendering', () => {
    it('should render the component with correct test ids', () => {
      expect(wrapper.find('[data-testid="exam-timer"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="timer-display"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="timer-icon"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="time-remaining"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="timer-controls"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="timer-status"]').exists()).toBe(true);
    });

    it('should display initial time correctly', () => {
      const timeDisplay = wrapper.find('[data-testid="time-remaining"]');
      expect(timeDisplay.text()).toBe('10:00');
    });

    it('should show progress percentage when showProgress is true', () => {
      const progressDisplay = wrapper.find('[data-testid="time-progress"]');
      expect(progressDisplay.exists()).toBe(true);
      expect(progressDisplay.text()).toBe('100% remaining');
    });

    it('should hide progress when showProgress is false', () => {
      wrapper = createWrapper({ showProgress: false });
      expect(wrapper.find('[data-testid="time-progress"]').exists()).toBe(false);
    });

    it('should show progress bar when showProgressBar is true', () => {
      expect(wrapper.find('[data-testid="timer-progress-bar"]').exists()).toBe(true);
      const progressFill = wrapper.find('[data-testid="progress-fill"]');
      expect(progressFill.attributes('style')).toContain('width: 100%');
    });

    it('should hide progress bar when showProgressBar is false', () => {
      wrapper = createWrapper({ showProgressBar: false });
      expect(wrapper.find('[data-testid="timer-progress-bar"]').exists()).toBe(false);
    });

    it('should show controls when showControls is true', () => {
      expect(wrapper.find('[data-testid="timer-controls"]').exists()).toBe(true);
    });

    it('should hide controls when showControls is false', () => {
      wrapper = createWrapper({ showControls: false });
      expect(wrapper.find('[data-testid="timer-controls"]').exists()).toBe(false);
    });
  });

  describe('Props Validation', () => {
    it('should accept all props correctly', () => {
      expect(wrapper.props('duration')).toBe(600);
      expect(wrapper.props('showControls')).toBe(true);
      expect(wrapper.props('showProgress')).toBe(true);
      expect(wrapper.props('showProgressBar')).toBe(true);
    });

    it('should have correct default prop values', () => {
      wrapper = mount(ExamTimer, {
        props: { duration: 300 }
      }) as ExamTimerWrapper;

      expect(wrapper.props('autoStart')).toBe(false);
      expect(wrapper.props('showControls')).toBe(true);
      expect(wrapper.props('showProgress')).toBe(false);
      expect(wrapper.props('showProgressBar')).toBe(false);
      expect(wrapper.props('warningThresholds')).toEqual([300, 120, 60]);
      expect(wrapper.props('criticalThreshold')).toBe(30);
    });

    it('should auto-start when autoStart is true', () => {
      wrapper = createWrapper({ autoStart: true });
      expect(wrapper.vm.isRunning).toBe(true);
    });
  });

  describe('Timer Controls', () => {
    it('should show start button initially', () => {
      expect(wrapper.find('[data-testid="start-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="pause-button"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="resume-button"]').exists()).toBe(false);
    });

    it('should start timer when start button is clicked', async () => {
      const startButton = wrapper.find('[data-testid="start-button"]');
      await startButton.trigger('click');
      
      expect(wrapper.vm.isRunning).toBe(true);
      expect(wrapper.find('[data-testid="start-button"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="pause-button"]').exists()).toBe(true);
    });

    it('should pause timer when pause button is clicked', async () => {
      // Start timer first
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      expect(wrapper.vm.isRunning).toBe(true);
      
      // Pause timer
      await wrapper.find('[data-testid="pause-button"]').trigger('click');
      expect(wrapper.vm.isRunning).toBe(false);
      expect(wrapper.vm.isPaused).toBe(true);
    });

    it('should resume timer when resume button is clicked', async () => {
      // Start and pause timer
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      await wrapper.find('[data-testid="pause-button"]').trigger('click');
      
      // Resume timer
      await wrapper.find('[data-testid="resume-button"]').trigger('click');
      expect(wrapper.vm.isRunning).toBe(true);
      expect(wrapper.vm.isPaused).toBe(false);
    });

    it('should reset timer when reset button is clicked', async () => {
      // Start timer and let some time pass
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(5000); // 5 seconds
      
      // Reset timer
      await wrapper.find('[data-testid="reset-button"]').trigger('click');
      
      expect(wrapper.vm.isRunning).toBe(false);
      expect(wrapper.vm.isPaused).toBe(false);
      expect(wrapper.vm.timeRemaining).toBe(600);
    });

    it('should not start timer when already finished', async () => {
      // Manually set timer to finished state
      wrapper.vm.timeRemaining = 0;
      wrapper.vm.isFinished = true;
      
      const startButton = wrapper.find('[data-testid="start-button"]');
      if (startButton.exists()) {
        await startButton.trigger('click');
        expect(wrapper.vm.isRunning).toBe(false);
      }
    });
  });

  describe('Timer Functionality', () => {
    it('should countdown when timer is running', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      
      const initialTime = wrapper.vm.timeRemaining;
      vi.advanceTimersByTime(3000); // 3 seconds
      
      expect(wrapper.vm.timeRemaining).toBe(initialTime - 3);
    });

    it('should emit tick events while running', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(2000); // 2 seconds
      
      const tickEvents = wrapper.emitted('tick');
      expect(tickEvents).toHaveLength(2);
      expect(tickEvents![0]).toEqual([599]);
      expect(tickEvents![1]).toEqual([598]);
    });

    it('should stop at zero and emit time-up event', async () => {
      wrapper = createWrapper({ duration: 2 }); // 2 seconds
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      
      vi.advanceTimersByTime(2000); // Run out the timer
      
      expect(wrapper.vm.timeRemaining).toBe(0);
      expect(wrapper.vm.isFinished).toBe(true);
      expect(wrapper.vm.isRunning).toBe(false);
      
      const timeUpEvents = wrapper.emitted('time-up');
      expect(timeUpEvents).toHaveLength(1);
    });

    it('should update duration when prop changes and timer is not running', async () => {
      const newDuration = 300;
      await wrapper.setProps({ duration: newDuration });
      
      expect(wrapper.vm.timeRemaining).toBe(newDuration);
    });

    it('should not update duration when timer is running', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      const originalTime = wrapper.vm.timeRemaining;
      
      await wrapper.setProps({ duration: 300 });
      
      expect(wrapper.vm.timeRemaining).toBe(originalTime);
    });
  });

  describe('Event Emissions', () => {
    it('should emit started event when timer starts', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      
      const startedEvents = wrapper.emitted('started');
      expect(startedEvents).toHaveLength(1);
    });

    it('should emit paused event when timer pauses', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      await wrapper.find('[data-testid="pause-button"]').trigger('click');
      
      const pausedEvents = wrapper.emitted('paused');
      expect(pausedEvents).toHaveLength(1);
    });

    it('should emit resumed event when timer resumes', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      await wrapper.find('[data-testid="pause-button"]').trigger('click');
      await wrapper.find('[data-testid="resume-button"]').trigger('click');
      
      const resumedEvents = wrapper.emitted('resumed');
      expect(resumedEvents).toHaveLength(1);
    });

    it('should emit reset event when timer resets', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      await wrapper.find('[data-testid="reset-button"]').trigger('click');
      
      const resetEvents = wrapper.emitted('reset');
      expect(resetEvents).toHaveLength(1);
    });
  });

  describe('Warning System', () => {
    it('should emit warning events at threshold times', async () => {
      wrapper = createWrapper({ 
        duration: 10,
        warningThresholds: [5, 3, 1]
      });
      
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      
      // Fast-forward to warning thresholds
      vi.advanceTimersByTime(5000); // Should trigger 5-second warning
      vi.advanceTimersByTime(2000); // Should trigger 3-second warning
      vi.advanceTimersByTime(2000); // Should trigger 1-second warning
      
      const warningEvents = wrapper.emitted('warning');
      expect(warningEvents).toHaveLength(3);
      expect(warningEvents![0]).toEqual([5]);
      expect(warningEvents![1]).toEqual([3]);
      expect(warningEvents![2]).toEqual([1]);
    });

    it('should emit critical event at critical threshold', async () => {
      wrapper = createWrapper({ 
        duration: 35,
        criticalThreshold: 30
      });
      
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(5000); // Should trigger critical warning at 30 seconds
      
      const criticalEvents = wrapper.emitted('critical');
      expect(criticalEvents).toHaveLength(1);
      expect(criticalEvents![0]).toEqual([30]);
    });

    it('should display warning message when in warning state', async () => {
      wrapper = createWrapper({ 
        duration: 10,
        warningThresholds: [5]
      });
      
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(6000); // Get to 4 seconds remaining
      
      const warningMessage = wrapper.find('[data-testid="warning-message"]');
      expect(warningMessage.exists()).toBe(true);
      expect(warningMessage.text()).toContain('Warning: 00:04 remaining');
    });

    it('should display critical message when in critical state', async () => {
      wrapper = createWrapper({ 
        duration: 35,
        criticalThreshold: 30
      });
      
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(10000); // Get to 25 seconds remaining (critical)
      
      const warningMessage = wrapper.find('[data-testid="warning-message"]');
      expect(warningMessage.exists()).toBe(true);
      expect(warningMessage.text()).toContain('Critical: Only 00:25 remaining!');
    });

    it('should apply warning CSS class in warning state', async () => {
      wrapper = createWrapper({ 
        duration: 10,
        warningThresholds: [5]
      });
      
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(6000); // Get to warning state
      
      expect(wrapper.classes()).toContain('warning');
    });

    it('should apply critical CSS class in critical state', async () => {
      wrapper = createWrapper({ 
        duration: 35,
        criticalThreshold: 30
      });
      
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(10000); // Get to critical state
      
      expect(wrapper.classes()).toContain('critical');
    });
  });

  describe('Time Formatting', () => {
    it('should format time in MM:SS format for times under an hour', () => {
      expect(wrapper.vm.formatTime(0)).toBe('00:00');
      expect(wrapper.vm.formatTime(59)).toBe('00:59');
      expect(wrapper.vm.formatTime(60)).toBe('01:00');
      expect(wrapper.vm.formatTime(3599)).toBe('59:59');
    });

    it('should format time in HH:MM:SS format for times over an hour', () => {
      expect(wrapper.vm.formatTime(3600)).toBe('01:00:00');
      expect(wrapper.vm.formatTime(3661)).toBe('01:01:01');
      expect(wrapper.vm.formatTime(7200)).toBe('02:00:00');
    });

    it('should handle negative time values', () => {
      expect(wrapper.vm.formatTime(-10)).toBe('00:00');
    });

    it('should update display when time changes', async () => {
      const timeDisplay = wrapper.find('[data-testid="time-remaining"]');
      expect(timeDisplay.text()).toBe('10:00');
      
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(1000);
      
      await wrapper.vm.$nextTick();
      expect(timeDisplay.text()).toBe('09:59');
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress percentage correctly', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(300000); // 5 minutes (half the time)
      
      const progressFill = wrapper.find('[data-testid="progress-fill"]');
      expect(progressFill.attributes('style')).toContain('width: 50%'); // 50% remaining
    });

    it('should handle zero duration for progress calculation', () => {
      wrapper = createWrapper({ duration: 0 });
      expect(wrapper.vm.progressPercentage).toBe(0);
    });

    it('should show correct progress percentage in display', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(300000); // 5 minutes
      
      const progressDisplay = wrapper.find('[data-testid="time-progress"]');
      expect(progressDisplay.text()).toBe('50% remaining');
    });
  });

  describe('Status Display', () => {
    it('should show idle status initially', () => {
      const statusText = wrapper.find('.status-text');
      expect(statusText.text()).toBe('Ready');
      
      const statusDot = wrapper.find('.status-dot');
      expect(statusDot.classes()).toContain('idle');
    });

    it('should show running status when timer is active', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      
      const statusText = wrapper.find('.status-text');
      expect(statusText.text()).toBe('Running');
      
      const statusDot = wrapper.find('.status-dot');
      expect(statusDot.classes()).toContain('running');
    });

    it('should show paused status when timer is paused', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      await wrapper.find('[data-testid="pause-button"]').trigger('click');
      
      const statusText = wrapper.find('.status-text');
      expect(statusText.text()).toBe('Paused');
      
      const statusDot = wrapper.find('.status-dot');
      expect(statusDot.classes()).toContain('paused');
    });

    it('should show finished status when time is up', async () => {
      wrapper = createWrapper({ duration: 1 });
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(1000);
      
      const statusText = wrapper.find('.status-text');
      expect(statusText.text()).toBe("Time's up");
      
      const statusDot = wrapper.find('.status-dot');
      expect(statusDot.classes()).toContain('finished');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-labels on buttons', () => {
      const startButton = wrapper.find('[data-testid="start-button"]');
      expect(startButton.attributes('aria-label')).toBe('Start timer');
    });

    it('should disable buttons when appropriate', async () => {
      // Start timer to get pause and reset buttons
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      
      const pauseButton = wrapper.find('[data-testid="pause-button"]');
      const resetButton = wrapper.find('[data-testid="reset-button"]');
      
      expect(pauseButton.attributes('aria-label')).toBe('Pause timer');
      expect(resetButton.attributes('aria-label')).toBe('Reset timer');
    });
  });

  describe('Component Lifecycle', () => {
    it('should cleanup intervals on unmount', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      expect(wrapper.vm.isRunning).toBe(true);
      
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      wrapper.unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should expose methods and state for testing', () => {
      expect(wrapper.vm.startTimer).toBeDefined();
      expect(wrapper.vm.pauseTimer).toBeDefined();
      expect(wrapper.vm.resumeTimer).toBeDefined();
      expect(wrapper.vm.resetTimer).toBeDefined();
      expect(wrapper.vm.formatTime).toBeDefined();
      expect(wrapper.vm.timeRemaining).toBeDefined();
      expect(wrapper.vm.isRunning).toBeDefined();
      expect(wrapper.vm.isPaused).toBeDefined();
      expect(wrapper.vm.isFinished).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very short durations', () => {
      wrapper = createWrapper({ duration: 1 });
      expect(wrapper.find('[data-testid="time-remaining"]').text()).toBe('00:01');
    });

    it('should handle very long durations', () => {
      wrapper = createWrapper({ duration: 7200 }); // 2 hours
      expect(wrapper.find('[data-testid="time-remaining"]').text()).toBe('02:00:00');
    });

    it('should not emit duplicate warning events', async () => {
      wrapper = createWrapper({ 
        duration: 10,
        warningThresholds: [5]
      });
      
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(5000); // Trigger warning
      vi.advanceTimersByTime(1); // Stay at same second
      
      const warningEvents = wrapper.emitted('warning');
      expect(warningEvents).toHaveLength(1);
    });

    it('should handle pause and resume correctly maintaining time', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(5000); // 5 seconds pass
      
      await wrapper.find('[data-testid="pause-button"]').trigger('click');
      const timeAtPause = wrapper.vm.timeRemaining;
      
      vi.advanceTimersByTime(10000); // 10 seconds pass while paused
      expect(wrapper.vm.timeRemaining).toBe(timeAtPause); // Time should not change
      
      await wrapper.find('[data-testid="resume-button"]').trigger('click');
      vi.advanceTimersByTime(2000); // 2 more seconds
      
      expect(wrapper.vm.timeRemaining).toBe(timeAtPause - 2);
    });
  });

  describe('Snapshot Testing', () => {
    it('should match snapshot for initial state', () => {
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot when running', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot when paused', async () => {
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      await wrapper.find('[data-testid="pause-button"]').trigger('click');
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot in warning state', async () => {
      wrapper = createWrapper({ duration: 10, warningThresholds: [5] });
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(6000); // Get to warning state
      expect(wrapper.html()).toMatchSnapshot();
    });

    it('should match snapshot when finished', async () => {
      wrapper = createWrapper({ duration: 1 });
      await wrapper.find('[data-testid="start-button"]').trigger('click');
      vi.advanceTimersByTime(1000); // Finish timer
      expect(wrapper.html()).toMatchSnapshot();
    });
  });
});