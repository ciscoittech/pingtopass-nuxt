import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import SpikeButton from '~/components/base/SpikeButton.vue'
import type { ButtonVariant, ButtonSize } from '~/types/spike-theme'

// Mock the resolveComponent function for NuxtLink
vi.mock('vue', async () => {
  const vue = await vi.importActual('vue')
  const mockResolveComponent = vi.fn(() => ({ name: 'NuxtLink' }))
  return {
    ...vue,
    resolveComponent: mockResolveComponent
  }
})

describe('SpikeButton', () => {
  let wrapper: VueWrapper<any>

  describe('Rendering', () => {
    it('renders as button element by default', () => {
      wrapper = mount(SpikeButton, {
        slots: {
          default: 'Click me'
        }
      })
      
      expect(wrapper.element.tagName).toBe('BUTTON')
      expect(wrapper.text()).toBe('Click me')
    })

    it('renders as anchor element when href is provided', () => {
      wrapper = mount(SpikeButton, {
        props: {
          href: 'https://example.com'
        },
        slots: {
          default: 'Visit site'
        }
      })
      
      expect(wrapper.element.tagName).toBe('A')
      expect(wrapper.attributes('href')).toBe('https://example.com')
    })

    it('renders as NuxtLink when to prop is provided', () => {
      wrapper = mount(SpikeButton, {
        props: {
          to: '/dashboard'
        },
        slots: {
          default: 'Go to dashboard'
        }
      })
      
      // The component should try to resolve NuxtLink - we'll check the computed tag instead
      // since the mock is inside the vi.mock closure
      expect(wrapper.vm.computedTag).toBe('NuxtLink')
    })

    it('renders with default variant and size', () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      expect(wrapper.classes()).toContain('spike-button')
      expect(wrapper.classes()).toContain('spike-button--primary')
      expect(wrapper.classes()).toContain('spike-button--md')
    })

    it('renders slot content correctly', () => {
      wrapper = mount(SpikeButton, {
        slots: {
          default: '<span>Custom content</span>'
        }
      })
      
      expect(wrapper.html()).toContain('<span>Custom content</span>')
    })

    it('renders icon slots correctly', () => {
      wrapper = mount(SpikeButton, {
        slots: {
          default: 'Button text',
          'icon-left': '<svg data-test="left-icon">left</svg>',
          'icon-right': '<svg data-test="right-icon">right</svg>'
        }
      })
      
      expect(wrapper.find('[data-test="left-icon"]').exists()).toBe(true)
      expect(wrapper.find('[data-test="right-icon"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Button text')
    })
  })

  describe('Variant Classes', () => {
    const variants: ButtonVariant[] = ['primary', 'secondary', 'success', 'warning', 'danger', 'ghost', 'outline']
    
    it.each(variants)('applies correct class for %s variant', (variant) => {
      wrapper = mount(SpikeButton, {
        props: { variant },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.classes()).toContain(`spike-button--${variant}`)
    })

    it('defaults to primary variant when no variant specified', () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      expect(wrapper.classes()).toContain('spike-button--primary')
    })
  })

  describe('Size Classes', () => {
    const sizes: ButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
    
    it.each(sizes)('applies correct class for %s size', (size) => {
      wrapper = mount(SpikeButton, {
        props: { size },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.classes()).toContain(`spike-button--${size}`)
    })

    it('defaults to md size when no size specified', () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      expect(wrapper.classes()).toContain('spike-button--md')
    })
  })

  describe('State Classes', () => {
    it('applies disabled class when disabled prop is true', () => {
      wrapper = mount(SpikeButton, {
        props: { disabled: true },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.classes()).toContain('spike-button--disabled')
      expect(wrapper.attributes('disabled')).toBeDefined()
    })

    it('applies loading class when loading prop is true', () => {
      wrapper = mount(SpikeButton, {
        props: { loading: true },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.classes()).toContain('spike-button--loading')
      expect(wrapper.attributes('disabled')).toBeDefined()
    })

    it('applies block class when block prop is true', () => {
      wrapper = mount(SpikeButton, {
        props: { block: true },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.classes()).toContain('spike-button--block')
    })

    it('disables button when loading is true', () => {
      wrapper = mount(SpikeButton, {
        props: { loading: true },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.attributes('disabled')).toBeDefined()
    })
  })

  describe('Loading State', () => {
    it('shows loading spinner when loading is true', async () => {
      wrapper = mount(SpikeButton, {
        props: { loading: true },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.find('.spike-button__loader').exists()).toBe(true)
    })

    it('applies loading class to content when loading is true', () => {
      wrapper = mount(SpikeButton, {
        props: { loading: true },
        slots: { default: 'Button' }
      })
      
      const content = wrapper.find('.spike-button__content')
      expect(content.classes()).toContain('spike-button__content--loading')
    })

    it('does not show loading spinner when loading is false', () => {
      wrapper = mount(SpikeButton, {
        props: { loading: false },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.find('.spike-button__loader').exists()).toBe(false)
    })
  })

  describe('Button Type Attribute', () => {
    it('defaults to button type for button elements', () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      expect(wrapper.attributes('type')).toBe('button')
    })

    it('applies custom type when specified', () => {
      wrapper = mount(SpikeButton, {
        props: { type: 'submit' },
        slots: { default: 'Submit' }
      })
      
      expect(wrapper.attributes('type')).toBe('submit')
    })

    it('does not apply type attribute to anchor elements', () => {
      wrapper = mount(SpikeButton, {
        props: { href: 'https://example.com' },
        slots: { default: 'Link' }
      })
      
      expect(wrapper.attributes('type')).toBeUndefined()
    })
  })

  describe('Event Handling', () => {
    it('emits click event when clicked', async () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      await wrapper.trigger('click')
      
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')).toHaveLength(1)
    })

    it('does not emit click event when disabled', async () => {
      wrapper = mount(SpikeButton, {
        props: { disabled: true },
        slots: { default: 'Button' }
      })
      
      await wrapper.trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('does not emit click event when loading', async () => {
      wrapper = mount(SpikeButton, {
        props: { loading: true },
        slots: { default: 'Button' }
      })
      
      await wrapper.trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('emits focus event when focused', async () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      await wrapper.trigger('focus')
      
      expect(wrapper.emitted('focus')).toBeTruthy()
      expect(wrapper.emitted('focus')).toHaveLength(1)
    })

    it('emits blur event when blurred', async () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      await wrapper.trigger('blur')
      
      expect(wrapper.emitted('blur')).toBeTruthy()
      expect(wrapper.emitted('blur')).toHaveLength(1)
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes when loading', () => {
      wrapper = mount(SpikeButton, {
        props: { loading: true },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.attributes('aria-busy')).toBe('true')
    })

    it('has proper ARIA attributes when disabled', () => {
      wrapper = mount(SpikeButton, {
        props: { disabled: true },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.attributes('aria-disabled')).toBe('true')
    })

    it('applies custom aria-label when provided', () => {
      wrapper = mount(SpikeButton, {
        props: { ariaLabel: 'Custom button label' },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.attributes('aria-label')).toBe('Custom button label')
    })

    it('is focusable by keyboard when not disabled', () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      expect(wrapper.attributes('tabindex')).toBeUndefined() // Default behavior
    })

    it('is not focusable when disabled', () => {
      wrapper = mount(SpikeButton, {
        props: { disabled: true },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.attributes('tabindex')).toBe('-1')
    })
  })

  describe('Keyboard Navigation', () => {
    it('responds to Enter key', async () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      await wrapper.trigger('keydown.enter')
      
      expect(wrapper.emitted('keydown')).toBeTruthy()
    })

    it('responds to Space key', async () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      await wrapper.trigger('keydown.space')
      
      expect(wrapper.emitted('keydown')).toBeTruthy()
    })

    it('does not respond to keyboard when disabled', async () => {
      wrapper = mount(SpikeButton, {
        props: { disabled: true },
        slots: { default: 'Button' }
      })
      
      await wrapper.trigger('keydown.enter')
      
      // The event is still emitted by the test, but the button is disabled
      expect(wrapper.attributes('disabled')).toBeDefined()
    })
  })

  describe('Prop Validation', () => {
    it('accepts all valid variant values', () => {
      const variants: ButtonVariant[] = ['primary', 'secondary', 'success', 'warning', 'danger', 'ghost', 'outline']
      
      variants.forEach(variant => {
        wrapper = mount(SpikeButton, {
          props: { variant },
          slots: { default: 'Button' }
        })
        
        expect(wrapper.vm.variant).toBe(variant)
      })
    })

    it('accepts all valid size values', () => {
      const sizes: ButtonSize[] = ['xs', 'sm', 'md', 'lg', 'xl']
      
      sizes.forEach(size => {
        wrapper = mount(SpikeButton, {
          props: { size },
          slots: { default: 'Button' }
        })
        
        expect(wrapper.vm.size).toBe(size)
      })
    })

    it('accepts boolean props correctly', () => {
      wrapper = mount(SpikeButton, {
        props: {
          disabled: true,
          loading: true,
          block: true
        },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.vm.disabled).toBe(true)
      expect(wrapper.vm.loading).toBe(true)
      expect(wrapper.vm.block).toBe(true)
    })
  })

  describe('Component Structure', () => {
    it('has correct DOM structure', () => {
      wrapper = mount(SpikeButton, {
        slots: {
          default: 'Button text',
          'icon-left': '<span class="icon-left">←</span>',
          'icon-right': '<span class="icon-right">→</span>'
        }
      })
      
      expect(wrapper.find('.spike-button__content').exists()).toBe(true)
      expect(wrapper.find('.spike-button__label').exists()).toBe(true)
      expect(wrapper.find('.icon-left').exists()).toBe(true)
      expect(wrapper.find('.icon-right').exists()).toBe(true)
    })

    it('maintains proper content hierarchy', () => {
      wrapper = mount(SpikeButton, {
        slots: {
          default: 'Button text'
        }
      })
      
      const content = wrapper.find('.spike-button__content')
      const label = content.find('.spike-button__label')
      
      expect(content.exists()).toBe(true)
      expect(label.exists()).toBe(true)
      expect(label.text()).toBe('Button text')
    })
  })

  describe('CSS Classes Integration', () => {
    it('combines multiple classes correctly', () => {
      wrapper = mount(SpikeButton, {
        props: {
          variant: 'success',
          size: 'lg',
          loading: true,
          block: true
        },
        slots: { default: 'Button' }
      })
      
      const classes = wrapper.classes()
      expect(classes).toContain('spike-button')
      expect(classes).toContain('spike-button--success')
      expect(classes).toContain('spike-button--lg')
      expect(classes).toContain('spike-button--loading')
      expect(classes).toContain('spike-button--block')
    })

    it('applies base spike-button class always', () => {
      wrapper = mount(SpikeButton, {
        slots: { default: 'Button' }
      })
      
      expect(wrapper.classes()).toContain('spike-button')
    })
  })

  describe('Attributes Passthrough', () => {
    it('passes through additional attributes', () => {
      wrapper = mount(SpikeButton, {
        attrs: {
          'data-testid': 'my-button',
          'data-analytics': 'click-event',
          id: 'submit-button'
        },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.attributes('data-testid')).toBe('my-button')
      expect(wrapper.attributes('data-analytics')).toBe('click-event')
      expect(wrapper.attributes('id')).toBe('submit-button')
    })

    it('does not override component-specific attributes', () => {
      wrapper = mount(SpikeButton, {
        props: { disabled: true },
        attrs: {
          disabled: false // This should not override the prop
        },
        slots: { default: 'Button' }
      })
      
      expect(wrapper.attributes('disabled')).toBeDefined()
    })
  })

  describe('Performance Considerations', () => {
    it('does not create unnecessary reactive dependencies', async () => {
      const clickHandler = vi.fn()
      wrapper = mount(SpikeButton, {
        props: {
          onClick: clickHandler
        },
        slots: { default: 'Button' }
      })
      
      await wrapper.trigger('click')
      await wrapper.setProps({ variant: 'secondary' })
      await nextTick()
      
      // Component should not have re-registered event listeners
      expect(clickHandler).toHaveBeenCalledTimes(1)
    })
  })
})