import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function takeDetailedScreenshots() {
  const browser = await chromium.launch({ 
    headless: true  // Run headless for speed
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, '../screenshots-detailed');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err));

  console.log('\n🔍 Checking homepage rendering...\n');
  
  try {
    // Navigate to homepage
    await page.goto('http://localhost:3007/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for CSS to load
    await page.waitForTimeout(3000);
    
    // Check if Spike theme CSS is loaded
    const hasSpikeTheme = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      const hasSpikeCSS = styles.some(sheet => {
        try {
          return sheet.href && sheet.href.includes('spike-theme');
        } catch (e) {
          return false;
        }
      });
      
      // Check for CSS variables
      const rootStyles = getComputedStyle(document.documentElement);
      const hasSpikeColors = rootStyles.getPropertyValue('--spike-primary').trim() !== '';
      
      // Check for Spike components
      const hasSpikeButton = document.querySelector('.spike-button') !== null;
      const hasSpikeCard = document.querySelector('.spike-card') !== null;
      
      // Get all loaded stylesheets
      const loadedStyles = styles.map(sheet => sheet.href).filter(Boolean);
      
      return {
        hasSpikeCSS,
        hasSpikeColors,
        hasSpikeButton,
        hasSpikeCard,
        loadedStyles,
        primaryColor: rootStyles.getPropertyValue('--spike-primary'),
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        bodyFont: getComputedStyle(document.body).fontFamily
      };
    });
    
    console.log('🎨 Spike Theme Check:', hasSpikeTheme);
    
    // Check what's actually rendered
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        hasHeroSection: document.querySelector('.spike-hero-section') !== null,
        hasStatsBar: document.querySelector('.spike-stats-bar') !== null,
        hasFeaturesSection: document.querySelector('.spike-features-section') !== null,
        buttonCount: document.querySelectorAll('button').length,
        spikeButtonCount: document.querySelectorAll('.spike-button').length,
        hasInterFont: getComputedStyle(document.body).fontFamily.includes('Inter'),
        allClasses: Array.from(new Set(
          Array.from(document.querySelectorAll('*'))
            .flatMap(el => Array.from(el.classList))
        )).filter(c => c.includes('spike')).slice(0, 20)
      };
    });
    
    console.log('📄 Page Content:', pageContent);
    
    // Take screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'homepage-full.png'),
      fullPage: true
    });
    
    console.log('✅ Screenshot saved to screenshots-detailed/homepage-full.png');
    
    // Get computed styles of key elements
    const elementStyles = await page.evaluate(() => {
      const getElementInfo = (selector) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const styles = getComputedStyle(el);
        return {
          exists: true,
          display: styles.display,
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontSize: styles.fontSize,
          fontFamily: styles.fontFamily,
          padding: styles.padding,
          margin: styles.margin,
          border: styles.border
        };
      };
      
      return {
        body: getElementInfo('body'),
        heroSection: getElementInfo('.spike-hero-section'),
        heroTitle: getElementInfo('.spike-hero-title'),
        statsBar: getElementInfo('.spike-stats-bar'),
        spikeButton: getElementInfo('.spike-button'),
        spikeCard: getElementInfo('.spike-card')
      };
    });
    
    console.log('\n🎯 Element Styles:', JSON.stringify(elementStyles, null, 2));
    
    // Save diagnostic info
    fs.writeFileSync(
      path.join(screenshotsDir, 'diagnostic-info.json'),
      JSON.stringify({ hasSpikeTheme, pageContent, elementStyles }, null, 2)
    );
    
    console.log('\n💡 Diagnostic info saved to screenshots-detailed/diagnostic-info.json');
    
    // Navigate to dev-login page
    console.log('\n🔍 Checking dev-login page...\n');
    await page.goto('http://localhost:3007/dev-login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'dev-login.png'),
      fullPage: true
    });
    
    console.log('✅ Dev login screenshot saved');
    
    // Try logging in
    console.log('\n🔐 Testing dev login...\n');
    await page.click('button:has-text("Test Student")');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    console.log('📍 Current URL after login:', currentUrl);
    
    await page.screenshot({
      path: path.join(screenshotsDir, 'after-login.png'),
      fullPage: true
    });
    
    console.log('✅ After login screenshot saved');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  // Close browser quickly
  console.log('\n✅ Screenshots complete!');
  
  await browser.close();
}

takeDetailedScreenshots().catch(console.error);