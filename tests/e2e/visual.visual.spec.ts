/**
 * Visual Regression E2E Tests
 * Screenshot-based testing for UI consistency
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Visual Regression Tests @visual', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Mock authentication for consistent UI state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'visual_test_token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'visual.test@example.com',
        name: 'Visual Test User',
        subscription_status: 'premium'
      }));
    });
    
    // Wait for fonts to load
    await page.waitForLoadState('networkidle');
  });
  
  test.describe('Landing Page', () => {
    test('homepage above the fold', async () => {
      await page.goto('/');
      
      // Wait for animations to complete
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('homepage-hero-section.png', {
        clip: { x: 0, y: 0, width: 1280, height: 720 }
      });
    });
    
    test('homepage full page', async () => {
      await page.goto('/');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('homepage-full.png', {
        fullPage: true
      });
    });
    
    test('pricing section', async () => {
      await page.goto('/');
      
      // Scroll to pricing section
      await page.locator('[data-test="pricing-section"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      await expect(page.locator('[data-test="pricing-section"]')).toHaveScreenshot('pricing-section.png');
    });
    
    test('features showcase', async () => {
      await page.goto('/');
      
      await page.locator('[data-test="features-section"]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      
      await expect(page.locator('[data-test="features-section"]')).toHaveScreenshot('features-section.png');
    });
  });
  
  test.describe('Dashboard', () => {
    test('dashboard main view', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('dashboard-main.png');
    });
    
    test('exam cards layout', async () => {
      await page.goto('/dashboard');
      
      await expect(page.locator('[data-test="exams-grid"]')).toHaveScreenshot('exam-cards.png');
    });
    
    test('progress summary widget', async () => {
      await page.goto('/dashboard');
      
      await expect(page.locator('[data-test="progress-summary"]')).toHaveScreenshot('progress-summary.png');
    });
    
    test('recent activity section', async () => {
      await page.goto('/dashboard');
      
      await expect(page.locator('[data-test="recent-activity"]')).toHaveScreenshot('recent-activity.png');
    });
  });
  
  test.describe('Study Interface', () => {
    test('session configuration modal', async () => {
      await page.goto('/dashboard');
      await page.click('[data-test="exam-card-comptia-network"]');
      await page.click('[data-test="start-practice-btn"]');
      
      // Wait for modal animation
      await page.waitForTimeout(300);
      
      await expect(page.locator('[data-test="session-config-modal"]')).toHaveScreenshot('session-config-modal.png');
    });
    
    test('question interface - multiple choice', async () => {
      await page.goto('/dashboard');
      await page.click('[data-test="exam-card-comptia-network"]');
      await page.click('[data-test="start-practice-btn"]');
      await page.click('[data-test="start-session-btn"]');
      
      // Wait for question to load
      await expect(page.locator('[data-test="question-text"]')).toBeVisible();
      
      await expect(page.locator('[data-test="question-container"]')).toHaveScreenshot('question-multiple-choice.png');
    });
    
    test('question interface - with explanation', async () => {
      await page.goto('/dashboard');
      await page.click('[data-test="exam-card-comptia-network"]');
      await page.click('[data-test="start-practice-btn"]');
      await page.click('[data-test="start-session-btn"]');
      
      // Answer a question to show explanation
      await page.click('[data-test="answer-a"]');
      await page.click('[data-test="submit-answer-btn"]');
      
      // Wait for explanation to appear
      await expect(page.locator('[data-test="answer-feedback"]')).toBeVisible();
      
      await expect(page.locator('[data-test="question-container"]')).toHaveScreenshot('question-with-explanation.png');
    });
    
    test('session progress bar', async () => {
      await page.goto('/dashboard');
      await page.click('[data-test="exam-card-comptia-network"]');
      await page.click('[data-test="start-practice-btn"]');
      await page.click('[data-test="start-session-btn"]');
      
      await expect(page.locator('[data-test="progress-bar"]')).toHaveScreenshot('session-progress-bar.png');
    });
    
    test('session results page', async () => {
      await page.goto('/study/results/123');
      
      // Mock results data
      await page.route('**/api/sessions/123/results', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              session: {
                id: 123,
                total_questions: 20,
                correct_answers: 15,
                time_spent_seconds: 1200,
                score_percentage: 75,
                pass_status: 'pass'
              },
              mastery_scores: {
                'Network Fundamentals': 80,
                'Network Security': 70,
                'Troubleshooting': 85
              }
            }
          })
        });
      });
      
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('session-results.png');
    });
  });
  
  test.describe('Responsive Design', () => {
    test('mobile dashboard', async ({ browser }) => {
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 } // iPhone SE
      });
      
      const mobilePage = await mobileContext.newPage();
      
      // Setup auth
      await mobilePage.goto('/');
      await mobilePage.evaluate(() => {
        localStorage.setItem('auth_token', 'mobile_test_token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'mobile@example.com',
          name: 'Mobile User'
        }));
      });
      
      await mobilePage.goto('/dashboard');
      await mobilePage.waitForLoadState('networkidle');
      
      await expect(mobilePage).toHaveScreenshot('mobile-dashboard.png');
      
      await mobileContext.close();
    });
    
    test('tablet study interface', async ({ browser }) => {
      const tabletContext = await browser.newContext({
        viewport: { width: 768, height: 1024 } // iPad
      });
      
      const tabletPage = await tabletContext.newPage();
      
      await tabletPage.goto('/');
      await tabletPage.evaluate(() => {
        localStorage.setItem('auth_token', 'tablet_test_token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'tablet@example.com',
          name: 'Tablet User'
        }));
      });
      
      await tabletPage.goto('/dashboard');
      await tabletPage.click('[data-test="exam-card-comptia-network"]');
      await tabletPage.click('[data-test="start-practice-btn"]');
      await tabletPage.click('[data-test="start-session-btn"]');
      
      await expect(tabletPage.locator('[data-test="question-container"]')).toBeVisible();
      
      await expect(tabletPage).toHaveScreenshot('tablet-question-interface.png');
      
      await tabletContext.close();
    });
    
    test('desktop wide screen', async ({ browser }) => {
      const wideContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 }
      });
      
      const widePage = await wideContext.newPage();
      
      await widePage.goto('/');
      await widePage.evaluate(() => {
        localStorage.setItem('auth_token', 'wide_test_token');
        localStorage.setItem('user', JSON.stringify({
          id: 1,
          email: 'wide@example.com',
          name: 'Wide Screen User'
        }));
      });
      
      await widePage.goto('/dashboard');
      await widePage.waitForLoadState('networkidle');
      
      await expect(widePage).toHaveScreenshot('desktop-wide-dashboard.png');
      
      await wideContext.close();
    });
  });
  
  test.describe('Dark Mode', () => {
    test('dashboard in dark mode', async () => {
      // Enable dark mode
      await page.goto('/dashboard');
      await page.click('[data-test="theme-toggle"]');
      
      // Wait for theme transition
      await page.waitForTimeout(500);
      
      await expect(page).toHaveScreenshot('dashboard-dark-mode.png');
    });
    
    test('question interface in dark mode', async () => {
      await page.goto('/dashboard');
      await page.click('[data-test="theme-toggle"]');
      
      await page.click('[data-test="exam-card-comptia-network"]');
      await page.click('[data-test="start-practice-btn"]');
      await page.click('[data-test="start-session-btn"]');
      
      await expect(page.locator('[data-test="question-container"]')).toHaveScreenshot('question-dark-mode.png');
    });
  });
  
  test.describe('UI Components', () => {
    test('loading states', async () => {
      await page.goto('/dashboard');
      
      // Mock slow API response to capture loading state
      await page.route('**/api/sessions', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ data: [] })
        });
      });
      
      await page.click('[data-test="view-sessions-btn"]');
      
      // Capture loading skeleton
      await expect(page.locator('[data-test="sessions-loading"]')).toHaveScreenshot('loading-skeleton.png');
    });
    
    test('error states', async () => {
      await page.goto('/dashboard');
      
      // Mock API error
      await page.route('**/api/sessions', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          })
        });
      });
      
      await page.click('[data-test="view-sessions-btn"]');
      
      await expect(page.locator('[data-test="error-message"]')).toBeVisible();
      await expect(page.locator('[data-test="error-container"]')).toHaveScreenshot('error-state.png');
    });
    
    test('empty states', async () => {
      await page.goto('/dashboard');
      
      // Mock empty response
      await page.route('**/api/sessions', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { sessions: [] }
          })
        });
      });
      
      await page.click('[data-test="view-sessions-btn"]');
      
      await expect(page.locator('[data-test="empty-state"]')).toBeVisible();
      await expect(page.locator('[data-test="empty-state"]')).toHaveScreenshot('empty-state.png');
    });
    
    test('modal dialogs', async () => {
      await page.goto('/profile');
      
      await page.click('[data-test="delete-account-btn"]');
      
      await expect(page.locator('[data-test="confirmation-modal"]')).toBeVisible();
      await expect(page.locator('[data-test="confirmation-modal"]')).toHaveScreenshot('confirmation-modal.png');
    });
    
    test('form validation', async () => {
      await page.goto('/profile');
      
      // Clear required field and try to submit
      await page.fill('[data-test="name-input"]', '');
      await page.click('[data-test="save-profile-btn"]');
      
      // Wait for validation messages
      await expect(page.locator('[data-test="validation-error"]')).toBeVisible();
      
      await expect(page.locator('[data-test="profile-form"]')).toHaveScreenshot('form-validation-errors.png');
    });
    
    test('notification toasts', async () => {
      await page.goto('/dashboard');
      
      // Trigger a success notification
      await page.click('[data-test="exam-card-comptia-network"]');
      
      // Mock successful action
      await page.evaluate(() => {
        // Simulate toast notification
        const toast = document.createElement('div');
        toast.setAttribute('data-test', 'success-toast');
        toast.textContent = 'Session started successfully!';
        toast.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 16px;
          border-radius: 8px;
          z-index: 1000;
        `;
        document.body.appendChild(toast);
      });
      
      await expect(page.locator('[data-test="success-toast"]')).toBeVisible();
      
      // Screenshot just the toast area
      await expect(page.locator('[data-test="success-toast"]')).toHaveScreenshot('success-toast.png');
    });
  });
  
  test.describe('Animation States', () => {
    test('hover effects on buttons', async () => {
      await page.goto('/dashboard');
      
      // Hover over primary button
      await page.hover('[data-test="start-practice-btn"]');
      
      // Wait for hover animation
      await page.waitForTimeout(200);
      
      await expect(page.locator('[data-test="start-practice-btn"]')).toHaveScreenshot('button-hover-state.png');
    });
    
    test('card hover animations', async () => {
      await page.goto('/dashboard');
      
      await page.hover('[data-test="exam-card-comptia-network"]');
      await page.waitForTimeout(300);
      
      await expect(page.locator('[data-test="exam-card-comptia-network"]')).toHaveScreenshot('card-hover-state.png');
    });
    
    test('progress bar animation', async () => {
      await page.goto('/dashboard');
      await page.click('[data-test="exam-card-comptia-network"]');
      await page.click('[data-test="start-practice-btn"]');
      await page.click('[data-test="start-session-btn"]');
      
      // Answer first question
      await page.click('[data-test="answer-a"]');
      await page.click('[data-test="submit-answer-btn"]');
      await page.click('[data-test="next-question-btn"]');
      
      // Progress should have animated
      await page.waitForTimeout(500);
      
      await expect(page.locator('[data-test="progress-bar"]')).toHaveScreenshot('progress-bar-animated.png');
    });
  });
  
  test.describe('Cross-browser Consistency', () => {
    test('firefox rendering', async ({ browserName }) => {
      test.skip(browserName !== 'firefox');
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('firefox-dashboard.png');
    });
    
    test('webkit rendering', async ({ browserName }) => {
      test.skip(browserName !== 'webkit');
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('webkit-dashboard.png');
    });
  });
  
  test.describe('Print Styles', () => {
    test('session results print view', async () => {
      await page.goto('/study/results/123');
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      await expect(page).toHaveScreenshot('results-print-view.png', {
        fullPage: true
      });
    });
    
    test('certificate print view', async () => {
      await page.goto('/certificates/123');
      
      await page.emulateMedia({ media: 'print' });
      
      await expect(page).toHaveScreenshot('certificate-print-view.png', {
        fullPage: true
      });
    });
  });
});