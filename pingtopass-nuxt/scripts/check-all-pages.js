import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function checkAllPages() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  const pages = [
    { name: 'homepage', url: 'http://localhost:3008/' },
    { name: 'login', url: 'http://localhost:3008/login' },
    { name: 'dashboard', url: 'http://localhost:3008/dashboard' },
    { name: 'exams', url: 'http://localhost:3008/exams' },
    { name: 'dev-login', url: 'http://localhost:3008/dev-login' },
    { name: 'terms', url: 'http://localhost:3008/terms' },
    { name: 'privacy', url: 'http://localhost:3008/privacy' }
  ];

  const results = [];

  for (const pageInfo of pages) {
    try {
      console.log(`\nChecking ${pageInfo.name}...`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);

      // Check for Spike CSS
      const cssCheck = await page.evaluate(() => {
        const rootStyles = getComputedStyle(document.documentElement);
        const bodyStyles = getComputedStyle(document.body);
        
        // Check for Spike CSS variables
        const hasSpikeColors = rootStyles.getPropertyValue('--spike-primary').trim() !== '';
        const hasInterFont = bodyStyles.fontFamily.includes('Inter');
        
        // Check for Spike classes
        const spikeClasses = Array.from(document.querySelectorAll('*'))
          .flatMap(el => Array.from(el.classList))
          .filter(c => c.includes('spike'));
        
        // Check what stylesheets are loaded
        const stylesheets = Array.from(document.styleSheets)
          .map(sheet => sheet.href)
          .filter(Boolean);
        
        return {
          hasSpikeColors,
          hasInterFont,
          spikeClassCount: spikeClasses.length,
          uniqueSpikeClasses: [...new Set(spikeClasses)].slice(0, 10),
          stylesheets: stylesheets.filter(s => s.includes('spike')),
          bodyBackground: bodyStyles.backgroundColor,
          bodyFont: bodyStyles.fontFamily
        };
      });

      // Take screenshot
      const screenshotsDir = path.join(__dirname, '../screenshots-pages');
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
      }
      
      await page.screenshot({
        path: path.join(screenshotsDir, `${pageInfo.name}.png`),
        fullPage: false
      });

      results.push({
        page: pageInfo.name,
        url: pageInfo.url,
        ...cssCheck
      });

      console.log(`✅ ${pageInfo.name}:`, {
        hasSpikeCSS: cssCheck.hasSpikeColors,
        hasInterFont: cssCheck.hasInterFont,
        spikeClasses: cssCheck.spikeClassCount
      });

    } catch (error) {
      console.error(`❌ Error checking ${pageInfo.name}:`, error.message);
      results.push({
        page: pageInfo.name,
        url: pageInfo.url,
        error: error.message
      });
    }
  }

  // Save results
  fs.writeFileSync(
    path.join(__dirname, '../screenshots-pages/css-check-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('\n📊 Summary:');
  console.log('Pages with Spike CSS:', results.filter(r => r.hasSpikeColors).map(r => r.page).join(', '));
  console.log('Pages without Spike CSS:', results.filter(r => !r.hasSpikeColors).map(r => r.page).join(', '));

  await browser.close();
}

checkAllPages().catch(console.error);