import { test, expect } from '@playwright/test'

test.describe('Visual Debug - CSS and Hydration', () => {
  test('capture screenshots of index page', async ({ page }) => {
    // Navigate to the page
    await page.goto('http://localhost:3002/', { waitUntil: 'networkidle' })
    
    // Wait for the page to fully load
    await page.waitForTimeout(2000)
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'test-results/index-full-page.png', 
      fullPage: true 
    })
    
    // Take viewport screenshot
    await page.screenshot({ 
      path: 'test-results/index-viewport.png' 
    })
    
    // Check if Spike CSS is loaded
    const spikeThemeLoaded = await page.evaluate(() => {
      const rootStyles = getComputedStyle(document.documentElement)
      const primaryColor = rootStyles.getPropertyValue('--spike-primary')
      return {
        primaryColor,
        hasPrimaryColor: !!primaryColor,
        bodyBgColor: getComputedStyle(document.body).backgroundColor,
        bodyFont: getComputedStyle(document.body).fontFamily
      }
    })
    
    console.log('Spike Theme Status:', spikeThemeLoaded)
    
    // Check for specific elements
    const heroSection = await page.locator('.spike-hero-section')
    if (await heroSection.isVisible()) {
      await heroSection.screenshot({ 
        path: 'test-results/hero-section.png' 
      })
    }
    
    const buttons = await page.locator('.spike-button').all()
    console.log(`Found ${buttons.length} spike buttons`)
    
    // Check for hydration issues by looking at console errors
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleErrors.push(msg.text())
      }
    })
    
    // Take screenshot of buttons area
    const buttonGroup = await page.locator('.spike-button-group')
    if (await buttonGroup.isVisible()) {
      await buttonGroup.screenshot({ 
        path: 'test-results/button-group.png' 
      })
    }
    
    // Check ExamList component
    const examList = await page.locator('.exam-list-container')
    if (await examList.isVisible()) {
      await examList.screenshot({ 
        path: 'test-results/exam-list.png' 
      })
    }
    
    // Log all CSS files loaded
    const cssFiles = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      return links.map(link => (link as HTMLLinkElement).href)
    })
    
    console.log('CSS Files Loaded:', cssFiles)
    
    // Check computed styles on key elements
    const computedStyles = await page.evaluate(() => {
      const button = document.querySelector('.spike-button')
      const card = document.querySelector('.spike-card')
      
      return {
        button: button ? {
          backgroundColor: getComputedStyle(button).backgroundColor,
          color: getComputedStyle(button).color,
          fontFamily: getComputedStyle(button).fontFamily
        } : null,
        card: card ? {
          boxShadow: getComputedStyle(card).boxShadow,
          borderRadius: getComputedStyle(card).borderRadius
        } : null
      }
    })
    
    console.log('Computed Styles:', computedStyles)
    
    // Save page HTML for debugging
    const html = await page.content()
    const fs = require('fs')
    fs.writeFileSync('test-results/index-page.html', html)
    
    // Assert that Spike theme is loaded
    expect(spikeThemeLoaded.hasPrimaryColor).toBe(true)
    expect(spikeThemeLoaded.primaryColor).toBeTruthy()
  })
  
  test('check for hydration mismatches', async ({ page }) => {
    const errors: string[] = []
    
    // Capture console warnings/errors
    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('Hydration')) {
        errors.push(msg.text())
      }
    })
    
    await page.goto('http://localhost:3002/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    
    // Check specific problem area
    const clientOnly = await page.locator('client-only').all()
    console.log(`Found ${clientOnly.length} ClientOnly components`)
    
    // Log all hydration errors found
    console.log('Hydration Errors:', errors)
    
    // Take screenshot highlighting problem areas
    await page.screenshot({ 
      path: 'test-results/hydration-check.png',
      fullPage: true
    })
  })
})