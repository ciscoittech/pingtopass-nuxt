import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import SpikeCard from '~/components/base/SpikeCard.vue'
import type { CardVariant, CardPadding } from '~/types/spike-theme'

describe('SpikeCard', () => {
  let wrapper: VueWrapper<any>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders as div element by default', () => {
      wrapper = mount(SpikeCard, {
        slots: {
          default: 'Card content'
        }
      })
      
      expect(wrapper.element.tagName).toBe('DIV')
      expect(wrapper.text()).toBe('Card content')
    })

    it('renders with default variant and padding', () => {
      wrapper = mount(SpikeCard, {
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain('spike-card')
      expect(wrapper.classes()).toContain('spike-card--flat')
      expect(wrapper.classes()).toContain('spike-card--padding-md')
    })

    it('renders slot content correctly', () => {
      wrapper = mount(SpikeCard, {
        slots: {
          default: '<p>Custom card content</p>'
        }
      })
      
      expect(wrapper.html()).toContain('<p>Custom card content</p>')
    })

    it('renders header and footer slots correctly', () => {
      wrapper = mount(SpikeCard, {
        slots: {
          header: '<h2>Card Header</h2>',
          default: 'Card body content',
          footer: '<div>Card Footer</div>'
        }
      })
      
      expect(wrapper.find('.spike-card__header').exists()).toBe(true)
      expect(wrapper.find('.spike-card__body').exists()).toBe(true)
      expect(wrapper.find('.spike-card__footer').exists()).toBe(true)
      expect(wrapper.html()).toContain('<h2>Card Header</h2>')
      expect(wrapper.html()).toContain('<div>Card Footer</div>')
    })
  })

  describe('Variant Classes', () => {
    const variants: CardVariant[] = ['flat', 'outlined', 'elevated', 'filled']
    
    it.each(variants)('applies correct class for %s variant', (variant) => {
      wrapper = mount(SpikeCard, {
        props: { variant },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain(`spike-card--${variant}`)
    })

    it('defaults to flat variant when no variant specified', () => {
      wrapper = mount(SpikeCard, {
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain('spike-card--flat')
    })
  })

  describe('Padding Classes', () => {
    const paddings: CardPadding[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl']
    
    it.each(paddings)('applies correct class for %s padding', (padding) => {
      wrapper = mount(SpikeCard, {
        props: { padding },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain(`spike-card--padding-${padding}`)
    })

    it('defaults to md padding when no padding specified', () => {
      wrapper = mount(SpikeCard, {
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain('spike-card--padding-md')
    })
  })

  describe('State Classes', () => {
    it('applies hoverable class when hoverable prop is true', () => {
      wrapper = mount(SpikeCard, {
        props: { hoverable: true },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain('spike-card--hoverable')
    })

    it('applies clickable class when clickable prop is true', () => {
      wrapper = mount(SpikeCard, {
        props: { clickable: true },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain('spike-card--clickable')
      expect(wrapper.attributes('tabindex')).toBe('0')
    })

    it('applies selected class when selected prop is true', () => {
      wrapper = mount(SpikeCard, {
        props: { selected: true },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain('spike-card--selected')
    })

    it('applies disabled class when disabled prop is true', () => {
      wrapper = mount(SpikeCard, {
        props: { disabled: true },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain('spike-card--disabled')
    })

    it('applies loading class when loading prop is true', () => {
      wrapper = mount(SpikeCard, {
        props: { loading: true },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain('spike-card--loading')
    })

    it('sets tabindex to -1 when disabled', () => {
      wrapper = mount(SpikeCard, {
        props: { 
          clickable: true,
          disabled: true 
        },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.attributes('tabindex')).toBe('-1')
    })
  })

  describe('Loading State', () => {
    it('shows loading overlay when loading is true', () => {
      wrapper = mount(SpikeCard, {
        props: { loading: true },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.find('.spike-card__loading-overlay').exists()).toBe(true)
    })

    it('shows loading spinner in overlay', () => {
      wrapper = mount(SpikeCard, {
        props: { loading: true },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.find('.spike-card__spinner').exists()).toBe(true)
    })

    it('does not show loading overlay when loading is false', () => {
      wrapper = mount(SpikeCard, {
        props: { loading: false },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.find('.spike-card__loading-overlay').exists()).toBe(false)
    })

    it('applies loading state to card content', () => {
      wrapper = mount(SpikeCard, {
        props: { loading: true },
        slots: { default: 'Card content' }
      })
      
      const cardElement = wrapper.find('.spike-card')
      expect(cardElement.classes()).toContain('spike-card--loading')
    })
  })

  describe('Event Handling', () => {
    it('emits click event when clicked and clickable', async () => {
      wrapper = mount(SpikeCard, {
        props: { clickable: true },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('click')
      
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')).toHaveLength(1)
    })

    it('does not emit click event when not clickable', async () => {
      wrapper = mount(SpikeCard, {
        props: { clickable: false },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('does not emit click event when disabled', async () => {
      wrapper = mount(SpikeCard, {
        props: { 
          clickable: true,
          disabled: true 
        },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('does not emit click event when loading', async () => {
      wrapper = mount(SpikeCard, {
        props: { 
          clickable: true,
          loading: true 
        },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('click')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('emits hover events when hoverable', async () => {
      wrapper = mount(SpikeCard, {
        props: { hoverable: true },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('mouseenter')
      await wrapper.trigger('mouseleave')
      
      expect(wrapper.emitted('hover')).toBeTruthy()
      expect(wrapper.emitted('hover')).toHaveLength(2)
    })

    it('emits focus and blur events when clickable', async () => {
      wrapper = mount(SpikeCard, {
        props: { clickable: true },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('focus')
      await wrapper.trigger('blur')
      
      expect(wrapper.emitted('focus')).toBeTruthy()
      expect(wrapper.emitted('blur')).toBeTruthy()
    })
  })

  describe('Keyboard Navigation', () => {
    it('responds to Enter key when clickable', async () => {
      wrapper = mount(SpikeCard, {
        props: { clickable: true },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('keydown', { key: 'Enter' })
      
      expect(wrapper.emitted('click')).toBeTruthy()
    })

    it('responds to Space key when clickable', async () => {
      wrapper = mount(SpikeCard, {
        props: { clickable: true },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('keydown', { key: ' ' })
      
      expect(wrapper.emitted('click')).toBeTruthy()
    })

    it('does not respond to keyboard when disabled', async () => {
      wrapper = mount(SpikeCard, {
        props: { 
          clickable: true,
          disabled: true 
        },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('keydown.enter')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('does not respond to keyboard when not clickable', async () => {
      wrapper = mount(SpikeCard, {
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('keydown.enter')
      
      expect(wrapper.emitted('click')).toBeFalsy()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes when clickable', () => {
      wrapper = mount(SpikeCard, {
        props: { clickable: true },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.attributes('role')).toBe('button')
      expect(wrapper.attributes('tabindex')).toBe('0')
    })

    it('has proper ARIA attributes when selected', () => {
      wrapper = mount(SpikeCard, {
        props: { 
          clickable: true,
          selected: true 
        },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.attributes('aria-selected')).toBe('true')
    })

    it('has proper ARIA attributes when disabled', () => {
      wrapper = mount(SpikeCard, {
        props: { 
          clickable: true,
          disabled: true 
        },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.attributes('aria-disabled')).toBe('true')
      expect(wrapper.attributes('tabindex')).toBe('-1')
    })

    it('has proper ARIA attributes when loading', () => {
      wrapper = mount(SpikeCard, {
        props: { loading: true },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.attributes('aria-busy')).toBe('true')
    })

    it('applies custom aria-label when provided', () => {
      wrapper = mount(SpikeCard, {
        props: { 
          clickable: true,
          ariaLabel: 'Custom card label' 
        },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.attributes('aria-label')).toBe('Custom card label')
    })

    it('does not have button role when not clickable', () => {
      wrapper = mount(SpikeCard, {
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.attributes('role')).toBeUndefined()
      expect(wrapper.attributes('tabindex')).toBeUndefined()
    })
  })

  describe('Component Structure', () => {
    it('has correct DOM structure with header and footer', () => {
      wrapper = mount(SpikeCard, {
        slots: {
          header: 'Header content',
          default: 'Body content',
          footer: 'Footer content'
        }
      })
      
      expect(wrapper.find('.spike-card__header').exists()).toBe(true)
      expect(wrapper.find('.spike-card__body').exists()).toBe(true)
      expect(wrapper.find('.spike-card__footer').exists()).toBe(true)
      
      expect(wrapper.find('.spike-card__header').text()).toBe('Header content')
      expect(wrapper.find('.spike-card__body').text()).toBe('Body content')
      expect(wrapper.find('.spike-card__footer').text()).toBe('Footer content')
    })

    it('only renders body when no header/footer provided', () => {
      wrapper = mount(SpikeCard, {
        slots: {
          default: 'Body content only'
        }
      })
      
      expect(wrapper.find('.spike-card__header').exists()).toBe(false)
      expect(wrapper.find('.spike-card__body').exists()).toBe(true)
      expect(wrapper.find('.spike-card__footer').exists()).toBe(false)
    })

    it('maintains proper content hierarchy', () => {
      wrapper = mount(SpikeCard, {
        slots: {
          header: 'Header',
          default: 'Body',
          footer: 'Footer'
        }
      })
      
      const children = wrapper.element.children
      expect(children[0].classList.contains('spike-card__header')).toBe(true)
      expect(children[1].classList.contains('spike-card__body')).toBe(true)
      expect(children[2].classList.contains('spike-card__footer')).toBe(true)
    })
  })

  describe('CSS Classes Integration', () => {
    it('combines multiple classes correctly', () => {
      wrapper = mount(SpikeCard, {
        props: {
          variant: 'elevated',
          padding: 'lg',
          hoverable: true,
          clickable: true,
          selected: true
        },
        slots: { default: 'Card content' }
      })
      
      const classes = wrapper.classes()
      expect(classes).toContain('spike-card')
      expect(classes).toContain('spike-card--elevated')
      expect(classes).toContain('spike-card--padding-lg')
      expect(classes).toContain('spike-card--hoverable')
      expect(classes).toContain('spike-card--clickable')
      expect(classes).toContain('spike-card--selected')
    })

    it('applies base spike-card class always', () => {
      wrapper = mount(SpikeCard, {
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).toContain('spike-card')
    })
  })

  describe('Prop Validation', () => {
    it('accepts all valid variant values', () => {
      const variants: CardVariant[] = ['flat', 'outlined', 'elevated', 'filled']
      
      variants.forEach(variant => {
        wrapper = mount(SpikeCard, {
          props: { variant },
          slots: { default: 'Card content' }
        })
        
        expect(wrapper.vm.variant).toBe(variant)
      })
    })

    it('accepts all valid padding values', () => {
      const paddings: CardPadding[] = ['none', 'xs', 'sm', 'md', 'lg', 'xl']
      
      paddings.forEach(padding => {
        wrapper = mount(SpikeCard, {
          props: { padding },
          slots: { default: 'Card content' }
        })
        
        expect(wrapper.vm.padding).toBe(padding)
      })
    })

    it('accepts boolean props correctly', () => {
      wrapper = mount(SpikeCard, {
        props: {
          hoverable: true,
          clickable: true,
          selected: true,
          disabled: true,
          loading: true
        },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.vm.hoverable).toBe(true)
      expect(wrapper.vm.clickable).toBe(true)
      expect(wrapper.vm.selected).toBe(true)
      expect(wrapper.vm.disabled).toBe(true)
      expect(wrapper.vm.loading).toBe(true)
    })
  })

  describe('Attributes Passthrough', () => {
    it('passes through additional attributes', () => {
      wrapper = mount(SpikeCard, {
        attrs: {
          'data-testid': 'my-card',
          'data-analytics': 'card-interaction',
          id: 'main-card'
        },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.attributes('data-testid')).toBe('my-card')
      expect(wrapper.attributes('data-analytics')).toBe('card-interaction')
      expect(wrapper.attributes('id')).toBe('main-card')
    })

    it('does not override component-specific attributes', () => {
      wrapper = mount(SpikeCard, {
        props: { 
          clickable: true,
          selected: true 
        },
        attrs: {
          'data-custom': 'value', // This should pass through
          id: 'test-card' // This should pass through
        },
        slots: { default: 'Card content' }
      })
      
      // Component logic should determine these values, not attrs
      expect(wrapper.attributes('aria-selected')).toBe('true')
      expect(wrapper.attributes('role')).toBe('button')
      
      // Custom attrs should pass through
      expect(wrapper.attributes('data-custom')).toBe('value')
      expect(wrapper.attributes('id')).toBe('test-card')
    })
  })

  describe('Interactive States', () => {
    it('updates state correctly when props change', async () => {
      wrapper = mount(SpikeCard, {
        props: { clickable: false },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.classes()).not.toContain('spike-card--clickable')
      expect(wrapper.attributes('tabindex')).toBeUndefined()
      
      await wrapper.setProps({ clickable: true })
      
      expect(wrapper.classes()).toContain('spike-card--clickable')
      expect(wrapper.attributes('tabindex')).toBe('0')
    })

    it('handles state transitions correctly', async () => {
      wrapper = mount(SpikeCard, {
        props: { 
          clickable: true,
          selected: false 
        },
        slots: { default: 'Card content' }
      })
      
      expect(wrapper.attributes('aria-selected')).toBeUndefined()
      
      await wrapper.setProps({ selected: true })
      
      expect(wrapper.attributes('aria-selected')).toBe('true')
      expect(wrapper.classes()).toContain('spike-card--selected')
    })
  })

  describe('Performance Considerations', () => {
    it('does not create unnecessary reactive dependencies', async () => {
      const clickHandler = vi.fn()
      wrapper = mount(SpikeCard, {
        props: {
          clickable: true,
          onClick: clickHandler
        },
        slots: { default: 'Card content' }
      })
      
      await wrapper.trigger('click')
      await wrapper.setProps({ variant: 'outlined' })
      await nextTick()
      
      // Component should not have re-registered event listeners
      expect(clickHandler).toHaveBeenCalledTimes(1)
    })
  })
})