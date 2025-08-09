import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, $fetch, createPage } from '@nuxt/test-utils/e2e';

describe('Dashboard User Flow Integration Tests', () => {
  
  beforeAll(async () => {
    await setup({
      rootDir: fileURLToPath(new URL('..', import.meta.url)),
      server: true,
      browser: true
    });
  });

  describe('Complete Dashboard Navigation Flow', () => {
    
    it('should load dashboard and navigate between views', async () => {
      // Given: An authenticated user
      const page = await createPage('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: User views main dashboard
      // Then: Should display all dashboard sections
      await expect(page.locator('[data-test="user-greeting"]')).toBeVisible();
      await expect(page.locator('[data-test="stats-grid"]')).toBeVisible();
      await expect(page.locator('[data-test="featured-exams"]')).toBeVisible();
      await expect(page.locator('[data-test="daily-goal"]')).toBeVisible();

      // When: User clicks on "Browse Exams"
      await page.click('[data-test="nav-browse-exams"]');
      await page.waitForURL('**/exams');

      // Then: Should show exams page with filters
      await expect(page.locator('[data-test="exam-filters"]')).toBeVisible();
      await expect(page.locator('[data-test="exam-search"]')).toBeVisible();
      await expect(page.locator('[data-test="exam-grid"]')).toBeVisible();

      // When: User selects a certification
      await page.click('[data-test="cert-card-comptia-n10-008"]');
      
      // Then: Should show certification details
      await expect(page.locator('[data-test="cert-details"]')).toBeVisible();
      await expect(page.locator('[data-test="start-study-btn"]')).toBeVisible();
    });

    it('should handle theme switching persistently', async () => {
      // Given: User on dashboard with light theme
      const page = await createPage('/dashboard');
      
      // When: User toggles to dark theme
      await page.click('[data-test="theme-toggle"]');
      
      // Then: Should apply dark theme
      const htmlElement = page.locator('html');
      await expect(htmlElement).toHaveAttribute('data-theme', 'dark');

      // When: User refreshes the page
      await page.reload();
      
      // Then: Dark theme should persist
      await expect(htmlElement).toHaveAttribute('data-theme', 'dark');
    });

    it('should update statistics in real-time after test completion', async () => {
      // Given: User completes a practice test
      const page = await createPage('/dashboard');
      const initialTests = await page.locator('[data-test="tests-completed-value"]').textContent();

      // When: User completes a test (simulated)
      await page.goto('/test/practice');
      await page.click('[data-test="start-test-btn"]');
      
      // Simulate answering questions
      for (let i = 0; i < 10; i++) {
        await page.click('[data-test="answer-option-a"]');
        await page.click('[data-test="next-question-btn"]');
      }
      
      await page.click('[data-test="submit-test-btn"]');
      await page.waitForURL('**/test/results/**');

      // When: User returns to dashboard
      await page.goto('/dashboard');
      
      // Then: Statistics should be updated
      const updatedTests = await page.locator('[data-test="tests-completed-value"]').textContent();
      expect(parseInt(updatedTests)).toBe(parseInt(initialTests) + 1);
    });

    it('should track XP gain and level progression', async () => {
      // Given: User with current XP
      const page = await createPage('/dashboard');
      const initialXP = await page.locator('[data-test="current-xp"]').textContent();

      // When: User completes study session
      await page.goto('/study/session');
      await page.click('[data-test="start-session-btn"]');
      
      // Answer 5 questions correctly
      for (let i = 0; i < 5; i++) {
        await page.click('[data-test="correct-answer"]');
        await page.click('[data-test="next-btn"]');
      }
      
      await page.click('[data-test="end-session-btn"]');

      // Then: XP should increase
      await page.goto('/dashboard');
      const updatedXP = await page.locator('[data-test="current-xp"]').textContent();
      expect(parseInt(updatedXP)).toBeGreaterThan(parseInt(initialXP));
    });
  });

  describe('Data Consistency Across Views', () => {
    
    it('should maintain consistent user data across all views', async () => {
      // Given: User profile data
      const page = await createPage('/dashboard');
      const dashboardName = await page.locator('[data-test="user-name"]').textContent();
      const dashboardLevel = await page.locator('[data-test="user-level"]').textContent();

      // When: Navigating to different views
      await page.goto('/exams');
      const examsName = await page.locator('[data-test="user-name"]').textContent();

      await page.goto('/test');
      const testName = await page.locator('[data-test="user-name"]').textContent();

      // Then: User data should be consistent
      expect(examsName).toBe(dashboardName);
      expect(testName).toBe(dashboardName);
    });

    it('should sync progress across study and test modes', async () => {
      // Given: User studies specific topics
      const page = await createPage('/study');
      await page.click('[data-test="topic-networking"]');
      await page.click('[data-test="start-study"]');
      
      // Study 10 questions
      for (let i = 0; i < 10; i++) {
        await page.click('[data-test="show-explanation"]');
        await page.click('[data-test="next-question"]');
      }

      // When: User takes a test on the same topic
      await page.goto('/test');
      await page.click('[data-test="topic-networking"]');
      
      // Then: Should show studied questions indicator
      await expect(page.locator('[data-test="questions-studied"]')).toContainText('10');
    });
  });

  describe('Performance and Edge Caching', () => {
    
    it('should load dashboard under 200ms with cache', async () => {
      // Given: First load to prime cache
      const page = await createPage('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: Second load (should hit cache)
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('domcontentloaded');
      const loadTime = Date.now() - startTime;

      // Then: Should load under 200ms
      expect(loadTime).toBeLessThan(200);
    });

    it('should prefetch exam data on hover', async () => {
      // Given: User on dashboard
      const page = await createPage('/dashboard');

      // When: User hovers over exam card
      await page.hover('[data-test="exam-card-aws-saa"]');

      // Then: Should trigger prefetch
      const prefetchRequests = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(entry => entry.name.includes('/api/exams/aws-saa'))
          .length;
      });
      
      expect(prefetchRequests).toBeGreaterThan(0);
    });

    it('should handle offline mode with cached data', async () => {
      // Given: User has visited dashboard (data cached)
      const page = await createPage('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: Going offline
      await page.context().setOffline(true);
      await page.reload();

      // Then: Should still display cached data
      await expect(page.locator('[data-test="offline-banner"]')).toBeVisible();
      await expect(page.locator('[data-test="cached-stats"]')).toBeVisible();
    });
  });

  describe('Error Handling and Recovery', () => {
    
    it('should handle API failures gracefully', async () => {
      // Given: API endpoint failure (mocked)
      const page = await createPage('/dashboard');
      
      // Intercept and fail stats API
      await page.route('**/api/dashboard/stats', route => {
        route.abort('failed');
      });

      // When: Loading dashboard
      await page.reload();

      // Then: Should show error state with retry option
      await expect(page.locator('[data-test="error-message"]')).toBeVisible();
      await expect(page.locator('[data-test="retry-btn"]')).toBeVisible();

      // When: User clicks retry (with fixed API)
      await page.unroute('**/api/dashboard/stats');
      await page.click('[data-test="retry-btn"]');

      // Then: Should load successfully
      await expect(page.locator('[data-test="stats-grid"]')).toBeVisible();
    });

    it('should handle session timeout appropriately', async () => {
      // Given: User with expired session
      const page = await createPage('/dashboard');
      
      // Simulate session expiry
      await page.evaluate(() => {
        localStorage.removeItem('auth-token');
      });

      // When: User tries to perform authenticated action
      await page.click('[data-test="start-test-btn"]');

      // Then: Should redirect to login with return URL
      await expect(page).toHaveURL(/\/login\?return=.*dashboard/);
    });
  });
});