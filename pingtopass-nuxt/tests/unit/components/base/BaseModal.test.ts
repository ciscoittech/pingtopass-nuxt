import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import BaseModal from '../../../../components/base/BaseModal.vue';

// Mock focus trap for testing
const mockFocusTrap = {
  activate: vi.fn(),
  deactivate: vi.fn(),
  pause: vi.fn(),
  unpause: vi.fn(),
};

vi.mock('focus-trap', () => ({
  createFocusTrap: vi.fn(() => mockFocusTrap),
}));

describe('BaseModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock document.body.style for testing
    Object.defineProperty(document.body.style, 'overflow', {
      writable: true,
      value: '',
    });
  });

  describe('Basic Structure', () => {
    it('should render modal when open is true', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div data-test="modal-content">Modal Content</div>'
        }
      });
      
      expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(true);
      expect(wrapper.find('[data-test="modal-content"]').exists()).toBe(true);
    });

    it('should not render modal when open is false', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: false
        },
        slots: {
          default: '<div data-test="modal-content">Modal Content</div>'
        }
      });
      
      expect(wrapper.find('[data-test="modal-overlay"]').exists()).toBe(false);
      expect(wrapper.find('[data-test="modal-content"]').exists()).toBe(false);
    });

    it('should render header slot when provided', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          header: '<h2 data-test="modal-header">Modal Title</h2>',
          default: '<div>Modal Content</div>'
        }
      });
      
      expect(wrapper.find('[data-test="modal-header"]').exists()).toBe(true);
    });

    it('should render footer slot when provided', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>',
          footer: '<div data-test="modal-footer">Footer Content</div>'
        }
      });
      
      expect(wrapper.find('[data-test="modal-footer"]').exists()).toBe(true);
    });
  });

  describe('Close Functionality', () => {
    it('should emit close event when close button is clicked', async () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      await wrapper.find('[data-test="modal-close"]').trigger('click');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should emit close event when backdrop is clicked', async () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      await wrapper.find('[data-test="modal-overlay"]').trigger('click');
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should not emit close when modal content is clicked', async () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      await wrapper.find('[data-test="modal-content"]').trigger('click');
      
      expect(wrapper.emitted('close')).toBeFalsy();
    });

    it('should not emit close when closeOnBackdrop is false', async () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true,
          closeOnBackdrop: false
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      await wrapper.find('[data-test="modal-overlay"]').trigger('click');
      
      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  describe('Keyboard Interactions', () => {
    it('should emit close event when ESC key is pressed', async () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      await wrapper.trigger('keydown', { key: 'Escape' });
      
      expect(wrapper.emitted('close')).toBeTruthy();
    });

    it('should not emit close when ESC is pressed and closeOnEsc is false', async () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true,
          closeOnEsc: false
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      await wrapper.trigger('keydown', { key: 'Escape' });
      
      expect(wrapper.emitted('close')).toBeFalsy();
    });
  });

  describe('Size Variants', () => {
    it('should apply small size class', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true,
          size: 'sm'
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      const modalContent = wrapper.find('[data-test="modal-content"]');
      expect(modalContent.classes()).toContain('max-w-md');
    });

    it('should apply medium size class (default)', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      const modalContent = wrapper.find('[data-test="modal-content"]');
      expect(modalContent.classes()).toContain('max-w-lg');
    });

    it('should apply large size class', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true,
          size: 'lg'
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      const modalContent = wrapper.find('[data-test="modal-content"]');
      expect(modalContent.classes()).toContain('max-w-2xl');
    });

    it('should apply extra large size class', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true,
          size: 'xl'
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      const modalContent = wrapper.find('[data-test="modal-content"]');
      expect(modalContent.classes()).toContain('max-w-4xl');
    });
  });

  describe('Props', () => {
    it('should accept open prop', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Content</div>'
        }
      });
      
      expect(wrapper.props('open')).toBe(true);
    });

    it('should accept title prop', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true,
          title: 'Modal Title'
        },
        slots: {
          default: '<div>Content</div>'
        }
      });
      
      expect(wrapper.props('title')).toBe('Modal Title');
      expect(wrapper.text()).toContain('Modal Title');
    });

    it('should accept closeOnBackdrop prop', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true,
          closeOnBackdrop: false
        },
        slots: {
          default: '<div>Content</div>'
        }
      });
      
      expect(wrapper.props('closeOnBackdrop')).toBe(false);
    });

    it('should accept closeOnEsc prop', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true,
          closeOnEsc: false
        },
        slots: {
          default: '<div>Content</div>'
        }
      });
      
      expect(wrapper.props('closeOnEsc')).toBe(false);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true,
          title: 'Modal Title'
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      const modal = wrapper.find('[data-test="modal-content"]');
      expect(modal.attributes('role')).toBe('dialog');
      expect(modal.attributes('aria-modal')).toBe('true');
      expect(modal.attributes('aria-labelledby')).toBeDefined();
    });

    it('should set aria-hidden on overlay', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      const overlay = wrapper.find('[data-test="modal-overlay"]');
      expect(overlay.attributes('aria-hidden')).toBe('true');
    });

    it('should have close button with aria-label', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      const closeButton = wrapper.find('[data-test="modal-close"]');
      expect(closeButton.attributes('aria-label')).toBe('Close modal');
    });

    it('should set tabindex on modal content for focus management', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      const modal = wrapper.find('[data-test="modal-content"]');
      expect(modal.attributes('tabindex')).toBe('-1');
    });
  });

  describe('Transitions', () => {
    it('should apply fade transition classes', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      expect(wrapper.html()).toContain('transition-opacity');
    });

    it('should apply scale transition classes', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      expect(wrapper.html()).toContain('transition-all');
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when modal opens', () => {
      mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal closes', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      // Close the modal
      wrapper.setProps({ open: false });
      
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Event Handling', () => {
    it('should emit close event with event object', async () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      await wrapper.find('[data-test="modal-close"]').trigger('click');
      
      const closeEvents = wrapper.emitted('close');
      expect(closeEvents).toBeTruthy();
      expect(closeEvents![0]).toBeDefined();
    });

    it('should stop propagation on modal content clicks', async () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        },
        slots: {
          default: '<div>Modal Content</div>'
        }
      });
      
      const event = new Event('click');
      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');
      
      const modalContent = wrapper.find('[data-test="modal-content"]');
      modalContent.element.dispatchEvent(event);
      
      expect(stopPropagationSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing slots gracefully', () => {
      const wrapper = mount(BaseModal, {
        props: {
          open: true
        }
      });
      
      expect(wrapper.exists()).toBe(true);
    });

    it('should handle focus trap errors gracefully', () => {
      // Mock focus trap to throw error
      mockFocusTrap.activate.mockImplementationOnce(() => {
        throw new Error('Focus trap error');
      });
      
      expect(() => {
        mount(BaseModal, {
          props: {
            open: true
          },
          slots: {
            default: '<div>Content</div>'
          }
        });
      }).not.toThrow();
    });
  });
});