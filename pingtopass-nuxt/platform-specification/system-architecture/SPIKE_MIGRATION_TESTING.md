# Spike Theme Migration & Testing Strategy

## Migration Plan

### Phase 1: Foundation Setup (Day 1-2)

#### Day 1: CSS Architecture
```bash
# 1. Create directory structure
mkdir -p assets/css/spike-theme/{tokens,base,components}
mkdir -p components/{base,ui,patterns,layout}
mkdir -p composables
mkdir -p types

# 2. Create token files
touch assets/css/spike-theme/tokens/{_colors.css,_typography.css,_spacing.css,_effects.css}
touch assets/css/spike-theme/base/{_reset.css,_utilities.css}
touch assets/css/spike-theme/components/{_buttons.css,_cards.css,_forms.css,_modals.css}
touch assets/css/spike-theme/index.css

# 3. Create type definitions
touch types/spike-theme.ts
```

#### Implementation Checklist - Day 1
- [ ] Copy CSS token definitions from SPIKE_CSS_IMPLEMENTATION.md
- [ ] Set up PostCSS configuration
- [ ] Import Spike theme in nuxt.config.ts
- [ ] Create type definitions for theme
- [ ] Test CSS variable availability
- [ ] Verify responsive breakpoints
- [ ] Check browser compatibility

#### Day 2: Base Components
```bash
# Create base components
touch components/base/{SpikeButton.vue,SpikeCard.vue,SpikeInput.vue,SpikeBadge.vue}
touch components/base/{SpikeSpinner.vue,SpikeIcon.vue,SpikeProgress.vue}

# Create composables
touch composables/{useSpikeTheme.ts,useSpikeAnimations.ts,useSpikeBreakpoints.ts}
```

#### Implementation Checklist - Day 2
- [ ] Implement SpikeButton with all variants
- [ ] Implement SpikeCard with slots
- [ ] Implement SpikeInput with validation
- [ ] Create SpikeBadge component
- [ ] Create SpikeSpinner component
- [ ] Set up icon system
- [ ] Test all base components
- [ ] Document component APIs

---

### Phase 2: Component Migration (Day 3-5)

#### Day 3: Replace Existing Components
```typescript
// Migration mapping
const componentMapping = {
  'BaseButton': 'SpikeButton',
  'BaseModal': 'SpikeModal',
  'UButton': 'SpikeButton',
  'UCard': 'SpikeCard',
  'UInput': 'SpikeInput'
}

// Script to update imports
// scripts/migrate-components.ts
import { glob } from 'glob'
import { readFile, writeFile } from 'fs/promises'

async function migrateComponents() {
  const files = await glob('**/*.vue', { 
    ignore: ['node_modules/**', 'dist/**'] 
  })
  
  for (const file of files) {
    let content = await readFile(file, 'utf-8')
    
    // Replace component imports
    Object.entries(componentMapping).forEach(([old, new]) => {
      content = content.replace(
        new RegExp(`<${old}`, 'g'),
        `<${new}`
      )
      content = content.replace(
        new RegExp(`</${old}>`, 'g'),
        `</${new}>`
      )
    })
    
    await writeFile(file, content)
  }
}
```

#### Day 4: Update Pages
```bash
# Pages to update in order
1. pages/index.vue          # Landing page
2. pages/login.vue          # Auth page
3. pages/dashboard.vue      # User dashboard
4. pages/exams.vue          # Exam listing
5. pages/study/[examId].vue # Study interface
```

#### Day 5: Complex Components
```bash
# Create pattern components
touch components/patterns/{SpikeQuestionCard.vue,SpikeExamCard.vue}
touch components/patterns/{SpikeProgressRing.vue,SpikeStatsCard.vue}

# Create UI components
touch components/ui/{SpikeModal.vue,SpikeDropdown.vue}
touch components/ui/{SpikeAlert.vue,SpikeTooltip.vue}
```

---

### Phase 3: Testing & Optimization (Day 6-7)

#### Day 6: Testing Implementation
```bash
# Create test files
touch tests/unit/components/base/Spike{Button,Card,Input}.test.ts
touch tests/visual/spike-components.spec.ts
touch tests/a11y/spike-accessibility.spec.ts
touch tests/performance/spike-performance.spec.ts
```

#### Day 7: Performance Optimization
```bash
# Analyze bundle size
npm run analyze

# Run performance tests
npm run test:performance

# Optimize CSS
npm run build:css
```

---

## Testing Strategy

### 1. Unit Testing

#### Test Coverage Requirements
```yaml
Coverage Targets:
  Base Components: 100%
  UI Components: 95%
  Pattern Components: 90%
  Composables: 100%
  Overall: 95%
```

#### Base Component Test Template
```typescript
// tests/unit/components/base/[Component].test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { Component } from '~/components/base/[Component].vue'

describe('[Component]', () => {
  let wrapper: VueWrapper
  
  beforeEach(() => {
    wrapper = mount(Component, {
      props: {
        // default props
      }
    })
  })
  
  describe('Visual Rendering', () => {
    it('renders with default props', () => {
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.classes()).toContain('spike-[component]')
    })
    
    it('applies variant classes', () => {
      // Test each variant
    })
    
    it('applies size classes', () => {
      // Test each size
    })
  })
  
  describe('User Interaction', () => {
    it('handles click events', async () => {
      // Test click behavior
    })
    
    it('handles keyboard events', async () => {
      // Test keyboard navigation
    })
  })
  
  describe('State Management', () => {
    it('manages internal state correctly', () => {
      // Test state changes
    })
    
    it('syncs with v-model', async () => {
      // Test two-way binding
    })
  })
  
  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      // Test ARIA labels
    })
    
    it('supports screen readers', () => {
      // Test screen reader compatibility
    })
    
    it('maintains focus management', () => {
      // Test focus trap/restoration
    })
  })
  
  describe('Performance', () => {
    it('renders efficiently', () => {
      // Test render performance
    })
    
    it('handles large datasets', () => {
      // Test with stress data
    })
  })
})
```

### 2. Visual Regression Testing

#### Setup Visual Testing
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test'

export default defineConfig({
  use: {
    // Visual regression settings
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true
    }
  },
  
  projects: [
    {
      name: 'Visual Regression',
      testDir: './tests/visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    {
      name: 'Mobile Visual',
      testDir: './tests/visual',
      use: {
        ...devices['iPhone 13'],
      }
    }
  ]
})
```

#### Visual Test Suite
```typescript
// tests/visual/spike-visual.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Spike Theme Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/storybook')
  })
  
  test('Button Component Variations', async ({ page }) => {
    await page.goto('/storybook/button')
    
    const variants = ['primary', 'secondary', 'success', 'warning', 'danger']
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl']
    
    for (const variant of variants) {
      for (const size of sizes) {
        const selector = `[data-testid="btn-${variant}-${size}"]`
        await expect(page.locator(selector)).toHaveScreenshot(
          `button-${variant}-${size}.png`
        )
      }
    }
  })
  
  test('Responsive Layouts', async ({ page }) => {
    const pages = ['/', '/dashboard', '/exams', '/study/test']
    const viewports = [
      { name: 'mobile', width: 375, height: 812 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ]
    
    for (const pageUrl of pages) {
      await page.goto(pageUrl)
      
      for (const viewport of viewports) {
        await page.setViewportSize(viewport)
        await page.waitForTimeout(500) // Wait for responsive adjustments
        
        await expect(page).toHaveScreenshot(
          `${pageUrl.replace('/', '') || 'home'}-${viewport.name}.png`,
          { fullPage: true }
        )
      }
    }
  })
  
  test('Dark Mode Support', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    
    const pages = ['/', '/dashboard', '/exams']
    for (const pageUrl of pages) {
      await page.goto(pageUrl)
      await expect(page).toHaveScreenshot(
        `${pageUrl.replace('/', '') || 'home'}-dark.png`,
        { fullPage: true }
      )
    }
  })
})
```

### 3. Accessibility Testing

#### Automated A11y Tests
```typescript
// tests/a11y/spike-a11y.spec.ts
import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y, getViolations } from 'axe-playwright'

test.describe('Spike Theme Accessibility', () => {
  test('Homepage Accessibility', async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)
    
    const violations = await getViolations(page)
    expect(violations).toEqual([])
  })
  
  test('Color Contrast Compliance', async ({ page }) => {
    await page.goto('/storybook/colors')
    await injectAxe(page)
    
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
  })
  
  test('Keyboard Navigation', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Tab through all interactive elements
    const interactiveElements = await page.$$('button, a, input, select, textarea')
    
    for (let i = 0; i < interactiveElements.length; i++) {
      await page.keyboard.press('Tab')
      const focused = await page.evaluate(() => document.activeElement?.tagName)
      expect(focused).toBeTruthy()
    }
    
    // Test Escape key closes modals
    await page.click('[data-testid="open-modal"]')
    await page.keyboard.press('Escape')
    await expect(page.locator('.spike-modal')).not.toBeVisible()
  })
  
  test('Screen Reader Compatibility', async ({ page }) => {
    await page.goto('/')
    
    // Check for proper heading hierarchy
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', 
      elements => elements.map(el => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent
      }))
    )
    
    // Verify heading hierarchy
    let previousLevel = 0
    for (const heading of headings) {
      expect(heading.level - previousLevel).toBeLessThanOrEqual(1)
      previousLevel = heading.level
    }
    
    // Check for alt text on images
    const images = await page.$$('img')
    for (const img of images) {
      const alt = await img.getAttribute('alt')
      expect(alt).toBeTruthy()
    }
    
    // Check for ARIA labels on interactive elements
    const buttons = await page.$$('button:not([aria-label]):not([aria-labelledby])')
    expect(buttons.length).toBe(0)
  })
})
```

### 4. Performance Testing

#### Performance Benchmarks
```typescript
// tests/performance/spike-performance.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Spike Theme Performance', () => {
  test('Page Load Performance', async ({ page }) => {
    const metrics = await page.goto('/', { waitUntil: 'networkidle' })
      .then(() => page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
          loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
        }
      }))
    
    expect(metrics.firstContentfulPaint).toBeLessThan(1500) // 1.5s FCP
    expect(metrics.domContentLoaded).toBeLessThan(2000) // 2s DOM ready
    expect(metrics.loadComplete).toBeLessThan(3000) // 3s full load
  })
  
  test('CSS Bundle Size', async () => {
    const fs = require('fs').promises
    const path = require('path')
    
    const cssPath = path.join(process.cwd(), '.nuxt/dist/client/_nuxt/*.css')
    const files = await glob(cssPath)
    
    let totalSize = 0
    for (const file of files) {
      const stats = await fs.stat(file)
      totalSize += stats.size
    }
    
    // CSS should be under 50KB gzipped
    expect(totalSize).toBeLessThan(50000)
  })
  
  test('Component Render Performance', async ({ page }) => {
    await page.goto('/dashboard')
    
    const renderTime = await page.evaluate(() => {
      const start = performance.now()
      
      // Trigger re-render by changing data
      const event = new Event('test-render')
      document.dispatchEvent(event)
      
      // Measure paint time
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve(performance.now() - start)
          })
        })
      })
    })
    
    expect(renderTime).toBeLessThan(16) // 60fps = 16ms per frame
  })
  
  test('Animation Performance', async ({ page }) => {
    await page.goto('/study/test-exam')
    
    // Start performance recording
    await page.evaluate(() => {
      window.frameCount = 0
      window.startTime = performance.now()
      
      const countFrames = () => {
        window.frameCount++
        if (performance.now() - window.startTime < 1000) {
          requestAnimationFrame(countFrames)
        }
      }
      
      countFrames()
    })
    
    await page.waitForTimeout(1100)
    
    const fps = await page.evaluate(() => window.frameCount)
    expect(fps).toBeGreaterThan(55) // Target 60fps, allow some variance
  })
})
```

### 5. Integration Testing

#### Full User Flow Tests
```typescript
// tests/e2e/spike-user-flows.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Spike Theme User Flows', () => {
  test('Complete Study Session', async ({ page }) => {
    // Navigate to exams
    await page.goto('/exams')
    
    // Select an exam
    await page.click('[data-testid="exam-card-network-plus"]')
    
    // Start study session
    await page.click('[data-testid="start-studying"]')
    
    // Answer questions
    for (let i = 0; i < 5; i++) {
      // Select an answer
      await page.click('.spike-answer-option:first-child')
      
      // Submit answer
      await page.click('[data-testid="submit-answer"]')
      
      // Verify feedback appears
      await expect(page.locator('.spike-answer-feedback')).toBeVisible()
      
      // Go to next question
      await page.click('[data-testid="next-question"]')
    }
    
    // Complete session
    await page.click('[data-testid="end-session"]')
    
    // Verify results page
    await expect(page.locator('.spike-session-results')).toBeVisible()
  })
  
  test('Responsive Navigation', async ({ page, isMobile }) => {
    await page.goto('/')
    
    if (isMobile) {
      // Mobile navigation
      await page.click('[data-testid="mobile-menu-toggle"]')
      await expect(page.locator('.spike-mobile-menu')).toBeVisible()
      
      await page.click('[data-testid="nav-dashboard"]')
      await expect(page).toHaveURL('/dashboard')
    } else {
      // Desktop navigation
      await page.click('[data-testid="nav-dashboard"]')
      await expect(page).toHaveURL('/dashboard')
    }
  })
})
```

---

## Migration Validation Checklist

### Pre-Migration Validation
- [ ] Backup current styles and components
- [ ] Document current component usage
- [ ] Create migration branch
- [ ] Set up rollback plan

### During Migration
- [ ] Run tests after each component migration
- [ ] Validate responsive behavior
- [ ] Check accessibility compliance
- [ ] Monitor bundle size
- [ ] Test in all target browsers

### Post-Migration Validation
- [ ] Full regression testing
- [ ] Performance benchmarking
- [ ] Accessibility audit
- [ ] Visual regression review
- [ ] User acceptance testing
- [ ] Documentation update

---

## Rollback Strategy

### Immediate Rollback
```bash
# If critical issues found
git checkout main
git branch -D spike-theme-migration

# Restore previous build
npm run build:rollback
```

### Gradual Rollback
```typescript
// Feature flag for gradual rollback
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      useSpikeTheme: process.env.USE_SPIKE_THEME === 'true'
    }
  }
})

// In components
const { $config } = useNuxtApp()
const componentName = $config.public.useSpikeTheme ? 'SpikeButton' : 'BaseButton'
```

---

## Success Criteria

### Performance Metrics
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] Lighthouse Score > 95
- [ ] CSS Bundle < 50KB gzipped
- [ ] 60fps animations

### Quality Metrics
- [ ] 0 accessibility violations
- [ ] 95% test coverage
- [ ] 0 visual regressions
- [ ] All browsers supported
- [ ] Mobile-first responsive

### Development Metrics
- [ ] Migration completed in 7 days
- [ ] No production incidents
- [ ] No performance degradation
- [ ] Documentation complete
- [ ] Team trained on new system

---

This comprehensive migration and testing strategy ensures a smooth transition to the Spike theme with minimal risk and maximum quality assurance.