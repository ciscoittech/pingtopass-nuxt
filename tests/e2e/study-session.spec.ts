/**
 * Study Session E2E Tests
 * Complete user journey testing for study sessions
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Study Session Flow', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Mock authentication - in real tests, use actual OAuth flow
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test_token_123');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        subscription_status: 'premium'
      }));
    });
  });
  
  test('complete practice session with 10 questions', async () => {
    // 1. Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveTitle(/PingToPass - Dashboard/);
    
    // 2. Select CompTIA Network+ exam
    await page.click('[data-test="exam-card-comptia-network"]');
    await expect(page).toHaveURL('/exams/comptia-network');
    
    // 3. Start practice session
    await page.click('[data-test="start-practice-btn"]');
    
    // Wait for session configuration modal
    await expect(page.locator('[data-test="session-config-modal"]')).toBeVisible();
    
    // 4. Configure session
    await page.fill('[data-test="question-count"]', '10');
    await page.click('[data-test="objective-1"]'); // Select objective
    await page.click('[data-test="objective-2"]'); // Select another
    await page.selectOption('[data-test="difficulty"]', 'medium');
    await page.click('[data-test="start-session-btn"]');
    
    // 5. Answer questions
    await expect(page).toHaveURL(/\/study\/session\//);
    
    for (let i = 1; i <= 10; i++) {
      // Wait for question to load
      await expect(page.locator('[data-test="question-number"]')).toContainText(`Question ${i} of 10`);
      await expect(page.locator('[data-test="question-text"]')).toBeVisible();
      
      // Verify all answer options are visible
      await expect(page.locator('[data-test="answer-a"]')).toBeVisible();
      await expect(page.locator('[data-test="answer-b"]')).toBeVisible();
      await expect(page.locator('[data-test="answer-c"]')).toBeVisible();
      await expect(page.locator('[data-test="answer-d"]')).toBeVisible();
      
      // Select an answer (rotate through options)
      const answerChoice = ['a', 'b', 'c', 'd'][i % 4];
      await page.click(`[data-test="answer-${answerChoice}"]`);
      
      // Submit answer
      await page.click('[data-test="submit-answer-btn"]');
      
      // Wait for feedback
      await expect(page.locator('[data-test="answer-feedback"]')).toBeVisible();
      
      // Check if explanation is shown
      await expect(page.locator('[data-test="explanation"]')).toBeVisible();
      
      // Flag question for review (every 3rd question)
      if (i % 3 === 0) {
        await page.click('[data-test="flag-for-review"]');
        await expect(page.locator('[data-test="flag-icon"]')).toHaveClass(/flagged/);
      }
      
      // Continue to next question
      if (i < 10) {
        await page.click('[data-test="next-question-btn"]');
      }
    }
    
    // 6. Complete session
    await page.click('[data-test="finish-session-btn"]');
    
    // 7. View results
    await expect(page).toHaveURL(/\/study\/results\//);
    await expect(page.locator('[data-test="session-complete"]')).toBeVisible();
    
    // Verify results display
    await expect(page.locator('[data-test="total-questions"]')).toContainText('10');
    await expect(page.locator('[data-test="correct-answers"]')).toBeVisible();
    await expect(page.locator('[data-test="accuracy-percentage"]')).toBeVisible();
    await expect(page.locator('[data-test="time-spent"]')).toBeVisible();
    
    // Check mastery scores
    await expect(page.locator('[data-test="mastery-chart"]')).toBeVisible();
    
    // Review flagged questions
    await page.click('[data-test="review-flagged-btn"]');
    await expect(page.locator('[data-test="flagged-questions-list"]')).toBeVisible();
    
    // Return to dashboard
    await page.click('[data-test="back-to-dashboard"]');
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('resume paused session', async () => {
    // Start a session
    await page.goto('/dashboard');
    await page.click('[data-test="exam-card-comptia-network"]');
    await page.click('[data-test="start-practice-btn"]');
    
    // Configure and start
    await page.fill('[data-test="question-count"]', '20');
    await page.click('[data-test="start-session-btn"]');
    
    // Answer 5 questions
    for (let i = 1; i <= 5; i++) {
      await page.click('[data-test="answer-a"]');
      await page.click('[data-test="submit-answer-btn"]');
      if (i < 5) {
        await page.click('[data-test="next-question-btn"]');
      }
    }
    
    // Pause session
    await page.click('[data-test="pause-session-btn"]');
    await expect(page.locator('[data-test="pause-confirmation"]')).toBeVisible();
    await page.click('[data-test="confirm-pause"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    
    // Verify paused session indicator
    await expect(page.locator('[data-test="paused-session-banner"]')).toBeVisible();
    await expect(page.locator('[data-test="paused-session-banner"]')).toContainText('5 of 20 questions completed');
    
    // Resume session
    await page.click('[data-test="resume-session-btn"]');
    
    // Should continue from question 6
    await expect(page.locator('[data-test="question-number"]')).toContainText('Question 6 of 20');
  });
  
  test('handle network errors gracefully', async () => {
    await page.goto('/dashboard');
    await page.click('[data-test="exam-card-comptia-network"]');
    await page.click('[data-test="start-practice-btn"]');
    await page.click('[data-test="start-session-btn"]');
    
    // Simulate offline mode
    await page.context().setOffline(true);
    
    // Try to submit answer
    await page.click('[data-test="answer-a"]');
    await page.click('[data-test="submit-answer-btn"]');
    
    // Should show error message
    await expect(page.locator('[data-test="error-notification"]')).toBeVisible();
    await expect(page.locator('[data-test="error-notification"]')).toContainText(/connection error/i);
    
    // Answer should be saved locally
    await expect(page.locator('[data-test="saved-locally-indicator"]')).toBeVisible();
    
    // Go back online
    await page.context().setOffline(false);
    
    // Should auto-retry or allow manual retry
    await page.click('[data-test="retry-submission"]');
    
    // Should succeed
    await expect(page.locator('[data-test="answer-feedback"]')).toBeVisible();
  });
  
  test('performance: questions load under 200ms', async () => {
    await page.goto('/dashboard');
    await page.click('[data-test="exam-card-comptia-network"]');
    await page.click('[data-test="start-practice-btn"]');
    await page.click('[data-test="start-session-btn"]');
    
    // Measure question load time
    const loadTimes: number[] = [];
    
    for (let i = 1; i <= 5; i++) {
      const startTime = Date.now();
      
      if (i > 1) {
        await page.click('[data-test="next-question-btn"]');
      }
      
      await expect(page.locator('[data-test="question-text"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      loadTimes.push(loadTime);
      
      // Quick answer to move forward
      await page.click('[data-test="answer-a"]');
      await page.click('[data-test="submit-answer-btn"]');
    }
    
    // Check all load times are under 200ms
    const averageLoadTime = loadTimes.reduce((a, b) => a + b, 0) / loadTimes.length;
    console.log(`Average question load time: ${averageLoadTime}ms`);
    
    expect(averageLoadTime).toBeLessThan(200);
    loadTimes.forEach(time => {
      expect(time).toBeLessThan(300); // Individual questions should be under 300ms
    });
  });
  
  test('accessibility: keyboard navigation', async () => {
    await page.goto('/dashboard');
    
    // Navigate to exam using keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Select exam
    
    await expect(page).toHaveURL(/\/exams\//);
    
    // Start session with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Start practice
    
    // Configure session
    await page.keyboard.press('Tab');
    await page.keyboard.type('10'); // Question count
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // Select objective
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Start session
    
    // Answer question with keyboard
    await expect(page.locator('[data-test="question-text"]')).toBeVisible();
    
    // Navigate to answer
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // Select answer A
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Submit answer
    
    // Verify feedback is shown
    await expect(page.locator('[data-test="answer-feedback"]')).toBeVisible();
  });
  
  test('mobile responsiveness', async ({ browser }) => {
    // Create mobile context
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }, // iPhone SE
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
    });
    
    const mobilePage = await mobileContext.newPage();
    
    // Mock auth
    await mobilePage.goto('/');
    await mobilePage.evaluate(() => {
      localStorage.setItem('auth_token', 'test_token_123');
    });
    
    // Navigate to study session
    await mobilePage.goto('/dashboard');
    
    // Check mobile menu
    await expect(mobilePage.locator('[data-test="mobile-menu-btn"]')).toBeVisible();
    await mobilePage.click('[data-test="mobile-menu-btn"]');
    await expect(mobilePage.locator('[data-test="mobile-menu"]')).toBeVisible();
    
    // Start session on mobile
    await mobilePage.click('[data-test="exam-card-comptia-network"]');
    await mobilePage.click('[data-test="start-practice-btn"]');
    await mobilePage.click('[data-test="start-session-btn"]');
    
    // Verify mobile-optimized layout
    await expect(mobilePage.locator('[data-test="question-container"]')).toBeVisible();
    
    // Check touch interactions
    await mobilePage.tap('[data-test="answer-a"]');
    await expect(mobilePage.locator('[data-test="answer-a"]')).toHaveClass(/selected/);
    
    // Swipe gesture for next question (if implemented)
    // await mobilePage.locator('[data-test="question-container"]').swipe({ direction: 'left' });
    
    await mobileContext.close();
  });
});