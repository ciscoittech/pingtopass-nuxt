import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';
import { join } from 'path';

const pages = [
  { name: 'homepage', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'dashboard', path: '/dashboard' },
  { name: 'exams', path: '/exams' },
  { name: 'terms', path: '/terms' },
  { name: 'privacy', path: '/privacy' },
  { name: 'dev-login', path: '/dev-login' }
];

async function takeScreenshots() {
  const screenshotDir = join(process.cwd(), 'screenshots-final');
  await mkdir(screenshotDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 2
  });

  // Set dev auth for authenticated pages
  await context.addCookies([]);
  const page = await context.newPage();

  // Set localStorage for dev auth
  await page.goto('http://localhost:3000');
  await page.evaluate(() => {
    const devUser = {
      id: 'dev-auto-001',
      email: 'dev@test.com',
      name: 'Dev User',
      role: 'student',
      subscription: 'premium',
      exams: ['comptia-network-plus', 'comptia-security-plus', 'cisco-ccna'],
      progress: {
        totalQuestions: 500,
        correctAnswers: 425,
        studyStreak: 7,
        level: 4
      }
    };
    localStorage.setItem('dev-auth-user', JSON.stringify(devUser));
    localStorage.setItem('dev-auth-token', `dev-auto-token-${Date.now()}`);
  });

  for (const pageInfo of pages) {
    console.log(`📸 Taking screenshot of ${pageInfo.name} (${pageInfo.path})`);
    await page.goto(`http://localhost:3000${pageInfo.path}`);
    await page.waitForTimeout(2000); // Wait for animations
    
    const screenshotPath = join(screenshotDir, `${pageInfo.name}.png`);
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`✅ Saved ${pageInfo.name}.png`);
  }

  await browser.close();
  console.log('\n🎉 All screenshots taken successfully!');
  console.log(`📁 Screenshots saved to: ${screenshotDir}`);
}

takeScreenshots().catch(console.error);