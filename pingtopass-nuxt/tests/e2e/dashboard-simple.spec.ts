import { test, expect } from '@playwright/test';

// Override the base URL for this test
test.use({
  baseURL: 'http://localhost:3002'
});

test.describe('Dashboard Basic Tests', () => {
  test('dashboard loads successfully', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for content to load
    await page.waitForLoadState('domcontentloaded');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'dashboard-test.png', fullPage: true });
    
    // Check that key elements are visible
    const sidebar = await page.locator('aside, nav').first().isVisible();
    console.log('Sidebar visible:', sidebar);
    expect(sidebar).toBe(true);
    
    // Check for greeting message
    const greeting = await page.locator('text=/Good (morning|afternoon|evening)/i').isVisible();
    console.log('Greeting visible:', greeting);
    expect(greeting).toBe(true);
    
    // Check for stats cards
    const statsCards = await page.locator('[class*="card"]').count();
    console.log('Number of cards found:', statsCards);
    expect(statsCards).toBeGreaterThan(0);
    
    // Check specific stats
    const availableExams = await page.locator('text=Available Exams').isVisible();
    expect(availableExams).toBe(true);
    
    const activeSessionsText = await page.locator('text=Active Sessions').isVisible();
    expect(activeSessionsText).toBe(true);
    
    const testsCompleted = await page.locator('text=Tests Completed').isVisible();
    expect(testsCompleted).toBe(true);
    
    // Check for certification cards
    const certSection = await page.locator('text=/EXPLORE.*CERTIFICATION.*EXAMS/i').isVisible();
    expect(certSection).toBe(true);
    
    // Check for specific certifications
    const networkPlus = await page.locator('text=N10-008').isVisible();
    expect(networkPlus).toBe(true);
    
    const linuxPlus = await page.locator('text=XK0-005').isVisible();
    expect(linuxPlus).toBe(true);
    
    const securityPlus = await page.locator('text=SY0-701').isVisible();
    expect(securityPlus).toBe(true);
  });

  test('dashboard has no critical CSS errors', async ({ page }) => {
    const errors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('No match found for location')) {
        errors.push(msg.text());
      }
    });
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    // Check for CSS-related errors
    const cssErrors = errors.filter(e => 
      e.toLowerCase().includes('css') || 
      e.toLowerCase().includes('style') || 
      e.toLowerCase().includes('tailwind')
    );
    
    console.log('CSS-related errors:', cssErrors);
    expect(cssErrors).toHaveLength(0);
    
    // Verify styles are applied
    const body = page.locator('body');
    const bgColor = await body.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    console.log('Body background color:', bgColor);
    expect(bgColor).not.toBe('');
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
    
    // Check that cards have styling
    const firstCard = page.locator('[class*="card"]').first();
    const cardStyles = await firstCard.evaluate(el => ({
      backgroundColor: window.getComputedStyle(el).backgroundColor,
      borderRadius: window.getComputedStyle(el).borderRadius,
      padding: window.getComputedStyle(el).padding
    }));
    
    console.log('Card styles:', cardStyles);
    expect(cardStyles.backgroundColor).not.toBe('');
  });

  test('dashboard is responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard');
    
    const desktopSidebar = await page.locator('aside, nav').first().isVisible();
    expect(desktopSidebar).toBe(true);
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    const tabletContent = await page.locator('main, [role="main"]').first().isVisible();
    expect(tabletContent).toBe(true);
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    
    const mobileContent = await page.locator('main, [role="main"]').first().isVisible();
    expect(mobileContent).toBe(true);
  });
});