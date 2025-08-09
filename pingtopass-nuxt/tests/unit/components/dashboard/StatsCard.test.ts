/**
 * StatsCard Component Tests
 * Tests for dashboard statistics card component following TDD methodology
 * 
 * Requirements from screenshots:
 * - Three stat cards: Available Exams (0), Active Sessions (0), Tests Completed (0)
 * - Animated number counting from 0 to target value
 * - Loading states with skeleton animation
 * - Responsive design for mobile/desktop
 * - Icon display for each statistic type
 * - Hover effects and accessibility
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';

describe('StatsCard Component', () => {
  let wrapper: any;
  const mockProps = {
    title: 'Available Exams',
    value: 15,
    icon: 'book',
    color: 'blue',
    loading: false
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render the StatsCard component', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: mockProps
      });

      expect(wrapper.find('[data-test="stats-card"]').exists()).toBe(true);
    });

    it('should display the title correctly', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: mockProps
      });

      expect(wrapper.find('[data-test="stats-card-title"]').text()).toBe('Available Exams');
    });

    it('should display the icon when provided', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: mockProps
      });

      expect(wrapper.find('[data-test="stats-card-icon"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="stats-card-icon"]').classes()).toContain('icon-book');
    });

    it('should apply the correct color theme', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          color: 'green'
        }
      });

      expect(wrapper.find('[data-test="stats-card"]').classes()).toContain('stats-card--green');
    });
  });

  describe('Number Animation', () => {
    it('should animate number from 0 to target value', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          value: 50
        }
      });

      const valueElement = wrapper.find('[data-test="stats-card-value"]');
      
      // Initially should show 0 or start animation
      expect(parseInt(valueElement.text())).toBeLessThan(50);

      // Advance animation
      vi.advanceTimersByTime(1000);
      await wrapper.vm.$nextTick();

      // Should be animating up
      const currentValue = parseInt(valueElement.text());
      expect(currentValue).toBeGreaterThan(0);
      expect(currentValue).toBeLessThanOrEqual(50);

      // Complete animation
      vi.advanceTimersByTime(2000);
      await wrapper.vm.$nextTick();

      // Should reach target value
      expect(parseInt(valueElement.text())).toBe(50);
    });

    it('should handle zero values without animation issues', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          value: 0
        }
      });

      const valueElement = wrapper.find('[data-test="stats-card-value"]');
      expect(valueElement.text()).toBe('0');

      // Animation should complete quickly for zero
      vi.advanceTimersByTime(100);
      await wrapper.vm.$nextTick();
      
      expect(valueElement.text()).toBe('0');
    });

    it('should handle large numbers correctly', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          value: 1000
        }
      });

      // Complete animation
      vi.advanceTimersByTime(3000);
      await wrapper.vm.$nextTick();

      const valueElement = wrapper.find('[data-test="stats-card-value"]');
      expect(valueElement.text()).toBe('1,000'); // Should format with commas
    });

    it('should restart animation when value changes', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          value: 10
        }
      });

      // Complete first animation
      vi.advanceTimersByTime(2000);
      await wrapper.vm.$nextTick();

      expect(wrapper.find('[data-test="stats-card-value"]').text()).toBe('10');

      // Change value
      await wrapper.setProps({ value: 25 });

      // Should start new animation
      vi.advanceTimersByTime(100);
      await wrapper.vm.$nextTick();

      const currentValue = parseInt(wrapper.find('[data-test="stats-card-value"]').text());
      expect(currentValue).toBeGreaterThan(10);
    });

    it('should allow disabling animation via prop', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          value: 100,
          animated: false
        }
      });

      // Should immediately show target value without animation
      const valueElement = wrapper.find('[data-test="stats-card-value"]');
      expect(valueElement.text()).toBe('100');
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when loading prop is true', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          loading: true
        }
      });

      expect(wrapper.find('[data-test="stats-card-skeleton"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="stats-card-value"]').exists()).toBe(false);
    });

    it('should hide content when loading', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          loading: true
        }
      });

      expect(wrapper.find('[data-test="stats-card-content"]').classes()).toContain('hidden');
    });

    it('should show content when not loading', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          loading: false
        }
      });

      expect(wrapper.find('[data-test="stats-card-content"]').classes()).not.toContain('hidden');
      expect(wrapper.find('[data-test="stats-card-skeleton"]').exists()).toBe(false);
    });

    it('should animate skeleton during loading', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          loading: true
        }
      });

      const skeleton = wrapper.find('[data-test="stats-card-skeleton"]');
      expect(skeleton.classes()).toContain('animate-pulse');
    });
  });

  describe('Color Variants', () => {
    const colorVariants = [
      { color: 'blue', expectedClass: 'stats-card--blue' },
      { color: 'green', expectedClass: 'stats-card--green' },
      { color: 'yellow', expectedClass: 'stats-card--yellow' },
      { color: 'red', expectedClass: 'stats-card--red' },
      { color: 'purple', expectedClass: 'stats-card--purple' },
      { color: 'gray', expectedClass: 'stats-card--gray' }
    ];

    colorVariants.forEach(({ color, expectedClass }) => {
      it(`should apply ${color} color variant correctly`, async () => {
        const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
        
        wrapper = mount(StatsCard, {
          props: {
            ...mockProps,
            color
          }
        });

        expect(wrapper.find('[data-test="stats-card"]').classes()).toContain(expectedClass);
      });
    });

    it('should default to blue color when no color specified', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          title: 'Test',
          value: 10,
          icon: 'test'
          // No color specified
        }
      });

      expect(wrapper.find('[data-test="stats-card"]').classes()).toContain('stats-card--blue');
    });
  });

  describe('Icon Support', () => {
    const iconMappings = [
      { icon: 'book', expectedClass: 'icon-book' },
      { icon: 'users', expectedClass: 'icon-users' },
      { icon: 'chart', expectedClass: 'icon-chart' },
      { icon: 'check', expectedClass: 'icon-check' },
      { icon: 'clock', expectedClass: 'icon-clock' }
    ];

    iconMappings.forEach(({ icon, expectedClass }) => {
      it(`should display ${icon} icon correctly`, async () => {
        const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
        
        wrapper = mount(StatsCard, {
          props: {
            ...mockProps,
            icon
          }
        });

        const iconElement = wrapper.find('[data-test="stats-card-icon"]');
        expect(iconElement.classes()).toContain(expectedClass);
      });
    });

    it('should handle missing icon gracefully', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          title: 'Test',
          value: 10
          // No icon provided
        }
      });

      expect(wrapper.find('[data-test="stats-card-icon"]').exists()).toBe(false);
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-responsive classes', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: mockProps
      });

      const cardElement = wrapper.find('[data-test="stats-card"]');
      expect(cardElement.classes()).toContain('responsive-card');
    });

    it('should stack content properly on small screens', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          size: 'small'
        }
      });

      expect(wrapper.find('[data-test="stats-card"]').classes()).toContain('stats-card--small');
    });

    it('should support large size variant', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          size: 'large'
        }
      });

      expect(wrapper.find('[data-test="stats-card"]').classes()).toContain('stats-card--large');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: mockProps
      });

      const cardElement = wrapper.find('[data-test="stats-card"]');
      expect(cardElement.attributes('role')).toBe('region');
      expect(cardElement.attributes('aria-label')).toContain('Available Exams: 15');
    });

    it('should be keyboard accessible', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          clickable: true
        }
      });

      const cardElement = wrapper.find('[data-test="stats-card"]');
      expect(cardElement.attributes('tabindex')).toBe('0');
      expect(cardElement.attributes('role')).toBe('button');
    });

    it('should announce value changes to screen readers', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: mockProps
      });

      expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true);
    });

    it('should provide semantic markup', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: mockProps
      });

      expect(wrapper.find('h3[data-test="stats-card-title"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="stats-card-value"]').attributes('role')).toBe('status');
    });
  });

  describe('Interaction Behavior', () => {
    it('should emit click event when clickable', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          clickable: true
        }
      });

      await wrapper.find('[data-test="stats-card"]').trigger('click');
      expect(wrapper.emitted('click')).toBeTruthy();
    });

    it('should not emit click event when not clickable', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          clickable: false
        }
      });

      await wrapper.find('[data-test="stats-card"]').trigger('click');
      expect(wrapper.emitted('click')).toBeFalsy();
    });

    it('should show hover effects when clickable', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          clickable: true
        }
      });

      const cardElement = wrapper.find('[data-test="stats-card"]');
      expect(cardElement.classes()).toContain('cursor-pointer');
      expect(cardElement.classes()).toContain('hover:shadow-lg');
    });

    it('should handle keyboard interaction', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          clickable: true
        }
      });

      await wrapper.find('[data-test="stats-card"]').trigger('keydown.enter');
      expect(wrapper.emitted('click')).toBeTruthy();

      await wrapper.find('[data-test="stats-card"]').trigger('keydown.space');
      expect(wrapper.emitted('click')).toHaveLength(2);
    });
  });

  describe('Additional Properties', () => {
    it('should display subtitle when provided', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          subtitle: 'Last updated 5 minutes ago'
        }
      });

      expect(wrapper.find('[data-test="stats-card-subtitle"]').text()).toBe('Last updated 5 minutes ago');
    });

    it('should show percentage change indicator', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          change: 12.5,
          changeType: 'increase'
        }
      });

      const changeElement = wrapper.find('[data-test="stats-card-change"]');
      expect(changeElement.exists()).toBe(true);
      expect(changeElement.text()).toContain('+12.5%');
      expect(changeElement.classes()).toContain('text-green-500');
    });

    it('should show decrease indicator with red color', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          change: -8.3,
          changeType: 'decrease'
        }
      });

      const changeElement = wrapper.find('[data-test="stats-card-change"]');
      expect(changeElement.text()).toContain('-8.3%');
      expect(changeElement.classes()).toContain('text-red-500');
    });
  });

  describe('Performance', () => {
    it('should cleanup animation timers on unmount', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          value: 100
        }
      });

      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      wrapper.unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should throttle rapid value changes', async () => {
      const StatsCard = (await import('~/components/dashboard/StatsCard.vue')).default;
      
      wrapper = mount(StatsCard, {
        props: {
          ...mockProps,
          value: 10
        }
      });

      // Rapidly change values
      await wrapper.setProps({ value: 20 });
      await wrapper.setProps({ value: 30 });
      await wrapper.setProps({ value: 40 });

      // Should only trigger animation for the latest value
      vi.advanceTimersByTime(100);
      await wrapper.vm.$nextTick();

      const currentValue = parseInt(wrapper.find('[data-test="stats-card-value"]').text());
      expect(currentValue).toBeLessThanOrEqual(40);
    });
  });
});