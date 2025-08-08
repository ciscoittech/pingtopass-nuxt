import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E testing
 * Optimized for PingToPass edge-first architecture
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Maximum time one test can run for
  timeout: 30000,
  
  // Test expectations timeout
  expect: {
    timeout: 5000
  },
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Maximum time each action can take
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
    
    // Browser options
    launchOptions: {
      slowMo: process.env.CI ? 0 : 0
    },
    
    // Global test artifacts
    contextOptions: {
      recordVideo: {
        mode: 'retain-on-failure',
        size: { width: 1920, height: 1080 }
      }
    },
    
    // Ignore HTTPS errors in development
    ignoreHTTPSErrors: true,
    
    // Extra HTTP headers
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en'
    }
  },
  
  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Performance testing viewport
        viewport: { width: 1920, height: 1080 }
      }
    },
    
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      }
    },
    
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5']
      }
    },
    
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 13']
      }
    },
    
    // Performance testing project
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Enable performance metrics collection
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
      testMatch: /.*\.perf\.spec\.ts$/
    },
    
    // Visual regression testing
    {
      name: 'visual',
      use: {
        ...devices['Desktop Chrome'],
        // Consistent viewport for visual tests
        viewport: { width: 1280, height: 720 }
      },
      testMatch: /.*\.visual\.spec\.ts$/
    },
    
    // Accessibility testing
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome']
      },
      testMatch: /.*\.a11y\.spec\.ts$/
    }
  ],
  
  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000
  }
});