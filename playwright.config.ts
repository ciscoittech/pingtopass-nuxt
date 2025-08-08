import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for E2E Testing
 * Optimized for PingToPass edge architecture testing
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Test timeouts
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  
  // Test execution
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Reporting
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  // Global test configuration
  use: {
    // Base URL for tests
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser context
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // Performance and reliability
    actionTimeout: 10000,
    navigationTimeout: 15000,
    
    // Edge runtime testing
    extraHTTPHeaders: {
      'X-Test-Environment': 'e2e'
    }
  },
  
  // Test projects for different browsers
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable DevTools for debugging
        devtools: !process.env.CI
      }
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    
    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }
    },
    
    // Performance testing project
    {
      name: 'performance',
      testMatch: '**/performance/*.spec.ts',
      use: {
        ...devices['Desktop Chrome'],
        // Enable performance monitoring
        extraHTTPHeaders: {
          'X-Performance-Test': 'true'
        }
      }
    }
  ],
  
  // Development server configuration
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      NODE_ENV: 'development',
      TEST_MODE: 'e2e'
    }
  },
  
  // Output directory
  outputDir: 'test-results/',
  
  // Global setup and teardown
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts'
})