import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('should load without errors', async ({ page }) => {
    // Check that the page loads with 200 status
    const response = await page.goto('/dashboard');
    expect(response?.status()).toBe(200);
    
    // Check that there are no console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(1000);
    expect(consoleErrors).toHaveLength(0);
  });

  test('should display all main components', async ({ page }) => {
    // Check sidebar is visible
    const sidebar = page.locator('aside, .sidebar').first();
    await expect(sidebar).toBeVisible();
    
    // Check header/greeting is visible
    const greeting = page.locator('text=/Good (morning|afternoon|evening)/i');
    await expect(greeting).toBeVisible();
    
    // Check main content area exists
    const mainContent = page.locator('main, .main-content').first();
    await expect(mainContent).toBeVisible();
  });

  test('should display sidebar navigation items', async ({ page }) => {
    // Check for main navigation items
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Exams')).toBeVisible();
    await expect(page.locator('text=Study')).toBeVisible();
    await expect(page.locator('text=Progress')).toBeVisible();
  });

  test('should display stats cards with correct data', async ({ page }) => {
    // Check Available Exams card
    const availableExamsCard = page.locator('text=Available Exams').locator('..');
    await expect(availableExamsCard).toBeVisible();
    await expect(availableExamsCard.locator('text=12')).toBeVisible();
    
    // Check Active Sessions card
    const activeSessionsCard = page.locator('text=Active Sessions').locator('..');
    await expect(activeSessionsCard).toBeVisible();
    await expect(activeSessionsCard.locator('text=2')).toBeVisible();
    
    // Check Tests Completed card
    const testsCompletedCard = page.locator('text=Tests Completed').locator('..');
    await expect(testsCompletedCard).toBeVisible();
    await expect(testsCompletedCard.locator('text=5')).toBeVisible();
  });

  test('should display certification exam cards', async ({ page }) => {
    // Check for the certification exams section
    await expect(page.locator('text=EXPLORE OUR CERTIFICATION EXAMS')).toBeVisible();
    
    // Check for specific certification cards
    await expect(page.locator('text=N10-008')).toBeVisible();
    await expect(page.locator('text=CompTIA Network+')).toBeVisible();
    
    await expect(page.locator('text=XK0-005')).toBeVisible();
    await expect(page.locator('text=CompTIA Linux+')).toBeVisible();
    
    await expect(page.locator('text=SY0-701')).toBeVisible();
    await expect(page.locator('text=CompTIA Security+')).toBeVisible();
  });

  test('should have working Continue Learning button', async ({ page }) => {
    const continueButton = page.locator('text=Continue Learning');
    await expect(continueButton).toBeVisible();
    
    // Check that button is clickable
    await expect(continueButton).toBeEnabled();
  });

  test('should have proper responsive design', async ({ page, viewport }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    const desktopSidebar = page.locator('aside, .sidebar').first();
    await expect(desktopSidebar).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500); // Wait for responsive changes
    
    // On mobile, sidebar might be hidden or transformed
    const mobileContent = page.locator('main, .main-content').first();
    await expect(mobileContent).toBeVisible();
  });

  test('should display user progress/XP bar', async ({ page }) => {
    const xpBar = page.locator('text=/Level \\d+/i').or(page.locator('text=/\\d+\\/\\d+ XP/i'));
    await expect(xpBar).toBeVisible();
  });

  test('should have proper CSS styling', async ({ page }) => {
    // Check that the body has background color
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    expect(bodyBgColor).not.toBe('');
    expect(bodyBgColor).not.toBe('rgba(0, 0, 0, 0)');
    
    // Check that cards have proper styling
    const cardElement = page.locator('.stats-card, [class*="card"]').first();
    const cardBgColor = await cardElement.evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    expect(cardBgColor).toBeTruthy();
    
    // Check that text is readable
    const textElement = page.locator('h1, h2, h3, p').first();
    const textColor = await textElement.evaluate(el => {
      return window.getComputedStyle(el).color;
    });
    expect(textColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('should handle navigation clicks', async ({ page }) => {
    // Click on Exams navigation
    await page.locator('text=Exams').click();
    await expect(page).toHaveURL(/\/exams/);
    
    // Go back to dashboard
    await page.goto('/dashboard');
    
    // Click on Study navigation
    await page.locator('text=Study').first().click();
    await expect(page).toHaveURL(/\/study/);
  });

  test('should display footer information', async ({ page }) => {
    // Scroll to bottom to ensure footer is loaded
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Check for footer elements
    await expect(page.locator('text=PingToPass')).toBeVisible();
    await expect(page.locator('text=/2025|All rights reserved/i')).toBeVisible();
  });

  test('should have no accessibility violations', async ({ page }) => {
    // Check for basic accessibility attributes
    const buttons = await page.locator('button, [role="button"]').all();
    for (const button of buttons.slice(0, 5)) { // Check first 5 buttons
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      expect(ariaLabel || textContent).toBeTruthy();
    }
    
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(1); // Should only have one h1
    
    // Check images have alt text
    const images = await page.locator('img').all();
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const ariaHidden = await img.getAttribute('aria-hidden');
      expect(alt || ariaLabel || ariaHidden === 'true').toBeTruthy();
    }
  });
});

test.describe('Dashboard Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);
    
    // First contentful paint should be fast
    const fcp = await page.evaluate(() => {
      const entry = performance.getEntriesByType('paint').find(
        e => e.name === 'first-contentful-paint'
      );
      return entry ? entry.startTime : null;
    });
    
    if (fcp) {
      expect(fcp).toBeLessThan(1500); // FCP should be under 1.5 seconds
    }
  });

  test('should not have memory leaks on navigation', async ({ page }) => {
    // Navigate to dashboard multiple times
    for (let i = 0; i < 3; i++) {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    }
    
    // Check that memory usage is reasonable
    const metrics = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (metrics) {
      // Memory should not exceed reasonable limits
      expect(metrics.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB
    }
  });
});