# Spike Theme UI/UX Technical Architecture

## Executive Summary

This document defines the technical architecture for implementing the Spike theme design system in PingToPass. The architecture prioritizes performance, maintainability, and progressive enhancement while ensuring smooth migration from the current basic styling to a professional, cohesive design system.

---

## 1. CSS Architecture

### 1.1 Design Token System

#### Structure
```
assets/css/spike-theme/
├── tokens/
│   ├── _colors.css          # Color design tokens
│   ├── _typography.css      # Font scales and weights
│   ├── _spacing.css         # Spacing scale
│   ├── _shadows.css         # Shadow definitions
│   ├── _animations.css      # Animation presets
│   └── _breakpoints.css     # Responsive breakpoints
├── base/
│   ├── _reset.css           # CSS reset/normalize
│   ├── _global.css          # Global styles
│   └── _utilities.css       # Utility classes
├── components/
│   ├── _buttons.css         # Button component styles
│   ├── _cards.css           # Card component styles
│   ├── _forms.css           # Form element styles
│   └── _modals.css          # Modal component styles
└── index.css                # Main entry point
```

#### Implementation Strategy

**CSS Custom Properties Architecture**
```css
/* assets/css/spike-theme/tokens/_colors.css */
:root {
  /* Primary Palette */
  --spike-primary: #0085db;
  --spike-primary-dark: #006bb8;
  --spike-primary-light: #339ddf;
  --spike-primary-alpha-10: rgba(0, 133, 219, 0.1);
  --spike-primary-alpha-20: rgba(0, 133, 219, 0.2);
  
  /* Semantic Colors */
  --spike-info: #46caeb;
  --spike-success: #28a745;
  --spike-warning: #ffc107;
  --spike-error: #dc3545;
  
  /* Neutral Scale */
  --spike-neutral-0: #ffffff;
  --spike-neutral-50: #f8f9fa;
  --spike-neutral-100: #e9ecef;
  --spike-neutral-200: #dee2e6;
  --spike-neutral-300: #ced4da;
  --spike-neutral-400: #adb5bd;
  --spike-neutral-500: #6c757d;
  --spike-neutral-600: #495057;
  --spike-neutral-700: #343a40;
  --spike-neutral-800: #212529;
  --spike-neutral-900: #000000;
  
  /* Contextual Tokens */
  --spike-surface: var(--spike-neutral-0);
  --spike-background: var(--spike-neutral-50);
  --spike-border: var(--spike-neutral-200);
  --spike-text-primary: var(--spike-neutral-800);
  --spike-text-secondary: var(--spike-neutral-500);
  --spike-text-muted: var(--spike-neutral-400);
}

/* Dark Mode Preparation (future-proofing) */
[data-theme="dark"] {
  --spike-surface: var(--spike-neutral-800);
  --spike-background: var(--spike-neutral-900);
  --spike-border: var(--spike-neutral-600);
  --spike-text-primary: var(--spike-neutral-50);
  --spike-text-secondary: var(--spike-neutral-300);
  --spike-text-muted: var(--spike-neutral-500);
}
```

### 1.2 Responsive Design Architecture

```css
/* assets/css/spike-theme/tokens/_breakpoints.css */
:root {
  --breakpoint-xs: 0;
  --breakpoint-sm: 576px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 992px;
  --breakpoint-xl: 1200px;
  --breakpoint-2xl: 1400px;
}

/* Utility Mixins (PostCSS) */
@custom-media --xs-up (width >= 0);
@custom-media --sm-up (width >= 576px);
@custom-media --md-up (width >= 768px);
@custom-media --lg-up (width >= 992px);
@custom-media --xl-up (width >= 1200px);
@custom-media --2xl-up (width >= 1400px);

/* Mobile-first approach */
@custom-media --mobile (width < 768px);
@custom-media --tablet (width >= 768px) and (width < 992px);
@custom-media --desktop (width >= 992px);
```

### 1.3 Component Styles Organization

**Scoped vs Global Styles Decision**
- **Global**: Design tokens, reset, utilities, and base component styles
- **Scoped**: Component-specific variations and overrides
- **CSS Modules**: For complex components requiring style isolation

```typescript
// nuxt.config.ts additions
export default defineNuxtConfig({
  css: [
    '~/assets/css/spike-theme/index.css'
  ],
  
  vite: {
    css: {
      preprocessorOptions: {
        css: {
          additionalData: '@import "~/assets/css/spike-theme/tokens/_index.css";'
        }
      }
    }
  }
})
```

---

## 2. Component Architecture

### 2.1 Base Component Structure

```typescript
// components/base/SpikeButton.vue
<template>
  <component
    :is="computedTag"
    :class="buttonClasses"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading" class="spike-button__loader">
      <SpikeSpinner :size="size" />
    </span>
    <span class="spike-button__content" :class="{ 'spike-button__content--loading': loading }">
      <slot name="icon-left" />
      <span class="spike-button__label">
        <slot />
      </span>
      <slot name="icon-right" />
    </span>
  </component>
</template>

<script setup lang="ts">
import type { ButtonVariant, ButtonSize } from '~/types/spike-theme'

interface Props {
  variant?: ButtonVariant
  size?: ButtonSize
  disabled?: boolean
  loading?: boolean
  block?: boolean
  href?: string
  to?: string | object
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  block: false
})

const computedTag = computed(() => {
  if (props.href) return 'a'
  if (props.to) return resolveComponent('NuxtLink')
  return 'button'
})

const buttonClasses = computed(() => [
  'spike-button',
  `spike-button--${props.variant}`,
  `spike-button--${props.size}`,
  {
    'spike-button--block': props.block,
    'spike-button--disabled': props.disabled,
    'spike-button--loading': props.loading
  }
])
</script>

<style>
.spike-button {
  --button-height: var(--spike-control-height-md);
  --button-padding-x: var(--spike-space-6);
  --button-font-size: var(--spike-font-size-base);
  --button-font-weight: var(--spike-font-weight-semibold);
  
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spike-space-2);
  height: var(--button-height);
  padding: 0 var(--button-padding-x);
  font-size: var(--button-font-size);
  font-weight: var(--button-font-weight);
  line-height: 1;
  border-radius: var(--spike-radius-md);
  transition: all var(--spike-transition-default);
  cursor: pointer;
  user-select: none;
}

/* Size Variations */
.spike-button--sm {
  --button-height: var(--spike-control-height-sm);
  --button-padding-x: var(--spike-space-4);
  --button-font-size: var(--spike-font-size-sm);
}

.spike-button--lg {
  --button-height: var(--spike-control-height-lg);
  --button-padding-x: var(--spike-space-8);
  --button-font-size: var(--spike-font-size-lg);
}

/* Variant Styles */
.spike-button--primary {
  background: var(--spike-gradient-primary);
  color: var(--spike-neutral-0);
  border: 2px solid transparent;
}

.spike-button--primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--spike-shadow-lg);
}

.spike-button--secondary {
  background: transparent;
  color: var(--spike-primary);
  border: 2px solid var(--spike-primary);
}

.spike-button--secondary:hover:not(:disabled) {
  background: var(--spike-primary-alpha-10);
}
</style>
```

### 2.2 Composition Pattern

```typescript
// composables/useSpikeTheme.ts
export const useSpikeTheme = () => {
  const colorMode = useColorMode()
  
  const themes = {
    light: 'spike-light',
    dark: 'spike-dark',
    highContrast: 'spike-high-contrast'
  }
  
  const setTheme = (theme: keyof typeof themes) => {
    document.documentElement.setAttribute('data-theme', themes[theme])
    colorMode.preference = theme
  }
  
  const getCurrentTheme = () => colorMode.preference
  
  const getThemeColors = () => {
    const computedStyle = getComputedStyle(document.documentElement)
    return {
      primary: computedStyle.getPropertyValue('--spike-primary'),
      secondary: computedStyle.getPropertyValue('--spike-secondary'),
      // ... other colors
    }
  }
  
  return {
    setTheme,
    getCurrentTheme,
    getThemeColors,
    themes
  }
}
```

### 2.3 Component Hierarchy

```
components/
├── base/                    # Atomic components
│   ├── SpikeButton.vue
│   ├── SpikeCard.vue
│   ├── SpikeInput.vue
│   ├── SpikeSelect.vue
│   ├── SpikeCheckbox.vue
│   ├── SpikeRadio.vue
│   ├── SpikeProgress.vue
│   ├── SpikeSpinner.vue
│   └── SpikeBadge.vue
├── ui/                      # Composite components
│   ├── SpikeModal.vue
│   ├── SpikeDropdown.vue
│   ├── SpikeTooltip.vue
│   ├── SpikeAlert.vue
│   ├── SpikeTable.vue
│   └── SpikePagination.vue
├── patterns/                # Complex UI patterns
│   ├── SpikeQuestionCard.vue
│   ├── SpikeExamCard.vue
│   ├── SpikeProgressRing.vue
│   ├── SpikeStatsCard.vue
│   └── SpikeTimerDisplay.vue
└── layout/                  # Layout components
    ├── SpikeHeader.vue
    ├── SpikeNavigation.vue
    ├── SpikeSidebar.vue
    └── SpikeFooter.vue
```

---

## 3. @nuxt/ui Integration Strategy

### 3.1 Custom Theme Configuration

```typescript
// app.config.ts
export default defineAppConfig({
  ui: {
    // Override default theme
    primary: 'spike',
    gray: 'neutral',
    
    // Custom color palette
    colors: {
      spike: {
        50: '#e3f2fd',
        100: '#bbdefb',
        200: '#90caf9',
        300: '#64b5f6',
        400: '#42a5f5',
        500: '#0085db',
        600: '#006bb8',
        700: '#005195',
        800: '#003772',
        900: '#001d4f'
      },
      neutral: {
        50: '#f8f9fa',
        100: '#e9ecef',
        200: '#dee2e6',
        300: '#ced4da',
        400: '#adb5bd',
        500: '#6c757d',
        600: '#495057',
        700: '#343a40',
        800: '#212529',
        900: '#000000'
      }
    },
    
    // Component overrides
    button: {
      base: {
        font: 'font-semibold',
        rounded: 'rounded-md'
      },
      variants: {
        solid: {
          primary: 'bg-gradient-to-r from-spike-500 to-spike-600 hover:from-spike-600 hover:to-spike-700'
        }
      }
    },
    
    card: {
      base: {
        background: 'bg-white dark:bg-neutral-800',
        ring: 'ring-1 ring-neutral-200 dark:ring-neutral-700',
        rounded: 'rounded-lg',
        shadow: 'shadow-md hover:shadow-lg transition-shadow'
      }
    }
  }
})
```

### 3.2 Icon System Integration

```typescript
// plugins/spike-icons.client.ts
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(() => {
  // Register custom icon collections
  const customIcons = {
    spike: {
      'exam': '<svg>...</svg>',
      'progress': '<svg>...</svg>',
      'achievement': '<svg>...</svg>'
    }
  }
  
  // Extend UIcon with custom icons
  return {
    provide: {
      spikeIcons: customIcons
    }
  }
})
```

---

## 4. File Organization Blueprint

```
pingtopass-nuxt/
├── assets/
│   ├── css/
│   │   └── spike-theme/
│   │       ├── index.css                 # Main entry
│   │       ├── tokens/                   # Design tokens
│   │       │   ├── _colors.css
│   │       │   ├── _typography.css
│   │       │   ├── _spacing.css
│   │       │   ├── _shadows.css
│   │       │   ├── _animations.css
│   │       │   └── _breakpoints.css
│   │       ├── base/                     # Base styles
│   │       │   ├── _reset.css
│   │       │   ├── _global.css
│   │       │   └── _utilities.css
│   │       └── components/               # Component styles
│   │           ├── _buttons.css
│   │           ├── _cards.css
│   │           ├── _forms.css
│   │           └── _modals.css
│   └── fonts/                            # Web fonts
│       └── inter/
├── components/
│   ├── base/                             # Atomic components
│   ├── ui/                               # Composite components
│   ├── patterns/                         # Domain patterns
│   └── layout/                           # Layout components
├── composables/
│   ├── useSpikeTheme.ts                  # Theme utilities
│   ├── useSpikeAnimations.ts             # Animation helpers
│   └── useSpikeBreakpoints.ts            # Responsive helpers
├── plugins/
│   ├── spike-theme.client.ts             # Theme initialization
│   └── spike-icons.client.ts             # Icon registration
└── types/
    └── spike-theme.ts                    # Theme type definitions
```

---

## 5. Migration Strategy

### Phase 1: Foundation (Week 1)
1. **Setup Design Token System**
   - Create CSS custom properties
   - Implement color palette
   - Define typography scale
   - Establish spacing system

2. **Create Base Components**
   - SpikeButton
   - SpikeCard
   - SpikeInput
   - SpikeBadge

3. **Update Global Styles**
   - CSS reset
   - Typography defaults
   - Utility classes

### Phase 2: Component Migration (Week 2)
1. **Replace Existing Components**
   - Map BaseButton → SpikeButton
   - Update form components
   - Migrate layout components

2. **Page-by-Page Updates**
   - Landing page
   - Dashboard
   - Study interface
   - Test interface

### Phase 3: Polish & Optimization (Week 3)
1. **Performance Optimization**
   - CSS purging
   - Component lazy loading
   - Font optimization

2. **Cross-browser Testing**
   - Chrome/Edge
   - Firefox
   - Safari
   - Mobile browsers

### Migration Checklist
```typescript
// scripts/spike-migration.ts
const migrationTasks = [
  { id: 'tokens', status: 'pending', description: 'Design tokens setup' },
  { id: 'base-components', status: 'pending', description: 'Base component creation' },
  { id: 'global-styles', status: 'pending', description: 'Global styles update' },
  { id: 'landing-page', status: 'pending', description: 'Landing page migration' },
  { id: 'dashboard', status: 'pending', description: 'Dashboard migration' },
  { id: 'study-interface', status: 'pending', description: 'Study interface migration' },
  { id: 'test-interface', status: 'pending', description: 'Test interface migration' },
  { id: 'responsive', status: 'pending', description: 'Responsive testing' },
  { id: 'accessibility', status: 'pending', description: 'Accessibility audit' },
  { id: 'performance', status: 'pending', description: 'Performance optimization' }
]
```

---

## 6. Testing Architecture

### 6.1 Component Testing Strategy

```typescript
// tests/unit/components/base/SpikeButton.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpikeButton from '~/components/base/SpikeButton.vue'

describe('SpikeButton', () => {
  describe('Visual States', () => {
    it('renders with primary variant', () => {
      const wrapper = mount(SpikeButton, {
        props: { variant: 'primary' }
      })
      expect(wrapper.classes()).toContain('spike-button--primary')
    })
    
    it('applies correct size classes', () => {
      const sizes = ['sm', 'md', 'lg']
      sizes.forEach(size => {
        const wrapper = mount(SpikeButton, {
          props: { size }
        })
        expect(wrapper.classes()).toContain(`spike-button--${size}`)
      })
    })
  })
  
  describe('Interaction States', () => {
    it('shows loading state', () => {
      const wrapper = mount(SpikeButton, {
        props: { loading: true }
      })
      expect(wrapper.find('.spike-button__loader').exists()).toBe(true)
    })
    
    it('disables interaction when disabled', () => {
      const wrapper = mount(SpikeButton, {
        props: { disabled: true }
      })
      expect(wrapper.attributes('disabled')).toBeDefined()
    })
  })
  
  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      const wrapper = mount(SpikeButton, {
        props: { loading: true }
      })
      expect(wrapper.attributes('aria-busy')).toBe('true')
    })
  })
})
```

### 6.2 Visual Regression Testing

```typescript
// tests/visual/spike-components.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Spike Theme Components', () => {
  test('Button variations', async ({ page }) => {
    await page.goto('/storybook/spike-button')
    
    // Capture all button states
    const variants = ['primary', 'secondary', 'success', 'warning', 'danger']
    const sizes = ['sm', 'md', 'lg']
    
    for (const variant of variants) {
      for (const size of sizes) {
        await page.locator(`[data-test="button-${variant}-${size}"]`).screenshot({
          path: `tests/visual/screenshots/button-${variant}-${size}.png`
        })
      }
    }
  })
  
  test('Responsive layouts', async ({ page }) => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport)
      await page.goto('/')
      await page.screenshot({
        path: `tests/visual/screenshots/homepage-${viewport.name}.png`,
        fullPage: true
      })
    }
  })
})
```

### 6.3 Accessibility Testing

```typescript
// tests/a11y/spike-accessibility.spec.ts
import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Spike Theme Accessibility', () => {
  test('Homepage accessibility', async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)
    await checkA11y(page)
  })
  
  test('Color contrast compliance', async ({ page }) => {
    await page.goto('/storybook/spike-colors')
    await injectAxe(page)
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
  })
  
  test('Keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Tab through all interactive elements
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => document.activeElement?.tagName)
    expect(focused).toBeDefined()
    
    // Test keyboard shortcuts
    await page.keyboard.press('?')
    await expect(page.locator('[data-test="help-modal"]')).toBeVisible()
  })
})
```

### 6.4 Performance Testing

```typescript
// tests/performance/spike-performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Spike Theme Performance', () => {
  test('CSS bundle size', async () => {
    const cssSize = await getCSSBundleSize()
    expect(cssSize).toBeLessThan(50000) // 50KB max
  })
  
  test('Component render performance', async ({ page }) => {
    await page.goto('/dashboard')
    
    const metrics = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        loadComplete: perfData.loadEventEnd - perfData.loadEventStart
      }
    })
    
    expect(metrics.domContentLoaded).toBeLessThan(200)
    expect(metrics.loadComplete).toBeLessThan(500)
  })
  
  test('Animation performance', async ({ page }) => {
    await page.goto('/study/test-exam')
    
    // Measure frame rate during animations
    const fps = await page.evaluate(async () => {
      let frames = 0
      const countFrames = () => {
        frames++
        requestAnimationFrame(countFrames)
      }
      countFrames()
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      return frames
    })
    
    expect(fps).toBeGreaterThan(55) // Target 60fps
  })
})
```

---

## 7. Performance Optimization

### 7.1 CSS Optimization
```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  postcss: {
    plugins: {
      'postcss-import': {},
      'postcss-custom-properties': {
        preserve: false // Convert CSS variables to static values for older browsers
      },
      'cssnano': {
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true
        }]
      }
    }
  },
  
  vite: {
    css: {
      modules: {
        generateScopedName: '[hash:base64:5]' // Shorter class names in production
      }
    }
  }
})
```

### 7.2 Component Optimization
```typescript
// Lazy load heavy components
const SpikeChart = defineAsyncComponent(() => import('~/components/patterns/SpikeChart.vue'))
const SpikeDataTable = defineAsyncComponent(() => import('~/components/ui/SpikeDataTable.vue'))
```

---

## 8. Implementation Priorities

### Critical Path (P0 - Week 1)
1. Design token system
2. SpikeButton component
3. SpikeCard component
4. Typography styles
5. Color system implementation

### High Priority (P1 - Week 2)
1. Form components (Input, Select, Checkbox, Radio)
2. Navigation components
3. Modal system
4. Alert/Toast notifications
5. Progress indicators

### Medium Priority (P2 - Week 3)
1. Data visualization components
2. Advanced patterns (Question cards, Exam cards)
3. Animation system
4. Dark mode preparation
5. Print styles

### Nice to Have (P3 - Post-launch)
1. Theme customization UI
2. Component playground
3. Design system documentation
4. Storybook integration
5. Advanced animations

---

## 9. Success Metrics

### Performance Targets
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Cumulative Layout Shift**: < 0.1
- **CSS Bundle Size**: < 50KB (gzipped)
- **Component Render Time**: < 16ms (60fps)

### Quality Targets
- **Lighthouse Score**: > 95 (all categories)
- **Accessibility**: WCAG 2.1 AA compliant
- **Browser Support**: Chrome, Firefox, Safari, Edge (2 latest versions)
- **Test Coverage**: > 90% for UI components
- **Visual Regression**: 0 unintended changes

### Development Velocity
- **Component Creation**: 2-3 components per day
- **Migration Speed**: 2-3 pages per day
- **Bug Resolution**: < 24 hours for critical issues
- **PR Review Time**: < 4 hours
- **Deployment**: Daily releases

---

## 10. Risk Mitigation

### Technical Risks
1. **CSS Specificity Conflicts**
   - Mitigation: Use CSS modules and naming conventions
   - Fallback: Scoped styles with Vue

2. **Performance Degradation**
   - Mitigation: Regular performance audits
   - Fallback: Progressive CSS loading

3. **Browser Compatibility**
   - Mitigation: PostCSS transforms and polyfills
   - Fallback: Graceful degradation

### Process Risks
1. **Migration Disruption**
   - Mitigation: Feature flags for gradual rollout
   - Fallback: Quick rollback strategy

2. **Design Inconsistency**
   - Mitigation: Strict component guidelines
   - Fallback: Design review process

---

## Appendix A: Component API Reference

### SpikeButton API
```typescript
interface SpikeButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'ghost'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  loading?: boolean
  block?: boolean
  icon?: string
  iconPosition?: 'left' | 'right'
  href?: string
  to?: string | object
  type?: 'button' | 'submit' | 'reset'
}
```

### SpikeCard API
```typescript
interface SpikeCardProps {
  variant?: 'flat' | 'outlined' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  clickable?: boolean
  selected?: boolean
}
```

---

## Appendix B: CSS Architecture Decisions

### Decision Log

| Decision | Rationale | Alternative Considered |
|----------|-----------|----------------------|
| CSS Custom Properties | Native browser support, runtime theming | Sass variables |
| PostCSS | Future CSS features, better performance | Sass/Less |
| CSS Modules for complex components | Scoped styles, no conflicts | BEM naming |
| Mobile-first responsive | Better performance, progressive enhancement | Desktop-first |
| Utility classes for spacing/layout | Consistency, rapid development | Component-specific styles |

---

This architecture provides a solid foundation for implementing the Spike theme while maintaining flexibility for future enhancements and ensuring optimal performance.