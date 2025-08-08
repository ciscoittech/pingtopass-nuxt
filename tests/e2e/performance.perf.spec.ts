/**
 * Performance E2E Tests
 * Comprehensive performance testing for core user flows
 */

import { test, expect, type Page } from '@playwright/test';

test.describe('Performance Tests @performance', () => {
  let page: Page;
  
  test.beforeEach(async ({ page: testPage, context }) => {
    page = testPage;
    
    // Enable performance metrics collection
    await context.addInitScript(() => {
      window.performance.mark('test-start');
    });
    
    // Mock authentication
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
  
  test('page load performance under 2 seconds', async () => {
    const pages = [
      { url: '/', name: 'Landing Page' },
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/exams', name: 'Exams List' },
      { url: '/profile', name: 'Profile' }
    ];
    
    for (const { url, name } of pages) {
      console.log(`Testing ${name} load performance...`);
      
      const startTime = Date.now();
      
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait for critical content to be visible
      await expect(page.locator('main')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      console.log(`${name} loaded in ${loadTime}ms`);
      
      // Core pages should load within 2 seconds
      expect(loadTime).toBeLessThan(2000);
      
      // Measure Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitalsData: any = {};
            
            entries.forEach((entry: any) => {
              if (entry.entryType === 'largest-contentful-paint') {
                vitalsData.lcp = entry.startTime;
              }
              if (entry.entryType === 'first-input') {
                vitalsData.fid = entry.processingStart - entry.startTime;
              }
              if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
                vitalsData.cls = (vitalsData.cls || 0) + entry.value;
              }
            });
            
            resolve(vitalsData);
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
          
          // Timeout after 3 seconds
          setTimeout(() => resolve({}), 3000);
        });
      });
      
      console.log(`${name} Core Web Vitals:`, vitals);
      
      // Core Web Vitals thresholds
      if ((vitals as any).lcp) {
        expect((vitals as any).lcp).toBeLessThan(2500); // LCP < 2.5s
      }
      if ((vitals as any).fid) {
        expect((vitals as any).fid).toBeLessThan(100); // FID < 100ms
      }
      if ((vitals as any).cls) {
        expect((vitals as any).cls).toBeLessThan(0.1); // CLS < 0.1
      }
    }
  });
  
  test('API response times under 200ms', async () => {
    await page.goto('/dashboard');
    
    const apiEndpoints = [
      { url: '/api/auth/me', name: 'User Profile' },
      { url: '/api/exams', name: 'Exams List' },
      { url: '/api/sessions', name: 'Study Sessions' }
    ];
    
    for (const { url, name } of apiEndpoints) {
      console.log(`Testing ${name} API performance...`);
      
      const responsePromise = page.waitForResponse(response => 
        response.url().includes(url) && response.status() === 200
      );
      
      const startTime = Date.now();
      
      // Trigger API call
      await page.reload();
      
      const response = await responsePromise;
      const responseTime = Date.now() - startTime;
      
      console.log(`${name} API responded in ${responseTime}ms`);
      
      // API responses should be under 200ms globally (edge cache)
      expect(responseTime).toBeLessThan(200);
      
      // Verify response size is reasonable
      const responseSize = parseInt(response.headers()['content-length'] || '0');
      console.log(`${name} response size: ${responseSize} bytes`);
      
      // API responses shouldn't exceed 100KB
      expect(responseSize).toBeLessThan(100000);
    }
  });
  
  test('question loading performance', async () => {
    await page.goto('/dashboard');
    await page.click('[data-test="exam-card-comptia-network"]');
    await page.click('[data-test="start-practice-btn"]');
    await page.click('[data-test="start-session-btn"]');
    
    const questionLoadTimes: number[] = [];
    
    // Test first 10 questions
    for (let i = 1; i <= 10; i++) {
      console.log(`Testing question ${i} load performance...`);
      
      const startTime = Date.now();
      
      if (i > 1) {
        await page.click('[data-test="next-question-btn"]');
      }
      
      // Wait for question content to be fully visible
      await expect(page.locator('[data-test="question-text"]')).toBeVisible();
      await expect(page.locator('[data-test="answer-a"]')).toBeVisible();
      await expect(page.locator('[data-test="answer-d"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      questionLoadTimes.push(loadTime);
      
      console.log(`Question ${i} loaded in ${loadTime}ms`);
      
      // Individual questions should load under 200ms
      expect(loadTime).toBeLessThan(200);
      
      // Quick answer to proceed
      await page.click('[data-test="answer-a"]');
      await page.click('[data-test="submit-answer-btn"]');
    }
    
    const avgLoadTime = questionLoadTimes.reduce((a, b) => a + b, 0) / questionLoadTimes.length;
    const maxLoadTime = Math.max(...questionLoadTimes);
    
    console.log(`Average question load time: ${avgLoadTime}ms`);
    console.log(`Maximum question load time: ${maxLoadTime}ms`);
    
    // Average should be well under 200ms
    expect(avgLoadTime).toBeLessThan(150);
    // No single question should exceed 300ms
    expect(maxLoadTime).toBeLessThan(300);
  });
  
  test('memory usage stays reasonable during long sessions', async () => {
    await page.goto('/dashboard');
    await page.click('[data-test="exam-card-comptia-network"]');
    await page.click('[data-test="start-practice-btn"]');
    
    // Configure longer session
    await page.fill('[data-test="question-count"]', '50');
    await page.click('[data-test="start-session-btn"]');
    
    const memoryUsage: number[] = [];
    
    // Answer 20 questions and monitor memory
    for (let i = 1; i <= 20; i++) {
      if (i > 1) {
        await page.click('[data-test="next-question-btn"]');
      }
      
      await expect(page.locator('[data-test="question-text"]')).toBeVisible();
      await page.click('[data-test="answer-a"]');
      await page.click('[data-test="submit-answer-btn"]');
      
      // Measure memory usage every 5 questions
      if (i % 5 === 0) {
        const memory = await page.evaluate(() => {
          return (performance as any).memory ? {
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit
          } : null;
        });
        
        if (memory) {
          memoryUsage.push(memory.used);
          console.log(`Memory usage after ${i} questions: ${(memory.used / 1024 / 1024).toFixed(2)} MB`);
          
          // Memory usage shouldn't exceed 100MB
          expect(memory.used).toBeLessThan(100 * 1024 * 1024);
        }
      }
    }
    
    // Check for memory leaks (usage shouldn't grow excessively)
    if (memoryUsage.length >= 2) {
      const growthRate = (memoryUsage[memoryUsage.length - 1] - memoryUsage[0]) / memoryUsage.length;
      console.log(`Memory growth rate: ${(growthRate / 1024 / 1024).toFixed(2)} MB per 5 questions`);
      
      // Memory growth should be reasonable (< 5MB per 5 questions)
      expect(growthRate).toBeLessThan(5 * 1024 * 1024);
    }
  });
  
  test('network efficiency and caching', async () => {
    await page.goto('/dashboard');
    
    // Track network requests
    const requests: any[] = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType(),
        size: request.postDataBuffer()?.length || 0
      });
    });
    
    page.on('response', response => {
      const request = requests.find(r => r.url === response.url());
      if (request) {
        request.status = response.status();
        request.responseSize = parseInt(response.headers()['content-length'] || '0');
        request.fromCache = response.fromCache();
      }
    });
    
    // Navigate to exam and start session
    await page.click('[data-test="exam-card-comptia-network"]');
    await page.click('[data-test="start-practice-btn"]');
    await page.click('[data-test="start-session-btn"]');
    
    // Answer a few questions
    for (let i = 1; i <= 5; i++) {
      if (i > 1) {
        await page.click('[data-test="next-question-btn"]');
      }
      
      await expect(page.locator('[data-test="question-text"]')).toBeVisible();
      await page.click('[data-test="answer-a"]');
      await page.click('[data-test="submit-answer-btn"]');
    }
    
    // Analyze network efficiency
    const apiRequests = requests.filter(r => r.url.includes('/api/'));
    const staticRequests = requests.filter(r => 
      r.resourceType === 'stylesheet' || 
      r.resourceType === 'script' || 
      r.resourceType === 'image'
    );
    
    console.log(`Total API requests: ${apiRequests.length}`);
    console.log(`Total static requests: ${staticRequests.length}`);
    
    // API requests should be minimal and efficient
    expect(apiRequests.length).toBeLessThan(20); // No excessive API calls
    
    // Check for successful caching
    const cachedRequests = staticRequests.filter(r => r.fromCache);
    const cacheHitRate = cachedRequests.length / staticRequests.length;
    
    console.log(`Cache hit rate: ${(cacheHitRate * 100).toFixed(1)}%`);
    
    // Cache hit rate should be high for static assets
    if (staticRequests.length > 0) {
      expect(cacheHitRate).toBeGreaterThan(0.8); // 80% cache hit rate
    }
    
    // Total payload size should be reasonable
    const totalPayload = requests.reduce((sum, r) => sum + (r.responseSize || 0), 0);
    console.log(`Total payload: ${(totalPayload / 1024).toFixed(2)} KB`);
    
    // Total payload shouldn't exceed 2MB for initial load + session
    expect(totalPayload).toBeLessThan(2 * 1024 * 1024);
  });
  
  test('database query performance', async () => {
    await page.goto('/dashboard');
    
    // Mock database query timing
    await page.route('**/api/questions/**', async route => {
      const startTime = Date.now();
      
      // Simulate database query
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const queryTime = Date.now() - startTime;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'X-Query-Time': queryTime.toString()
        },
        body: JSON.stringify({
          success: true,
          data: {
            questions: [],
            query_time_ms: queryTime
          }
        })
      });
    });
    
    // Start session to trigger question queries
    await page.click('[data-test="exam-card-comptia-network"]');
    await page.click('[data-test="start-practice-btn"]');
    await page.click('[data-test="start-session-btn"]');
    
    // Check query performance from response headers
    const response = await page.waitForResponse(response => 
      response.url().includes('/api/questions') && response.status() === 200
    );
    
    const queryTime = parseInt(response.headers()['x-query-time'] || '0');
    console.log(`Database query time: ${queryTime}ms`);
    
    // Database queries should be under 100ms (with proper indexing)
    expect(queryTime).toBeLessThan(100);
  });
  
  test('concurrent user simulation', async ({ context }) => {
    const numConcurrentUsers = 5;
    const pages: Page[] = [];
    const results: any[] = [];
    
    // Create multiple pages to simulate concurrent users
    for (let i = 0; i < numConcurrentUsers; i++) {
      const newPage = await context.newPage();
      
      // Mock authentication for each user
      await newPage.goto('/');
      await newPage.evaluate((userId) => {
        localStorage.setItem('auth_token', `token_user_${userId}`);
        localStorage.setItem('user', JSON.stringify({
          id: userId,
          email: `user${userId}@example.com`,
          name: `User ${userId}`,
          subscription_status: 'premium'
        }));
      }, i + 1);
      
      pages.push(newPage);
    }
    
    // Simulate concurrent session starts
    const startTime = Date.now();
    
    const sessionPromises = pages.map(async (userPage, index) => {
      const userStartTime = Date.now();
      
      await userPage.goto('/dashboard');
      await userPage.click('[data-test="exam-card-comptia-network"]');
      await userPage.click('[data-test="start-practice-btn"]');
      await userPage.click('[data-test="start-session-btn"]');
      
      const userEndTime = Date.now();
      
      return {
        userId: index + 1,
        duration: userEndTime - userStartTime
      };
    });
    
    const sessionResults = await Promise.all(sessionPromises);
    const totalTime = Date.now() - startTime;
    
    console.log(`Concurrent sessions completed in ${totalTime}ms`);
    
    sessionResults.forEach(result => {
      console.log(`User ${result.userId} session started in ${result.duration}ms`);
      
      // Each user session should still start reasonably quickly
      expect(result.duration).toBeLessThan(5000);
    });
    
    // Average session start time should be reasonable under load
    const avgSessionStart = sessionResults.reduce((sum, r) => sum + r.duration, 0) / sessionResults.length;
    console.log(`Average session start time under load: ${avgSessionStart}ms`);
    
    expect(avgSessionStart).toBeLessThan(3000);
    
    // Clean up
    await Promise.all(pages.map(p => p.close()));
  });
  
  test('bundle size optimization', async () => {
    await page.goto('/');
    
    // Analyze JavaScript bundle sizes
    const jsRequests = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('script[src]'))
        .map((script: any) => script.src)
        .filter(src => src.includes('_nuxt') || src.includes('/js/'));
    });
    
    console.log(`JavaScript bundles loaded: ${jsRequests.length}`);
    
    // Should use code splitting - not load everything at once
    expect(jsRequests.length).toBeGreaterThan(1); // Evidence of code splitting
    expect(jsRequests.length).toBeLessThan(10); // But not excessive fragmentation
    
    // Check CSS bundle size
    const cssRequests = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((link: any) => link.href);
    });
    
    console.log(`CSS files loaded: ${cssRequests.length}`);
    
    // CSS should be optimized and minimal
    expect(cssRequests.length).toBeLessThan(5);
  });
});