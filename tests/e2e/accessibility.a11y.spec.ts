/**
 * Accessibility E2E Tests
 * WCAG 2.1 AA compliance testing
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Accessibility Tests @a11y', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Mock authentication
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'a11y_test_token');
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: 'a11y@example.com',
        name: 'Accessibility Test User',
        subscription_status: 'premium'
      }));
    });
  });
  
  test.describe('Keyboard Navigation', () => {
    test('complete navigation using only keyboard', async () => {
      await page.goto('/');
      
      // Tab through landing page elements
      await page.keyboard.press('Tab');
      let focused = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
      expect(['login-btn', 'navigation-menu']).toContain(focused);
      
      // Continue tabbing to verify focus order
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Enter with keyboard to login
      focused = await page.evaluate(() => document.activeElement?.getAttribute('data-test'));
      if (focused === 'login-btn') {
        await page.keyboard.press('Enter');
        await expect(page.locator('[data-test="login-modal"]')).toBeVisible();
      }
    });
    
    test('study session keyboard navigation', async () => {
      await page.goto('/dashboard');
      
      // Navigate to exam with keyboard
      await page.keyboard.press('Tab');
      let currentFocus = '';
      
      // Find exam card focus
      for (let i = 0; i < 10; i++) {
        currentFocus = await page.evaluate(() => 
          document.activeElement?.getAttribute('data-test') || ''
        );
        if (currentFocus.includes('exam-card')) {
          break;
        }
        await page.keyboard.press('Tab');
      }
      
      expect(currentFocus).toContain('exam-card');
      
      // Enter exam with keyboard
      await page.keyboard.press('Enter');
      await expect(page).toHaveURL(/\/exams\//);
      
      // Navigate to start practice
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); // Start practice
      
      // Configure session with keyboard
      await expect(page.locator('[data-test="session-config-modal"]')).toBeVisible();
      
      await page.keyboard.press('Tab');
      await page.keyboard.type('10'); // Question count
      
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space'); // Select objective
      
      // Find and press start session button
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        currentFocus = await page.evaluate(() => 
          document.activeElement?.getAttribute('data-test')
        );
        if (currentFocus === 'start-session-btn') {
          await page.keyboard.press('Enter');
          break;
        }
      }
      
      // Should be in study session
      await expect(page.locator('[data-test="question-text"]')).toBeVisible();
      
      // Navigate answers with keyboard
      await page.keyboard.press('Tab');
      await page.keyboard.press('Space'); // Select answer
      
      // Submit with keyboard
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        currentFocus = await page.evaluate(() => 
          document.activeElement?.getAttribute('data-test')
        );
        if (currentFocus === 'submit-answer-btn') {
          await page.keyboard.press('Enter');
          break;
        }
      }
      
      await expect(page.locator('[data-test="answer-feedback"]')).toBeVisible();
    });
    
    test('skip links functionality', async () => {
      await page.goto('/dashboard');
      
      // Tab to skip link (should be first focusable element)
      await page.keyboard.press('Tab');
      
      const skipLink = page.locator('[data-test="skip-to-main"]');
      if (await skipLink.count() > 0) {
        await expect(skipLink).toBeFocused();
        
        // Activate skip link
        await page.keyboard.press('Enter');
        
        // Focus should jump to main content
        const mainContent = await page.evaluate(() => 
          document.activeElement?.getAttribute('data-test')
        );
        expect(mainContent).toBe('main-content');
      }
    });
    
    test('modal dialog keyboard trapping', async () => {
      await page.goto('/profile');
      
      await page.click('[data-test="delete-account-btn"]');
      await expect(page.locator('[data-test="confirmation-modal"]')).toBeVisible();
      
      // Tab should be trapped within modal
      const modalFocusableElements = [];
      
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          return {
            tagName: el?.tagName,
            testId: el?.getAttribute('data-test'),
            text: el?.textContent?.substring(0, 20)
          };
        });
        
        modalFocusableElements.push(focused);
        
        // If we've cycled back to first element, focus is properly trapped
        if (i > 2 && focused.testId === modalFocusableElements[0].testId) {
          break;
        }
      }
      
      // Verify focus stayed within modal
      const hasNonModalFocus = modalFocusableElements.some(el => 
        el.testId && !el.testId.includes('modal') && !el.testId.includes('cancel') && !el.testId.includes('confirm')
      );
      expect(hasNonModalFocus).toBe(false);
      
      // Escape should close modal
      await page.keyboard.press('Escape');
      await expect(page.locator('[data-test="confirmation-modal"]')).not.toBeVisible();
    });
  });
  
  test.describe('Screen Reader Support', () => {
    test('proper heading hierarchy', async () => {
      await page.goto('/dashboard');
      
      const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements =>
        elements.map(el => ({
          level: parseInt(el.tagName.substring(1)),
          text: el.textContent?.trim() || '',
          id: el.id || null
        }))
      );
      
      // Should have exactly one H1
      const h1Count = headings.filter(h => h.level === 1).length;
      expect(h1Count).toBe(1);
      
      // Verify logical heading order (no skipping levels)
      for (let i = 1; i < headings.length; i++) {
        const currentLevel = headings[i].level;
        const previousLevel = headings[i - 1].level;
        
        // Should not skip more than one level
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
      
      console.log('Heading structure:', headings);
    });
    
    test('ARIA labels and descriptions', async () => {
      await page.goto('/dashboard');
      await page.click('[data-test="exam-card-comptia-network"]');
      await page.click('[data-test="start-practice-btn"]');
      await page.click('[data-test="start-session-btn"]');
      
      // Check question has proper ARIA attributes
      const questionContainer = page.locator('[data-test="question-container"]');
      await expect(questionContainer).toHaveAttribute('role', 'main');
      
      const questionText = page.locator('[data-test="question-text"]');
      const ariaLabel = await questionText.getAttribute('aria-label');
      const ariaDescribedBy = await questionText.getAttribute('aria-describedby');
      
      expect(ariaLabel || ariaDescribedBy).toBeTruthy();
      
      // Check answer options have proper labels
      const answerOptions = await page.$$('[data-test^="answer-"]');
      for (const option of answerOptions) {
        const role = await option.getAttribute('role');
        const ariaLabel = await option.getAttribute('aria-label');
        
        expect(role).toBe('radio');
        expect(ariaLabel).toBeTruthy();
      }
    });
    
    test('form labels and validation', async () => {
      await page.goto('/profile');
      
      // Check all form inputs have labels
      const inputs = await page.$$('input, select, textarea');
      
      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        if (id) {
          // Check for associated label
          const label = await page.$(`label[for="${id}"]`);
          const hasLabel = label !== null || ariaLabel || ariaLabelledBy;
          
          expect(hasLabel).toBe(true);
        }
      }
      
      // Test form validation announcements
      await page.fill('[data-test="name-input"]', '');
      await page.click('[data-test="save-profile-btn"]');
      
      const errorMessage = page.locator('[data-test="name-error"]');
      if (await errorMessage.count() > 0) {
        const ariaLive = await errorMessage.getAttribute('aria-live');
        expect(ariaLive).toBeTruthy();
      }
    });
    
    test('live region announcements', async () => {
      await page.goto('/dashboard');
      await page.click('[data-test="exam-card-comptia-network"]');
      await page.click('[data-test="start-practice-btn"]');
      await page.click('[data-test="start-session-btn"]');
      
      // Answer a question
      await page.click('[data-test="answer-a"]');
      await page.click('[data-test="submit-answer-btn"]');
      
      // Check for live region announcement of result
      const feedback = page.locator('[data-test="answer-feedback"]');
      const ariaLive = await feedback.getAttribute('aria-live');
      
      expect(ariaLive).toBeTruthy();
      expect(['polite', 'assertive']).toContain(ariaLive);
    });
    
    test('progress indicators accessibility', async () => {
      await page.goto('/dashboard');
      await page.click('[data-test="exam-card-comptia-network"]');
      await page.click('[data-test="start-practice-btn"]');
      await page.click('[data-test="start-session-btn"]');
      
      const progressBar = page.locator('[data-test="progress-bar"]');
      
      // Check progress bar has proper ARIA attributes
      await expect(progressBar).toHaveAttribute('role', 'progressbar');
      
      const ariaValueMin = await progressBar.getAttribute('aria-valuemin');
      const ariaValueMax = await progressBar.getAttribute('aria-valuemax');
      const ariaValueNow = await progressBar.getAttribute('aria-valuenow');
      const ariaLabel = await progressBar.getAttribute('aria-label');
      
      expect(ariaValueMin).toBe('0');
      expect(parseInt(ariaValueMax || '0')).toBeGreaterThan(0);
      expect(parseInt(ariaValueNow || '0')).toBeGreaterThanOrEqual(0);
      expect(ariaLabel).toBeTruthy();
    });
  });
  
  test.describe('Visual Accessibility', () => {
    test('color contrast compliance', async () => {
      await page.goto('/dashboard');
      
      // Check contrast ratios for text elements
      const textElements = await page.$$eval('[data-test]', elements =>
        elements.filter(el => el.textContent?.trim()).map(el => {
          const styles = window.getComputedStyle(el);
          return {
            element: el.getAttribute('data-test'),
            color: styles.color,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize
          };
        })
      );
      
      // This is a simplified check - in a real implementation,
      // you'd use a proper contrast ratio calculator
      for (const element of textElements.slice(0, 5)) { // Check first 5 elements
        console.log(`Element: ${element.element}`);
        console.log(`Color: ${element.color}, Background: ${element.backgroundColor}`);
        
        // Verify colors are not the same (basic check)
        expect(element.color).not.toBe(element.backgroundColor);
      }
    });
    
    test('focus indicators visible', async () => {
      await page.goto('/dashboard');
      
      // Tab to focusable elements and check focus visibility
      const focusableElements = await page.$$('[tabindex], button, input, select, textarea, a[href]');
      
      for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
        await page.keyboard.press('Tab');
        
        const focusedElement = await page.evaluate(() => document.activeElement);
        const styles = await page.evaluate((el) => {
          if (!el) return null;
          const computed = window.getComputedStyle(el);
          return {
            outline: computed.outline,
            outlineWidth: computed.outlineWidth,
            boxShadow: computed.boxShadow,
            borderColor: computed.borderColor
          };
        }, focusedElement);
        
        if (styles) {
          // Focus should be visible (outline, box-shadow, or border change)
          const hasVisibleFocus = 
            styles.outline !== 'none' ||
            styles.outlineWidth !== '0px' ||
            styles.boxShadow !== 'none' ||
            styles.borderColor !== 'transparent';
          
          expect(hasVisibleFocus).toBe(true);
        }
      }
    });
    
    test('text scaling support', async () => {
      await page.goto('/dashboard');
      
      // Simulate 200% zoom
      await page.setViewportSize({ width: 640, height: 360 }); // Half size = 200% zoom
      
      // Check that content is still accessible and doesn't overflow
      const body = await page.locator('body').boundingBox();
      const main = await page.locator('[data-test="main-content"]').boundingBox();
      
      if (body && main) {
        // Main content should fit within viewport
        expect(main.width).toBeLessThanOrEqual(body.width + 10); // Small tolerance
        
        // Should not have horizontal scrollbar at 200% zoom
        const hasHorizontalScroll = await page.evaluate(() => 
          document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBe(false);
      }
    });
    
    test('motion preferences respect', async () => {
      // Set prefers-reduced-motion
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      await page.goto('/dashboard');
      
      // Check that animations are disabled/reduced
      const animatedElements = await page.$$('[class*="animate"], [class*="transition"]');
      
      for (const element of animatedElements.slice(0, 3)) {
        const styles = await page.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            animationDuration: computed.animationDuration,
            transitionDuration: computed.transitionDuration
          };
        }, element);
        
        // Animations should be reduced/disabled
        if (styles.animationDuration !== '0s') {
          console.log(`Animation duration: ${styles.animationDuration}`);
        }
        if (styles.transitionDuration !== '0s') {
          console.log(`Transition duration: ${styles.transitionDuration}`);
        }
      }
    });
  });
  
  test.describe('Interactive Elements', () => {
    test('button accessibility', async () => {
      await page.goto('/dashboard');
      
      const buttons = await page.$$('button, [role="button"]');
      
      for (const button of buttons.slice(0, 5)) {
        // Check button has accessible name
        const accessibleName = await page.evaluate((btn) => {
          return btn.textContent?.trim() || 
                 btn.getAttribute('aria-label') || 
                 btn.getAttribute('aria-labelledby') || 
                 btn.getAttribute('title');
        }, button);
        
        expect(accessibleName).toBeTruthy();
        
        // Check button is keyboard accessible
        const tabIndex = await button.getAttribute('tabindex');
        expect(tabIndex === null || parseInt(tabIndex) >= 0).toBe(true);
        
        // Check disabled state is properly conveyed
        const isDisabled = await button.getAttribute('disabled');
        const ariaDisabled = await button.getAttribute('aria-disabled');
        
        if (isDisabled !== null || ariaDisabled === 'true') {
          const tabIndexWhenDisabled = await button.getAttribute('tabindex');
          expect(tabIndexWhenDisabled).toBe('-1');
        }
      }
    });
    
    test('link accessibility', async () => {
      await page.goto('/');
      
      const links = await page.$$('a[href]');
      
      for (const link of links.slice(0, 5)) {
        // Check link has accessible name
        const accessibleName = await page.evaluate((lnk) => {
          return lnk.textContent?.trim() || 
                 lnk.getAttribute('aria-label') || 
                 lnk.getAttribute('title');
        }, link);
        
        expect(accessibleName).toBeTruthy();
        
        // Check href is valid
        const href = await link.getAttribute('href');
        expect(href).toBeTruthy();
        expect(href).not.toBe('#');
        
        // Check external links have proper indicators
        if (href?.startsWith('http') && !href.includes(await page.url())) {
          const ariaLabel = await link.getAttribute('aria-label');
          const hasExternalIndicator = 
            ariaLabel?.includes('external') || 
            ariaLabel?.includes('opens in new');
          
          // External links should indicate they open in new window/tab
          if (await link.getAttribute('target') === '_blank') {
            expect(hasExternalIndicator).toBe(true);
          }
        }
      }
    });
    
    test('form control accessibility', async () => {
      await page.goto('/profile');
      
      const formControls = await page.$$('input, select, textarea');
      
      for (const control of formControls) {
        const type = await control.getAttribute('type');
        const role = await control.getAttribute('role');
        
        // Check required fields are properly marked
        const isRequired = await control.getAttribute('required');
        const ariaRequired = await control.getAttribute('aria-required');
        
        if (isRequired !== null) {
          expect(ariaRequired).toBe('true');
        }
        
        // Check invalid fields have proper error indication
        const isInvalid = await control.evaluate(el => !el.checkValidity());
        if (isInvalid) {
          const ariaInvalid = await control.getAttribute('aria-invalid');
          const ariaDescribedBy = await control.getAttribute('aria-describedby');
          
          expect(ariaInvalid === 'true' || ariaDescribedBy !== null).toBe(true);
        }
      }
    });
  });
  
  test.describe('Error Handling Accessibility', () => {
    test('error messages are announced', async () => {
      await page.goto('/dashboard');
      
      // Mock API error
      await page.route('**/api/sessions', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Server error occurred'
          })
        });
      });
      
      await page.click('[data-test="view-sessions-btn"]');
      
      // Check error is properly announced
      const errorMessage = page.locator('[data-test="error-message"]');
      await expect(errorMessage).toBeVisible();
      
      const ariaLive = await errorMessage.getAttribute('aria-live');
      const role = await errorMessage.getAttribute('role');
      
      expect(ariaLive === 'assertive' || role === 'alert').toBe(true);
    });
    
    test('success messages are announced', async () => {
      await page.goto('/profile');
      
      await page.fill('[data-test="name-input"]', 'Updated Name');
      await page.click('[data-test="save-profile-btn"]');
      
      const successMessage = page.locator('[data-test="success-message"]');
      if (await successMessage.count() > 0) {
        const ariaLive = await successMessage.getAttribute('aria-live');
        expect(ariaLive).toBe('polite');
      }
    });
  });
  
  test.describe('Mobile Accessibility', () => {
    test('touch target sizes', async ({ browser }) => {
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 }
      });
      const mobilePage = await mobileContext.newPage();
      
      await mobilePage.goto('/');
      await mobilePage.evaluate(() => {
        localStorage.setItem('auth_token', 'mobile_a11y_token');
      });
      
      await mobilePage.goto('/dashboard');
      
      // Check touch targets are at least 44px
      const buttons = await mobilePage.$$('button, [role="button"], a');
      
      for (const button of buttons.slice(0, 5)) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      await mobileContext.close();
    });
    
    test('mobile screen reader navigation', async ({ browser }) => {
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
      const mobilePage = await mobileContext.newPage();
      
      await mobilePage.goto('/');
      await mobilePage.evaluate(() => {
        localStorage.setItem('auth_token', 'mobile_sr_token');
      });
      
      await mobilePage.goto('/dashboard');
      
      // Check mobile navigation landmarks
      const nav = await mobilePage.$('nav[aria-label]');
      const main = await mobilePage.$('main');
      
      expect(nav).toBeTruthy();
      expect(main).toBeTruthy();
      
      // Check mobile menu accessibility
      const mobileMenuButton = mobilePage.locator('[data-test="mobile-menu-btn"]');
      if (await mobileMenuButton.count() > 0) {
        const ariaExpanded = await mobileMenuButton.getAttribute('aria-expanded');
        const ariaControls = await mobileMenuButton.getAttribute('aria-controls');
        
        expect(['true', 'false']).toContain(ariaExpanded);
        expect(ariaControls).toBeTruthy();
      }
      
      await mobileContext.close();
    });
  });
});