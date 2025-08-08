# PingToPass Testing Framework

A comprehensive testing suite for the PingToPass IT certification platform, ensuring 85%+ coverage and robust quality assurance.

## 🧪 Testing Stack

- **Unit/Integration**: [Vitest](https://vitest.dev/) with Nuxt Test Utils
- **E2E Testing**: [Playwright](https://playwright.dev/) with multi-browser support
- **API Mocking**: [MSW (Mock Service Worker)](https://mswjs.io/)
- **Test Data**: [@faker-js/faker](https://fakerjs.dev/) with custom factories
- **Coverage**: Vitest with v8 provider
- **Visual Testing**: Playwright screenshot comparison
- **Accessibility**: Playwright with WCAG 2.1 AA compliance

## 🎯 Testing Strategy

### Coverage Goals
- **Overall Target**: 85% coverage
- **Critical Paths**: 100% coverage (auth, payments, scoring)
- **API Routes**: 90% coverage
- **UI Components**: 80% coverage

### Test Types
1. **Unit Tests** - Individual functions and components
2. **Integration Tests** - API endpoints and database operations
3. **E2E Tests** - Complete user workflows
4. **Performance Tests** - Load times and Core Web Vitals
5. **Visual Tests** - UI consistency across browsers
6. **Accessibility Tests** - WCAG compliance and screen reader support

## 🚀 Quick Start

### Installation
```bash
# Install all dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests
```bash
# Run all unit tests
npm run test

# Run tests in watch mode (TDD)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run all E2E tests
npm run test:e2e

# Run specific test types
npm run test:perf      # Performance tests
npm run test:visual    # Visual regression
npm run test:a11y      # Accessibility tests

# Run complete test suite
npm run test:full
```

### Test Environment
```bash
# Copy environment template
cp .env.test .env.test.local

# Edit with your test values (if needed)
# Most tests use mocked services
```

## 📁 Test Structure

```
tests/
├── e2e/                     # End-to-end tests
│   ├── authentication.spec.ts
│   ├── study-session.spec.ts
│   ├── performance.perf.spec.ts
│   ├── visual.visual.spec.ts
│   └── accessibility.a11y.spec.ts
├── unit/                    # Unit tests
│   └── server/
│       └── api/
│           ├── auth.test.ts
│           ├── questions.test.ts
│           └── sessions.test.ts
├── factories/               # Test data factories
│   ├── user.factory.ts
│   ├── question.factory.ts
│   ├── session.factory.ts
│   └── index.ts
├── helpers/                 # Test utilities
│   ├── database.ts          # Database test helpers
│   ├── auth.ts              # Authentication mocks
│   ├── ai-mocks.ts          # AI service mocks
│   └── msw.ts               # API mocking setup
├── setup/
│   └── vitest.setup.ts      # Global test configuration
└── README.md                # This file
```

## 🔧 Configuration Files

### Vitest (`vitest.config.ts`)
- Nuxt 3 integration with `@nuxt/test-utils`
- Coverage thresholds and reporting
- Global test setup and mocks
- TypeScript support with path aliases

### Playwright (`playwright.config.ts`)
- Multi-browser testing (Chromium, Firefox, WebKit)
- Mobile device emulation
- Performance project configuration
- Visual regression setup
- Accessibility testing configuration

## 🛠️ Test Helpers

### Database Helpers (`tests/helpers/database.ts`)
```typescript
import { setupTestDatabase, resetTestDatabase } from '../helpers/database';

beforeEach(async () => {
  await resetTestDatabase();
});
```

### Authentication Helpers (`tests/helpers/auth.ts`)
```typescript
import { TEST_USERS, createAuthHeaders } from '../helpers/auth';

const headers = await createAuthHeaders(TEST_USERS.premium);
```

### API Mocking (`tests/helpers/msw.ts`)
```typescript
import { addMockHandlers } from '../helpers/msw';

addMockHandlers(
  http.get('/api/custom', () => HttpResponse.json({ data: 'test' }))
);
```

## 🏭 Test Factories

Generate consistent test data using factories:

```typescript
import { UserFactory, QuestionFactory, SessionFactory } from '../factories';

// Create single entities
const user = UserFactory.create({ subscription_status: 'premium' });
const question = QuestionFactory.create({ difficulty: 3 });
const session = SessionFactory.create({ exam_id: 1 });

// Create batches
const users = UserFactory.createBatch(10);
const questions = QuestionFactory.createBatch(50);
```

## 📊 Coverage Reporting

Coverage reports are generated in multiple formats:

- **HTML**: `coverage/index.html` - Interactive browser report
- **JSON**: `coverage/coverage-summary.json` - CI/CD integration
- **LCOV**: `coverage/lcov.info` - Third-party tool integration
- **Text**: Console output during test runs

### Viewing Coverage
```bash
# Generate and open HTML report
npm run test:coverage
open coverage/index.html
```

## 🎭 E2E Testing Patterns

### Authentication Setup
```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('auth_token', 'test_token');
    localStorage.setItem('user', JSON.stringify({
      id: 1,
      email: 'test@example.com',
      subscription_status: 'premium'
    }));
  });
});
```

### API Route Mocking
```typescript
await page.route('**/api/questions', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ questions: mockQuestions })
  });
});
```

### Performance Assertions
```typescript
const start = performance.now();
await page.click('[data-test="start-session"]');
const duration = performance.now() - start;

expect(duration).toBeLessThan(200); // Under 200ms
```

## 🎨 Visual Testing

Visual regression tests capture and compare screenshots:

```typescript
// Full page screenshot
await expect(page).toHaveScreenshot('dashboard.png');

// Component screenshot
await expect(page.locator('[data-test="exam-card"]'))
  .toHaveScreenshot('exam-card.png');

// Responsive screenshots
await page.setViewportSize({ width: 375, height: 667 });
await expect(page).toHaveScreenshot('mobile-dashboard.png');
```

### Managing Visual Baselines
```bash
# Update all screenshots
npx playwright test --update-snapshots

# Update specific test
npx playwright test visual.visual.spec.ts --update-snapshots
```

## ♿ Accessibility Testing

Comprehensive WCAG 2.1 AA compliance testing:

```typescript
// Keyboard navigation
await page.keyboard.press('Tab');
const focused = await page.evaluate(() => 
  document.activeElement?.getAttribute('data-test')
);

// ARIA attributes
await expect(page.locator('[data-test="progress-bar"]'))
  .toHaveAttribute('role', 'progressbar');

// Color contrast (manual verification)
const styles = await page.locator('[data-test="button"]')
  .evaluate(el => window.getComputedStyle(el));
```

## 🚄 Performance Testing

Monitor critical performance metrics:

```typescript
// Page load times
const startTime = Date.now();
await page.goto('/dashboard');
const loadTime = Date.now() - startTime;
expect(loadTime).toBeLessThan(2000);

// Core Web Vitals
const vitals = await page.evaluate(() => {
  return new PerformanceObserver((list) => {
    // Collect LCP, FID, CLS metrics
  });
});

// API response times
const response = await page.waitForResponse('/api/questions');
expect(response.timing()).toBeLessThan(200);
```

## 🔍 Debugging Tests

### Interactive Debugging
```bash
# Debug mode with browser UI
npm run test:e2e:debug

# Playwright UI mode
npm run test:e2e:ui

# Vitest UI mode
npm run test:ui
```

### Common Debug Patterns
```typescript
// Pause test execution
await page.pause();

// Take screenshots for debugging
await page.screenshot({ path: 'debug.png' });

// Console logging
console.log('Current URL:', page.url());

// Wait for network activity
await page.waitForLoadState('networkidle');
```

## 📈 CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run tests
  run: npm run test:ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Test Artifacts
- Coverage reports → `coverage/`
- Playwright reports → `playwright-report/`
- Test results → `test-results/`
- Screenshots → `test-results/screenshots/`
- Videos → `test-results/videos/`

## 🎯 Best Practices

### Unit Tests
- Follow AAA pattern (Arrange, Act, Assert)
- Use descriptive test names
- Mock external dependencies
- Test edge cases and error conditions
- Maintain 90%+ coverage for critical paths

### E2E Tests
- Use data-test attributes for selectors
- Mock external services consistently
- Test complete user workflows
- Include error scenarios
- Verify performance requirements

### Test Data
- Use factories for consistent data generation
- Isolate tests with database resets
- Use realistic test data
- Mock time-sensitive operations

### Performance
- Set realistic performance budgets
- Test on various network conditions
- Monitor Core Web Vitals
- Include mobile performance testing

## 🚨 Troubleshooting

### Common Issues

**Tests failing intermittently**
- Add proper wait conditions
- Use `waitForLoadState('networkidle')`
- Mock time-dependent operations

**Visual tests breaking**
- Check font loading
- Verify consistent viewport sizes
- Update screenshots after UI changes

**Coverage not meeting targets**
- Review uncovered files in HTML report
- Add tests for critical paths
- Check test file inclusion patterns

**Slow test execution**
- Use test parallelization
- Optimize database operations
- Mock heavy API calls

### Getting Help
- Check test logs in `test-results/`
- Review Playwright trace files
- Use debug mode for step-by-step debugging
- Verify environment setup

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Nuxt Testing Guide](https://nuxt.com/docs/getting-started/testing)
- [MSW Documentation](https://mswjs.io/docs/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Last Updated**: January 2024  
**Framework Version**: 1.0.0  
**Test Coverage**: Target 85%+