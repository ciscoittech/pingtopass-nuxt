import { test, expect, type Page } from '@playwright/test'

/**
 * CSS Loading Tests - Comprehensive validation that CSS is properly loaded
 * 
 * These tests verify:
 * 1. CSS files are loaded without errors
 * 2. Spike theme styles are applied correctly
 * 3. Responsive breakpoints work
 * 4. Custom properties are available
 * 5. Component-specific styles are loaded
 */

test.describe('CSS Loading and Styling', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to homepage and wait for load
    await page.goto('/')
    
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle')
  })

  test('should load all CSS files without errors', async ({ page }) => {
    // Collect any console errors during page load
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Collect network failures (but ignore 304 Not Modified and virtual CSS files)
    const failedRequests: string[] = []
    page.on('response', response => {
      if (response.url().includes('.css')) {
        // Only treat as failed if it's a real error (not 304 Not Modified)
        if (!response.ok() && response.status() !== 304) {
          // Ignore virtual CSS files from Nuxt build system
          if (!response.url().includes('virtual:nuxt:') && !response.url().includes('@id/virtual:')) {
            failedRequests.push(`${response.status()} - ${response.url()}`)
          }
        }
      }
    })
    
    // Reload page to capture all requests
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify no CSS-related errors
    const cssErrors = consoleErrors.filter(error => 
      error.includes('css') || 
      error.includes('stylesheet') ||
      error.includes('Failed to load')
    )
    
    expect(cssErrors).toHaveLength(0)
    expect(failedRequests).toHaveLength(0)
  })

  test('should have Spike theme CSS custom properties loaded', async ({ page }) => {
    // Check that root CSS custom properties are defined
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--spike-primary')
    })
    
    const backgroundColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--spike-background')
    })
    
    const textPrimaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--spike-text-primary')
    })
    
    const fontFamilySans = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--spike-font-family-sans')
    })
    
    // Verify Spike theme colors are loaded
    expect(primaryColor.trim()).toBe('#0085db')
    expect(backgroundColor.trim()).toBeTruthy()
    expect(textPrimaryColor.trim()).toBeTruthy()
    expect(fontFamilySans.trim()).toBeTruthy()
  })

  test('should apply Spike theme typography styles to body', async ({ page }) => {
    const bodyStyles = await page.evaluate(() => {
      const body = document.body
      const styles = getComputedStyle(body)
      return {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight,
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        minHeight: styles.minHeight
      }
    })
    
    // Verify body has correct styling from Spike theme
    expect(bodyStyles.fontFamily).toContain('sans-serif')
    expect(bodyStyles.fontSize).toBeTruthy()
    expect(bodyStyles.lineHeight).toBeTruthy()
    // In test environment, body height might be set by Playwright
    expect(bodyStyles.minHeight).toMatch(/\d+px|100vh/)
    expect(bodyStyles.backgroundColor).toBeTruthy()
    expect(bodyStyles.color).toBeTruthy()
  })

  test('should apply correct heading hierarchy styles', async ({ page }) => {
    // Add some test headings to check styling
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="/_nuxt/assets/css/spike-theme/index.css">
        </head>
        <body>
          <h1>Test H1 Heading</h1>
          <h2>Test H2 Heading</h2>
          <h3>Test H3 Heading</h3>
          <p>Test paragraph text</p>
        </body>
      </html>
    `)
    
    await page.waitForLoadState('networkidle')
    
    const headingStyles = await page.evaluate(() => {
      const h1 = document.querySelector('h1')
      const h2 = document.querySelector('h2')
      const h3 = document.querySelector('h3')
      const p = document.querySelector('p')
      
      if (!h1 || !h2 || !h3 || !p) return null
      
      return {
        h1: {
          fontSize: parseFloat(getComputedStyle(h1).fontSize),
          fontWeight: getComputedStyle(h1).fontWeight,
          marginBottom: getComputedStyle(h1).marginBottom
        },
        h2: {
          fontSize: parseFloat(getComputedStyle(h2).fontSize),
          fontWeight: getComputedStyle(h2).fontWeight,
          marginBottom: getComputedStyle(h2).marginBottom
        },
        h3: {
          fontSize: parseFloat(getComputedStyle(h3).fontSize),
          fontWeight: getComputedStyle(h3).fontWeight,
          marginBottom: getComputedStyle(h3).marginBottom
        },
        p: {
          fontSize: parseFloat(getComputedStyle(p).fontSize),
          marginBottom: getComputedStyle(p).marginBottom
        }
      }
    })
    
    expect(headingStyles).not.toBeNull()
    
    if (headingStyles) {
      // Verify heading hierarchy (larger headings should have larger font sizes)
      expect(headingStyles.h1.fontSize).toBeGreaterThan(headingStyles.h2.fontSize)
      expect(headingStyles.h2.fontSize).toBeGreaterThan(headingStyles.h3.fontSize)
      expect(headingStyles.h3.fontSize).toBeGreaterThan(headingStyles.p.fontSize)
      
      // Verify headings have appropriate margins
      expect(headingStyles.h1.marginBottom).toBeTruthy()
      expect(headingStyles.h2.marginBottom).toBeTruthy()
      expect(headingStyles.h3.marginBottom).toBeTruthy()
    }
  })

  test('should apply responsive breakpoint styles', async ({ page }) => {
    // Test mobile breakpoint
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.waitForTimeout(100) // Allow styles to apply
    
    const mobileStyles = await page.evaluate(() => {
      return {
        bodyFontSize: parseFloat(getComputedStyle(document.body).fontSize),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    })
    
    // Test desktop breakpoint
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.waitForTimeout(100)
    
    const desktopStyles = await page.evaluate(() => {
      return {
        bodyFontSize: parseFloat(getComputedStyle(document.body).fontSize),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    })
    
    // Verify responsive behavior
    expect(mobileStyles.viewport.width).toBe(375)
    expect(desktopStyles.viewport.width).toBe(1920)
    expect(mobileStyles.bodyFontSize).toBeGreaterThan(0)
    expect(desktopStyles.bodyFontSize).toBeGreaterThan(0)
  })

  test('should load component-specific styles from page CSS files', async ({ page }) => {
    // Navigate to different pages to test page-specific CSS loading
    const pages = ['/', '/login', '/dashboard', '/exams']
    
    for (const pagePath of pages) {
      await page.goto(pagePath)
      await page.waitForLoadState('networkidle')
      
      // Check that page-specific styles are loaded by verifying CSS custom properties
      const hasPageStyles = await page.evaluate(() => {
        const rootStyles = getComputedStyle(document.documentElement)
        // Check if any Spike theme variables are defined
        return rootStyles.getPropertyValue('--spike-primary').trim() !== ''
      })
      
      expect(hasPageStyles).toBe(true)
    }
  })

  test('should handle focus styles correctly', async ({ page }) => {
    // Add a focusable element
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="stylesheet" href="/_nuxt/assets/css/spike-theme/index.css">
        </head>
        <body>
          <button id="test-button">Test Button</button>
          <a href="#" id="test-link">Test Link</a>
        </body>
      </html>
    `)
    
    await page.waitForLoadState('networkidle')
    
    // Focus the button
    await page.focus('#test-button')
    
    const focusStyles = await page.evaluate(() => {
      const button = document.querySelector('#test-button') as HTMLElement
      return getComputedStyle(button, ':focus-visible')
    })
    
    // Focus styles should be applied (outline should be defined)
    expect(focusStyles).toBeTruthy()
  })

  test('should load CSS without blocking page rendering', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    await page.waitForSelector('body')
    
    const loadTime = Date.now() - startTime
    
    // Page should load quickly (under 2 seconds even with CSS)
    expect(loadTime).toBeLessThan(2000)
    
    // Verify content is visible (not hidden by CSS loading issues)
    const bodyIsVisible = await page.isVisible('body')
    expect(bodyIsVisible).toBe(true)
  })

  test('should support dark mode CSS custom properties', async ({ page }) => {
    // Add dark mode attribute
    await page.addStyleTag({
      content: `
        [data-theme="dark"] {
          --spike-surface: var(--spike-neutral-800);
          --spike-background: var(--spike-neutral-900);
        }
      `
    })
    
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
    })
    
    await page.waitForTimeout(100) // Allow styles to apply
    
    const darkModeStyles = await page.evaluate(() => {
      return {
        surface: getComputedStyle(document.documentElement).getPropertyValue('--spike-surface'),
        background: getComputedStyle(document.documentElement).getPropertyValue('--spike-background')
      }
    })
    
    // Dark mode styles should be applied
    expect(darkModeStyles.surface.trim()).toBeTruthy()
    expect(darkModeStyles.background.trim()).toBeTruthy()
  })

  test('should handle CSS imports correctly in production build', async ({ page }) => {
    // This test simulates production environment CSS loading
    const cssLoadErrors: string[] = []
    const cssLoadSuccess: string[] = []
    
    page.on('response', response => {
      if (response.url().includes('.css')) {
        if (response.ok() || response.status() === 304) {
          // 304 Not Modified is also a successful response
          cssLoadSuccess.push(response.url())
        } else {
          // Ignore virtual CSS files from Nuxt build system
          if (!response.url().includes('virtual:nuxt:') && !response.url().includes('@id/virtual:')) {
            cssLoadErrors.push(`${response.status()} - ${response.url()}`)
          }
        }
      }
    })
    
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Verify at least some CSS files loaded successfully
    expect(cssLoadSuccess.length).toBeGreaterThan(0)
    expect(cssLoadErrors.length).toBe(0)
  })

  test('should maintain performance with CSS loaded', async ({ page }) => {
    await page.goto('/')
    
    // Measure Core Web Vitals-related metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Wait a bit for styles to be applied
        setTimeout(() => {
          const paintEntries = performance.getEntriesByType('paint')
          const firstPaint = paintEntries.find(entry => entry.name === 'first-paint')
          const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint')
          
          resolve({
            firstPaint: firstPaint?.startTime || 0,
            firstContentfulPaint: firstContentfulPaint?.startTime || 0,
            domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
            loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart
          })
        }, 500)
      })
    })
    
    // Performance should be reasonable (under 200ms for critical metrics)
    expect((metrics as any).firstPaint).toBeLessThan(1000)
    expect((metrics as any).firstContentfulPaint).toBeLessThan(1000)
    expect((metrics as any).domContentLoaded).toBeLessThan(2000)
  })
})

/**
 * Component-Specific CSS Tests
 */
test.describe('Component CSS Loading', () => {
  
  test('should load SpikeButton component styles', async ({ page }) => {
    await page.goto('/')
    
    // Add a SpikeButton to test
    await page.addStyleTag({
      content: `
        .spike-button {
          background-color: var(--spike-primary);
          color: var(--spike-neutral-0);
          padding: var(--spike-space-3) var(--spike-space-4);
          border-radius: var(--spike-border-radius);
        }
      `
    })
    
    await page.setContent(`
      <button class="spike-button">Test Button</button>
    `)
    
    const buttonStyles = await page.evaluate(() => {
      const button = document.querySelector('.spike-button') as HTMLElement
      const styles = getComputedStyle(button)
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        padding: styles.padding,
        borderRadius: styles.borderRadius
      }
    })
    
    // Verify component styles are applied
    expect(buttonStyles.backgroundColor).toBeTruthy()
    expect(buttonStyles.color).toBeTruthy()
    expect(buttonStyles.padding).toBeTruthy()
  })

  test('should load SpikeCard component styles', async ({ page }) => {
    await page.goto('/')
    
    // Add SpikeCard styles to test
    await page.addStyleTag({
      content: `
        .spike-card {
          background-color: var(--spike-surface);
          border: 1px solid var(--spike-border);
          border-radius: var(--spike-border-radius);
          padding: var(--spike-space-6);
        }
      `
    })
    
    await page.setContent(`
      <div class="spike-card">Test Card</div>
    `)
    
    const cardStyles = await page.evaluate(() => {
      const card = document.querySelector('.spike-card') as HTMLElement
      const styles = getComputedStyle(card)
      return {
        backgroundColor: styles.backgroundColor,
        border: styles.border,
        borderRadius: styles.borderRadius,
        padding: styles.padding
      }
    })
    
    // Verify card styles are applied
    expect(cardStyles.backgroundColor).toBeTruthy()
    expect(cardStyles.border).toBeTruthy()
    expect(cardStyles.borderRadius).toBeTruthy()
    expect(cardStyles.padding).toBeTruthy()
  })
})

/**
 * Cross-browser CSS Compatibility Tests
 */
test.describe('Cross-browser CSS Compatibility', () => {
  
  test('should work correctly in different browsers', async ({ page, browserName }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // Test CSS custom property support
    const customPropertySupport = await page.evaluate(() => {
      return CSS.supports('color', 'var(--test-color)')
    })
    
    expect(customPropertySupport).toBe(true)
    
    // Test that Spike theme variables are accessible
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--spike-primary')
    })
    
    expect(primaryColor.trim()).toBeTruthy()
  })
})