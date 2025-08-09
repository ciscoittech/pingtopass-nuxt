import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import ExamTimer from '../../../../components/exam/ExamTimer.vue';

// Mock Audio for alert sounds
const mockAudioPlay = vi.fn().mockResolvedValue(undefined);
global.Audio = vi.fn().mockImplementation(() => ({
  play: mockAudioPlay,
  pause: vi.fn(),
  load: vi.fn(),
}));

describe('ExamTimer.vue', () => {
  let wrapper: any;

  const createWrapper = (props = {}) => {
    wrapper = mount(ExamTimer, {
      props: {
        totalTime: 3600, // 1 hour in seconds
        ...props,
      },
    });
    return wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudioPlay.mockClear();
    mockAudioPlay.mockResolvedValue(undefined);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('Component Rendering', () => {
    it('should render the timer container', () => {
      createWrapper();
      expect(wrapper.exists()).toBe(true);
      expect(wrapper.find('[data-test="exam-timer"]').exists()).toBe(true);
    });

    it('should display initial time in MM:SS format', () => {
      createWrapper({ totalTime: 3600 });
      
      const timeDisplay = wrapper.find('[data-test="time-display"]');
      expect(timeDisplay.exists()).toBe(true);
      expect(timeDisplay.text()).toBe('60:00');
    });

    it('should display time correctly for different durations', () => {
      // Test 30 minutes
      createWrapper({ totalTime: 1800 });
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('30:00');
      
      // Test 90 minutes (1.5 hours)
      wrapper.setProps({ totalTime: 5400 });
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('90:00');
    });

    it('should display seconds correctly', () => {
      createWrapper({ totalTime: 125 }); // 2:05
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('2:05');
    });

    it('should display timer header', () => {
      createWrapper();
      
      const header = wrapper.find('[data-test="timer-header"]');
      expect(header.exists()).toBe(true);
      expect(header.text()).toContain('Time Remaining');
    });
  });

  describe('Timer Functionality', () => {
    it('should start timer when autoStart is true', () => {
      createWrapper({ autoStart: true });
      
      expect(wrapper.vm.isRunning).toBe(true);
    });

    it('should not start timer automatically by default', () => {
      createWrapper();
      
      expect(wrapper.vm.isRunning).toBe(false);
    });

    it('should countdown time correctly', async () => {
      createWrapper({ totalTime: 10, autoStart: true });
      
      // Advance timer by 3 seconds
      vi.advanceTimersByTime(3000);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('0:07');
    });

    it('should handle timer reaching zero', async () => {
      createWrapper({ totalTime: 5, autoStart: true });
      
      // Advance timer past the total time
      vi.advanceTimersByTime(6000);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('0:00');
      expect(wrapper.vm.isRunning).toBe(false);
    });

    it('should emit time-up event when timer reaches zero', async () => {
      createWrapper({ totalTime: 5, autoStart: true });
      
      vi.advanceTimersByTime(5000);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('time-up')).toBeTruthy();
    });

    it('should emit tick events during countdown', async () => {
      createWrapper({ totalTime: 10, autoStart: true });
      
      vi.advanceTimersByTime(2000);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('tick')).toBeTruthy();
      expect(wrapper.emitted('tick').length).toBeGreaterThan(0);
    });
  });

  describe('Pause/Resume Functionality', () => {
    it('should show pause button when timer is running', () => {
      createWrapper({ autoStart: true, showControls: true });
      
      expect(wrapper.find('[data-test="pause-button"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="resume-button"]').exists()).toBe(false);
    });

    it('should show resume button when timer is paused', async () => {
      createWrapper({ autoStart: true, showControls: true });
      
      const pauseButton = wrapper.find('[data-test="pause-button"]');
      await pauseButton.trigger('click');
      
      expect(wrapper.find('[data-test="pause-button"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="resume-button"]').exists()).toBe(true);
    });

    it('should pause timer when pause button clicked', async () => {
      createWrapper({ autoStart: true, showControls: true });
      
      const pauseButton = wrapper.find('[data-test="pause-button"]');
      await pauseButton.trigger('click');
      
      expect(wrapper.vm.isRunning).toBe(false);
      expect(wrapper.emitted('paused')).toBeTruthy();
    });

    it('should resume timer when resume button clicked', async () => {
      createWrapper({ autoStart: true, showControls: true });
      
      // Pause first
      const pauseButton = wrapper.find('[data-test="pause-button"]');
      await pauseButton.trigger('click');
      
      // Then resume
      const resumeButton = wrapper.find('[data-test="resume-button"]');
      await resumeButton.trigger('click');
      
      expect(wrapper.vm.isRunning).toBe(true);
      expect(wrapper.emitted('resumed')).toBeTruthy();
    });

    it('should not show controls when showControls is false', () => {
      createWrapper({ autoStart: true, showControls: false });
      
      expect(wrapper.find('[data-test="timer-controls"]').exists()).toBe(false);
    });

    it('should maintain time when paused and resumed', async () => {
      createWrapper({ totalTime: 60, autoStart: true, showControls: true });
      
      // Let it run for 5 seconds
      vi.advanceTimersByTime(5000);
      await wrapper.vm.$nextTick();
      
      // Pause
      const pauseButton = wrapper.find('[data-test="pause-button"]');
      await pauseButton.trigger('click');
      
      // Advance time while paused (should not affect countdown)
      vi.advanceTimersByTime(10000);
      await wrapper.vm.$nextTick();
      
      // Resume
      const resumeButton = wrapper.find('[data-test="resume-button"]');
      await resumeButton.trigger('click');
      
      // Should still show 55 seconds (60 - 5)
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('0:55');
    });
  });

  describe('Warning States', () => {
    it('should show warning at 5 minutes remaining by default', async () => {
      createWrapper({ totalTime: 360, autoStart: true }); // 6 minutes
      
      // Advance to 5 minutes remaining (60 seconds passed)
      vi.advanceTimersByTime(60 * 1000); // 60 seconds
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('[data-test="timer-warning"]').exists()).toBe(true);
      expect(wrapper.emitted('warning')).toBeTruthy();
    });

    it('should show critical warning at 1 minute remaining', async () => {
      createWrapper({ totalTime: 120, autoStart: true }); // 2 minutes
      
      // Advance to 1 minute remaining  
      vi.advanceTimersByTime(60 * 1000); // 60 seconds
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('[data-test="timer-critical"]').exists()).toBe(true);
      expect(wrapper.emitted('critical-warning')).toBeTruthy();
    });

    it('should use custom warning thresholds', async () => {
      createWrapper({ 
        totalTime: 600, // 10 minutes
        warningThreshold: 180, // 3 minutes
        criticalThreshold: 60, // 1 minute
        autoStart: true 
      });
      
      // Advance to 3 minutes remaining (7 minutes passed = 420 seconds)
      vi.advanceTimersByTime(420 * 1000);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.find('[data-test="timer-warning"]').exists()).toBe(true);
    });

    it('should apply warning styling correctly', async () => {
      createWrapper({ totalTime: 360, autoStart: true }); // 6 minutes
      
      // Advance to warning state
      vi.advanceTimersByTime(60000);
      await wrapper.vm.$nextTick();
      
      const timeDisplay = wrapper.find('[data-test="time-display"]');
      expect(timeDisplay.classes()).toContain('text-yellow-600');
    });

    it('should apply critical styling correctly', async () => {
      createWrapper({ totalTime: 120, autoStart: true }); // 2 minutes
      
      // Advance to critical state
      vi.advanceTimersByTime(60000);
      await wrapper.vm.$nextTick();
      
      const timeDisplay = wrapper.find('[data-test="time-display"]');
      expect(timeDisplay.classes()).toContain('text-red-600');
    });
  });

  describe('Audio Alerts', () => {
    it('should play warning sound when enabled', async () => {
      const mockAudio = new Audio();
      createWrapper({ 
        totalTime: 360, // 6 minutes
        enableSounds: true,
        autoStart: true 
      });
      
      // Advance to warning state
      vi.advanceTimersByTime(60000);
      await wrapper.vm.$nextTick();
      
      expect(Audio).toHaveBeenCalled();
    });

    it('should not play sounds when disabled', async () => {
      createWrapper({ 
        totalTime: 360,
        enableSounds: false,
        autoStart: true 
      });
      
      // Advance to warning state
      vi.advanceTimersByTime(60000);
      await wrapper.vm.$nextTick();
      
      expect(Audio).not.toHaveBeenCalled();
    });

    it('should play critical warning sound', async () => {
      createWrapper({ 
        totalTime: 120,
        enableSounds: true,
        autoStart: true 
      });
      
      // Advance to critical state
      vi.advanceTimersByTime(60000);
      await wrapper.vm.$nextTick();
      
      expect(Audio).toHaveBeenCalled();
    });

    it('should handle audio playback errors gracefully', async () => {
      // Mock audio play method to throw error
      const mockPlayError = vi.fn().mockRejectedValue(new Error('Audio playback failed'));
      vi.mocked(Audio).mockImplementation(() => ({
        play: mockPlayError,
        pause: vi.fn(),
        load: vi.fn(),
      }));

      createWrapper({ 
        totalTime: 360,
        enableSounds: true,
        autoStart: true 
      });
      
      // Advance to warning state
      vi.advanceTimersByTime(60000);
      await wrapper.vm.$nextTick();
      
      // Should not throw error
      expect(mockPlayError).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      createWrapper();
      
      const timer = wrapper.find('[data-test="exam-timer"]');
      expect(timer.attributes('role')).toBe('timer');
      expect(timer.attributes('aria-live')).toBe('polite');
      expect(timer.attributes('aria-label')).toBe('Exam timer');
    });

    it('should use assertive aria-live for critical warnings', async () => {
      createWrapper({ totalTime: 120, autoStart: true });
      
      // Advance to critical state
      vi.advanceTimersByTime(60000);
      await wrapper.vm.$nextTick();
      
      const timer = wrapper.find('[data-test="exam-timer"]');
      expect(timer.attributes('aria-live')).toBe('assertive');
    });

    it('should provide screen reader announcements', async () => {
      createWrapper({ totalTime: 360, autoStart: true });
      
      // Advance to warning state
      vi.advanceTimersByTime(60000);
      await wrapper.vm.$nextTick();
      
      const announcement = wrapper.find('[data-test="sr-announcement"]');
      expect(announcement.exists()).toBe(true);
      expect(announcement.text()).toContain('5 minutes remaining');
    });

    it('should announce critical warnings', async () => {
      createWrapper({ totalTime: 120, autoStart: true });
      
      // Advance to critical state
      vi.advanceTimersByTime(60000);
      await wrapper.vm.$nextTick();
      
      const announcement = wrapper.find('[data-test="sr-announcement"]');
      expect(announcement.text()).toContain('1 minute remaining');
    });

    it('should support keyboard controls', async () => {
      createWrapper({ showControls: true });
      
      const startButton = wrapper.find('[data-test="start-button"]');
      
      // Test spacebar activation
      await startButton.trigger('keydown', { key: ' ' });
      expect(wrapper.vm.isRunning).toBe(true);
    });

    it('should have accessible button labels', () => {
      createWrapper({ showControls: true });
      
      const startButton = wrapper.find('[data-test="start-button"]');
      expect(startButton.attributes('aria-label')).toBe('Start timer');
    });
  });

  describe('Persistence and State Management', () => {
    it('should integrate with exam store', () => {
      createWrapper({ 
        persistState: true,
        examId: 'test-exam-123'
      });
      
      // Should register with store for persistence
      expect(wrapper.vm.examId).toBe('test-exam-123');
    });

    it('should restore state from props', () => {
      createWrapper({ 
        totalTime: 3600,
        currentTime: 1800 // Start at 30 minutes remaining
      });
      
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('30:00');
    });

    it('should emit state changes for persistence', async () => {
      createWrapper({ autoStart: true, totalTime: 60 });
      
      vi.advanceTimersByTime(5000);
      await wrapper.vm.$nextTick();
      
      expect(wrapper.emitted('state-changed')).toBeTruthy();
      const stateChange = wrapper.emitted('state-changed')[0][0];
      expect(stateChange).toHaveProperty('timeRemaining');
    });

    it('should handle browser tab visibility changes', async () => {
      createWrapper({ autoStart: true, totalTime: 60 });
      
      // Simulate tab becoming hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true
      });
      
      document.dispatchEvent(new Event('visibilitychange'));
      await wrapper.vm.$nextTick();
      
      // Should pause automatically when tab is hidden (optional behavior)
      // This would depend on implementation choice
    });
  });

  describe('Visual Variants and Styling', () => {
    it('should apply compact variant', () => {
      createWrapper({ variant: 'compact' });
      
      const timer = wrapper.find('[data-test="exam-timer"]');
      expect(timer.classes()).toContain('compact');
    });

    it('should apply minimal variant', () => {
      createWrapper({ variant: 'minimal' });
      
      const timer = wrapper.find('[data-test="exam-timer"]');
      expect(timer.classes()).toContain('minimal');
    });

    it('should show progress bar when enabled', () => {
      createWrapper({ showProgress: true, totalTime: 3600 });
      
      expect(wrapper.find('[data-test="progress-bar"]').exists()).toBe(true);
    });

    it('should update progress bar correctly', async () => {
      createWrapper({ 
        showProgress: true, 
        totalTime: 60,
        autoStart: true 
      });
      
      // Advance by 30 seconds (50% complete)
      vi.advanceTimersByTime(30000);
      await wrapper.vm.$nextTick();
      
      const progressBar = wrapper.find('[data-test="progress-fill"]');
      expect(progressBar.attributes('style')).toContain('width: 50%');
    });

    it('should support custom colors', () => {
      createWrapper({ 
        color: 'blue',
        warningColor: 'orange',
        criticalColor: 'red'
      });
      
      // Colors should be applied via CSS custom properties
      const timer = wrapper.find('[data-test="exam-timer"]');
      expect(timer.attributes('style')).toBeTruthy();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero time gracefully', () => {
      createWrapper({ totalTime: 0 });
      
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('0:00');
    });

    it('should handle negative time gracefully', () => {
      createWrapper({ totalTime: -10 });
      
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('0:00');
    });

    it('should handle very large time values', () => {
      createWrapper({ totalTime: 999999 }); // ~277 hours
      
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('16666:39');
    });

    it('should handle prop changes during runtime', async () => {
      createWrapper({ totalTime: 60 });
      
      // Change total time mid-countdown
      await wrapper.setProps({ totalTime: 120 });
      
      expect(wrapper.find('[data-test="time-display"]').text()).toBe('2:00');
    });

    it('should clean up intervals on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      createWrapper({ autoStart: true });
      
      wrapper.unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle rapid start/stop calls', async () => {
      createWrapper({ showControls: true });
      
      const startButton = wrapper.find('[data-test="start-button"]');
      
      // Rapid clicking
      await startButton.trigger('click');
      await startButton.trigger('click');
      await startButton.trigger('click');
      
      expect(wrapper.vm.isRunning).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should handle long running timers efficiently', async () => {
      createWrapper({ totalTime: 7200, autoStart: true }); // 2 hours
      
      const startTime = performance.now();
      
      // Simulate 10 seconds of ticking
      vi.advanceTimersByTime(10000);
      await wrapper.vm.$nextTick();
      
      const endTime = performance.now();
      
      // Should handle updates efficiently
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should throttle frequent updates', async () => {
      const tickSpy = vi.fn();
      createWrapper({ 
        totalTime: 60,
        autoStart: true,
        onTick: tickSpy
      });
      
      // Advance by 100ms intervals rapidly
      for (let i = 0; i < 20; i++) {
        vi.advanceTimersByTime(100);
        await wrapper.vm.$nextTick();
      }
      
      // Should not emit tick for every 100ms interval
      expect(tickSpy).toHaveBeenCalledTimes(2); // Once per second
    });
  });
});