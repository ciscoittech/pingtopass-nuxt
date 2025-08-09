/**
 * Playwright Global Setup
 * Sets up test environment before running E2E tests
 */

import { chromium, type FullConfig } from '@playwright/test'
import type { Browser, BrowserContext } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...')
  
  const { baseURL } = config.projects[0].use
  
  // Verify the app is running
  if (baseURL) {
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    try {
      console.log(`📡 Checking if app is running at ${baseURL}`)
      
      // Wait for the app to be ready
      await page.goto(`${baseURL}/api/health`, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      })
      
      const response = await page.waitForResponse(
        response => response.url().includes('/api/health') && response.status() === 200,
        { timeout: 30000 }
      )
      
      if (response.ok()) {
        console.log('✅ App is running and health check passed')
        
        // Verify database connectivity
        try {
          await page.goto(`${baseURL}/api/health/database`)
          const dbResponse = await page.waitForResponse(
            response => response.url().includes('/api/health/database'),
            { timeout: 10000 }
          )
          
          if (dbResponse.ok()) {
            console.log('✅ Database connectivity verified')
          } else {
            console.log('⚠️ Database health check failed, but continuing tests')
          }
        } catch (error) {
          console.log('⚠️ Could not verify database, but continuing tests')
        }
      } else {
        throw new Error(`Health check failed with status: ${response.status()}`)
      }
    } catch (error) {
      console.error('❌ Failed to verify app is running:', error)
      throw new Error(
        `App is not running at ${baseURL}. Make sure to start the dev server first.`
      )
    } finally {
      await context.close()
      await browser.close()
    }
  }
  
  console.log('✅ Global setup complete')
}

export default globalSetup