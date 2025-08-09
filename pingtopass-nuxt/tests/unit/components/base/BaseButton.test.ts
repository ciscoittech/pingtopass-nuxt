import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseButton from '../../../../components/base/BaseButton.vue';

describe('BaseButton', () => {
  describe('Basic Functionality', () => {
    it('should render a button element', () => {
      const wrapper = mount(BaseButton);
      expect(wrapper.find('button').exists()).toBe(true);
    });
    
    it('should render slot content', () => {
      const wrapper = mount(BaseButton, {
        slots: {
          default: 'Click me'
        }
      });
      expect(wrapper.text()).toBe('Click me');
    });
    
    it('should emit click event when clicked', async () => {
      const wrapper = mount(BaseButton);
      await wrapper.trigger('click');
      expect(wrapper.emitted('click')).toHaveLength(1);
    });
    
    it('should accept variant prop', () => {
      const wrapper = mount(BaseButton, {
        props: { variant: 'primary' }
      });
      expect(wrapper.exists()).toBe(true);
    });
    
    it('should accept size prop', () => {
      const wrapper = mount(BaseButton, {
        props: { size: 'sm' }
      });
      expect(wrapper.exists()).toBe(true);
    });
  });
});