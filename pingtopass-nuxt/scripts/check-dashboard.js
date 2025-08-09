import { chromium } from 'playwright';

async function checkDashboard() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('📱 Opening dashboard-simple at http://localhost:3002/dashboard-simple');
  
  try {
    // Navigate to dashboard-simple
    await page.goto('http://localhost:3002/dashboard-simple', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait a bit for any client-side rendering
    await page.waitForTimeout(2000);

    // Check what's visible on the page
    const pageTitle = await page.title();
    console.log('📄 Page title:', pageTitle);

    // Check for main elements
    const hasBody = await page.$('body');
    console.log('✅ Body element exists:', !!hasBody);

    // Get all visible text
    const visibleText = await page.evaluate(() => document.body.innerText);
    console.log('\n📝 Visible text on page:');
    console.log(visibleText || '(No visible text)');

    // Check for Vue app
    const hasVueApp = await page.evaluate(() => {
      return !!document.querySelector('#__nuxt');
    });
    console.log('🎯 Nuxt app mounted:', hasVueApp);

    // Check for any error messages
    const errors = await page.$$('.error, .error-message, [class*="error"]');
    if (errors.length > 0) {
      console.log('⚠️ Found error elements:', errors.length);
      for (const error of errors) {
        const text = await error.textContent();
        console.log('  Error:', text);
      }
    }

    // Check console for errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('🔴 Console error:', msg.text());
      }
    });

    // Take screenshot
    await page.screenshot({ 
      path: 'dashboard-simple-current-state.png',
      fullPage: true 
    });
    console.log('\n📸 Screenshot saved as dashboard-simple-current-state.png');

    // Check network requests for API calls
    const apiCalls = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiCalls.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // Reload to capture network activity
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    if (apiCalls.length > 0) {
      console.log('\n🔗 API calls made:');
      apiCalls.forEach(call => {
        console.log(`  ${call.status} - ${call.url}`);
      });
    }

    // Check HTML structure
    const htmlStructure = await page.evaluate(() => {
      const elements = {
        sidebar: document.querySelector('[class*="sidebar"], aside, nav'),
        main: document.querySelector('main, [class*="main"]'),
        dashboard: document.querySelector('[class*="dashboard"]'),
        statsCards: document.querySelectorAll('[class*="stats"], [class*="card"]'),
        vuetifyApp: document.querySelector('.v-application'),
      };
      
      return {
        hasSidebar: !!elements.sidebar,
        hasMain: !!elements.main,
        hasDashboard: !!elements.dashboard,
        statsCardCount: elements.statsCards.length,
        hasVuetify: !!elements.vuetifyApp,
        sidebarClasses: elements.sidebar?.className || 'none',
        mainClasses: elements.main?.className || 'none'
      };
    });

    console.log('\n🏗️ Page structure:');
    console.log('  Has sidebar:', htmlStructure.hasSidebar);
    console.log('  Has main content:', htmlStructure.hasMain);
    console.log('  Has dashboard:', htmlStructure.hasDashboard);
    console.log('  Stats cards found:', htmlStructure.statsCardCount);
    console.log('  Vuetify loaded:', htmlStructure.hasVuetify);
    console.log('  Sidebar classes:', htmlStructure.sidebarClasses);
    console.log('  Main classes:', htmlStructure.mainClasses);

  } catch (error) {
    console.error('❌ Error checking dashboard:', error.message);
    
    // Try to get any page content
    try {
      const html = await page.content();
      console.log('\n📄 Page HTML (first 500 chars):');
      console.log(html.substring(0, 500));
    } catch (e) {
      console.log('Could not get page content');
    }
  }

  // Keep browser open for manual inspection
  console.log('\n👀 Browser window will stay open for 10 seconds for inspection...');
  await page.waitForTimeout(10000);

  await browser.close();
}

checkDashboard().catch(console.error);