import { chromium } from 'playwright';

async function testDashboard() {
  console.log('Testing Dashboard Page...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true 
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();
  
  const tests = [];
  const addTest = (name, passed, details = '') => {
    tests.push({ name, passed, details });
    console.log(`${passed ? '✅' : '❌'} ${name}${details ? `: ${details}` : ''}`);
  };
  
  try {
    // Test 1: Page loads successfully
    console.log('Test 1: Page loads successfully');
    const response = await page.goto('http://localhost:3002/dashboard', {
      waitUntil: 'networkidle'
    });
    addTest('Page loads', response.status() === 200, `Status: ${response.status()}`);
    
    // Test 2: No critical console errors
    console.log('\nTest 2: Checking for console errors');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('No match found for location')) {
        consoleErrors.push(msg.text());
      }
    });
    await page.waitForTimeout(1000);
    addTest('No critical console errors', consoleErrors.length === 0, 
      consoleErrors.length > 0 ? `Found ${consoleErrors.length} errors` : 'Clean console');
    
    // Test 3: Sidebar is visible
    console.log('\nTest 3: Checking sidebar visibility');
    const sidebar = await page.locator('aside, nav').first().isVisible();
    addTest('Sidebar visible', sidebar);
    
    // Test 4: Greeting message is displayed
    console.log('\nTest 4: Checking greeting message');
    const greetingText = await page.locator('text=/Good (morning|afternoon|evening)/i').first().textContent().catch(() => null);
    const hasGreeting = greetingText !== null;
    addTest('Greeting displayed', hasGreeting, greetingText || 'No greeting found');
    
    // Test 5: Stats cards are rendered
    console.log('\nTest 5: Checking stats cards');
    const statsCards = await page.locator('[class*="card"], .stats-card').count();
    addTest('Stats cards rendered', statsCards > 0, `Found ${statsCards} cards`);
    
    // Test 6: Specific stats are displayed
    console.log('\nTest 6: Checking specific stats');
    const availableExams = await page.locator('h3:has-text("Available Exams")').first().isVisible();
    const activesSessions = await page.locator('h3:has-text("Active Sessions")').first().isVisible();
    const testsCompleted = await page.locator('h3:has-text("Tests Completed")').first().isVisible();
    
    addTest('Available Exams stat', availableExams);
    addTest('Active Sessions stat', activesSessions);
    addTest('Tests Completed stat', testsCompleted);
    
    // Test 7: Certification cards are displayed
    console.log('\nTest 7: Checking certification cards');
    const certCards = await page.locator('[class*="cert"], [class*="exam-card"]').count();
    const hasN10 = await page.locator('text=N10-008').isVisible();
    const hasXK0 = await page.locator('text=XK0-005').isVisible();
    const hasSY0 = await page.locator('text=SY0-701').isVisible();
    
    addTest('Certification cards present', certCards > 0 || (hasN10 && hasXK0 && hasSY0), 
      `Found ${certCards} cert cards`);
    addTest('CompTIA Network+ (N10-008)', hasN10);
    addTest('CompTIA Linux+ (XK0-005)', hasXK0);
    addTest('CompTIA Security+ (SY0-701)', hasSY0);
    
    // Test 8: CSS is properly loaded
    console.log('\nTest 8: Checking CSS loading');
    const bodyBgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    const hasCSS = bodyBgColor && bodyBgColor !== 'rgba(0, 0, 0, 0)';
    addTest('CSS properly loaded', hasCSS, `Background: ${bodyBgColor}`);
    
    // Test 9: Responsive design
    console.log('\nTest 9: Testing responsive design');
    
    // Desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    const desktopSidebar = await page.locator('aside, nav').first().isVisible();
    addTest('Desktop view works', desktopSidebar);
    
    // Mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const mobileContent = await page.locator('main, [role="main"], .main-content').first().isVisible();
    addTest('Mobile view works', mobileContent);
    
    // Take final screenshot
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'dashboard-test-final.png', fullPage: true });
    console.log('\n📸 Screenshot saved: dashboard-test-final.png');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    addTest('Test execution', false, error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('TEST SUMMARY');
  console.log('='.repeat(50));
  
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  
  console.log(`Total Tests: ${tests.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\nFailed Tests:');
    tests.filter(t => !t.passed).forEach(t => {
      console.log(`  - ${t.name}: ${t.details}`);
    });
  }
  
  await browser.close();
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

testDashboard().catch(console.error);