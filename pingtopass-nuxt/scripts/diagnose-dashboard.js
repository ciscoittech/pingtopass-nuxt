import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import path from 'path';

async function diagnoseDashboard() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Collect console messages and errors
  const consoleMessages = [];
  const pageErrors = [];
  
  page.on('console', msg => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });
  
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });
  
  // Navigate to dashboard
  console.log('Navigating to dashboard...');
  const response = await page.goto('http://localhost:3002/dashboard', {
    waitUntil: 'networkidle',
    timeout: 30000
  });
  
  console.log('Response status:', response.status());
  
  // Wait a bit for any delayed rendering
  await page.waitForTimeout(2000);
  
  // Take screenshots
  const screenshotDir = path.join(process.cwd(), 'screenshots-diagnosis');
  await fs.mkdir(screenshotDir, { recursive: true });
  
  await page.screenshot({ 
    path: path.join(screenshotDir, 'dashboard-full.png'),
    fullPage: true 
  });
  console.log('Screenshot saved: dashboard-full.png');
  
  // Check for specific elements
  const checks = {
    sidebar: await page.locator('.sidebar, aside, nav').first().isVisible().catch(() => false),
    statsCards: await page.locator('.stats-card, [class*="stat"], [class*="card"]').count(),
    header: await page.locator('header, .header, h1').first().isVisible().catch(() => false),
    mainContent: await page.locator('main, .main-content').first().isVisible().catch(() => false)
  };
  
  console.log('\nElement checks:', checks);
  
  // Get page content for analysis
  const pageContent = await page.content();
  const hasContent = pageContent.length > 1000;
  
  console.log('\nPage content length:', pageContent.length);
  console.log('Has substantial content:', hasContent);
  
  // Check for error messages in the DOM
  const errorElements = await page.locator('*:has-text("error"), *:has-text("Error"), *:has-text("500"), .error, .error-message').all();
  if (errorElements.length > 0) {
    console.log('\nFound error elements:', errorElements.length);
    for (const elem of errorElements) {
      const text = await elem.textContent().catch(() => '');
      if (text) console.log('  -', text.substring(0, 100));
    }
  }
  
  // Log console messages
  if (consoleMessages.length > 0) {
    console.log('\nConsole messages:');
    consoleMessages.forEach(msg => {
      if (msg.type === 'error' || msg.type === 'warning') {
        console.log(`  ${msg.type.toUpperCase()}: ${msg.text}`);
      }
    });
  }
  
  // Log page errors
  if (pageErrors.length > 0) {
    console.log('\nPage errors:');
    pageErrors.forEach(error => {
      console.log('  ERROR:', error.message);
    });
  }
  
  // Check computed styles on body
  const bodyStyles = await page.evaluate(() => {
    const body = document.body;
    const computed = window.getComputedStyle(body);
    return {
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      fontFamily: computed.fontFamily,
      hasStyles: computed.length > 0
    };
  });
  
  console.log('\nBody computed styles:', bodyStyles);
  
  // Check for CSS files loaded
  const stylesheets = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    const styles = Array.from(document.querySelectorAll('style'));
    return {
      externalCSS: links.map(link => link.href),
      inlineStyles: styles.length,
      hasTailwind: document.documentElement.outerHTML.includes('tailwind')
    };
  });
  
  console.log('\nStylesheets:', stylesheets);
  
  // Keep browser open for 5 seconds for visual inspection
  console.log('\nKeeping browser open for inspection...');
  await page.waitForTimeout(5000);
  
  await browser.close();
  console.log('\nDiagnosis complete!');
}

diagnoseDashboard().catch(console.error);