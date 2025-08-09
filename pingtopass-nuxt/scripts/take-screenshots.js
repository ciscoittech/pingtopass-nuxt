import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function takeScreenshots() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, '../screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const pages = [
    { name: 'homepage', url: 'http://localhost:3006/' },
    { name: 'login', url: 'http://localhost:3006/login' },
    { name: 'dashboard', url: 'http://localhost:3006/dashboard' },
    { name: 'exams', url: 'http://localhost:3006/exams' }
  ];

  for (const pageInfo of pages) {
    try {
      console.log(`Taking screenshot of ${pageInfo.name}...`);
      await page.goto(pageInfo.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000); // Wait for any animations
      
      // Take full page screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, `${pageInfo.name}-full.png`),
        fullPage: true
      });
      
      // Take viewport screenshot
      await page.screenshot({
        path: path.join(screenshotsDir, `${pageInfo.name}-viewport.png`)
      });
      
      console.log(`✓ Screenshots saved for ${pageInfo.name}`);
    } catch (error) {
      console.error(`Error taking screenshot of ${pageInfo.name}:`, error.message);
    }
  }

  // Take mobile screenshots
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();

  for (const pageInfo of pages) {
    try {
      console.log(`Taking mobile screenshot of ${pageInfo.name}...`);
      await mobilePage.goto(pageInfo.url, { waitUntil: 'networkidle' });
      await mobilePage.waitForTimeout(1000);
      
      await mobilePage.screenshot({
        path: path.join(screenshotsDir, `${pageInfo.name}-mobile.png`),
        fullPage: true
      });
      
      console.log(`✓ Mobile screenshot saved for ${pageInfo.name}`);
    } catch (error) {
      console.error(`Error taking mobile screenshot of ${pageInfo.name}:`, error.message);
    }
  }

  await browser.close();
  console.log('\nAll screenshots saved to:', screenshotsDir);
}

takeScreenshots().catch(console.error);