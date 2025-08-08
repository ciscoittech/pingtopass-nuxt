# Testing Guide for PingToPass Platform

## Overview

This guide provides comprehensive documentation for testing the PingToPass certification platform. Our testing framework ensures 85% overall code coverage with 100% coverage on critical paths (authentication, payments, scoring).

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Stack](#testing-stack)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Running Tests](#running-tests)
- [CI/CD Pipeline](#cicd-pipeline)
- [Best Practices](#best-practices)

## Testing Philosophy

### Test-Driven Development (TDD)

We follow TDD methodology:
1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while tests pass

### Testing Pyramid

```
         /\
        /  \  E2E Tests (10%)
       /    \  - Critical user journeys
      /------\  Integration Tests (30%)
     /        \  - API endpoints, DB operations
    /----------\  Unit Tests (60%)
   /            \  - Components, utilities, functions
```

### Coverage Requirements

| Category | Target | Required |
|----------|--------|----------|
| Overall | 85% | Yes |
| Critical Paths | 100% | Yes |
| API Routes | 90% | Yes |
| UI Components | 80% | Yes |
| Utilities | 90% | Yes |

## Testing Stack

### Unit Testing
- **Framework**: Vitest
- **Component Testing**: @vue/test-utils
- **DOM Environment**: happy-dom / jsdom
- **Mocking**: MSW (Mock Service Worker)

### E2E Testing
- **Framework**: Playwright
- **Browsers**: Chrome, Firefox, Safari
- **Mobile**: iOS Safari, Android Chrome

### Performance Testing
- **Tools**: Playwright performance APIs
- **Metrics**: Core Web Vitals, response times
- **Target**: <200ms API responses

### Accessibility Testing
- **Standard**: WCAG 2.1 AA
- **Tools**: Playwright accessibility APIs
- **Testing**: Keyboard navigation, screen readers

## Test Structure

```
tests/
├── unit/                    # Vitest unit tests
│   ├── components/         # Vue component tests
│   │   ├── QuestionCard.test.ts
│   │   ├── StudyProgress.test.ts
│   │   └── ExamTimer.test.ts
│   ├── server/            # API route tests
│   │   ├── api/
│   │   │   ├── auth.test.ts
│   │   │   ├── questions.test.ts
│   │   │   └── sessions.test.ts
│   │   └── utils/
│   │       └── database.test.ts
│   ├── stores/            # Pinia store tests
│   └── utils/             # Utility function tests
├── e2e/                   # Playwright E2E tests
│   ├── authentication.spec.ts
│   ├── study-session.spec.ts
│   ├── performance.perf.spec.ts
│   ├── visual.visual.spec.ts
│   └── accessibility.a11y.spec.ts
├── factories/             # Test data factories
│   ├── user.factory.ts
│   ├── question.factory.ts
│   └── exam.factory.ts
├── helpers/               # Test utilities
│   ├── database.ts       # In-memory DB setup
│   ├── auth.ts          # Auth mocking
│   ├── msw.ts           # API mocking
│   └── ai-mocks.ts      # AI service mocks
└── setup/                # Test configuration
    └── vitest.setup.ts
```

## Writing Tests

### Unit Tests

#### Component Testing

```typescript
// tests/unit/components/QuestionCard.test.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import QuestionCard from '~/components/QuestionCard.vue'
import { questionFactory } from '~/tests/factories'

describe('QuestionCard', () => {
  it('should render question text', () => {
    const question = questionFactory.build()
    const wrapper = mount(QuestionCard, {
      props: { question }
    })
    
    expect(wrapper.text()).toContain(question.text)
  })
  
  it('should emit answer-selected event', async () => {
    const question = questionFactory.build()
    const wrapper = mount(QuestionCard, {
      props: { question }
    })
    
    await wrapper.find('[data-testid="answer-0"]').trigger('click')
    
    expect(wrapper.emitted('answer-selected')).toBeTruthy()
    expect(wrapper.emitted('answer-selected')[0]).toEqual([0])
  })
})
```

#### API Testing

```typescript
// tests/unit/server/api/questions.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { setupTestDatabase } from '~/tests/helpers/database'
import { createTestClient } from '~/tests/helpers/client'
import { questionFactory } from '~/tests/factories'

describe('Questions API', () => {
  let db: TestDatabase
  let client: TestClient
  
  beforeEach(async () => {
    db = await setupTestDatabase()
    client = createTestClient()
  })
  
  it('should return questions for exam', async () => {
    const questions = await questionFactory.createMany(10, { examId: 'exam-1' })
    await db.insert('questions', questions)
    
    const response = await client.get('/api/questions?examId=exam-1')
    
    expect(response.status).toBe(200)
    expect(response.data.questions).toHaveLength(10)
  })
  
  it('should enforce <200ms response time', async () => {
    const start = performance.now()
    await client.get('/api/questions')
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(200)
  })
})
```

### E2E Tests

#### User Flow Testing

```typescript
// tests/e2e/study-session.spec.ts
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { seedDatabase } from './helpers/database'

test.describe('Study Session', () => {
  test.beforeEach(async ({ page }) => {
    await seedDatabase()
    await loginAs(page, 'test@example.com')
  })
  
  test('complete study session workflow', async ({ page }) => {
    // Navigate to exam selection
    await page.goto('/exams')
    await page.click('[data-testid="exam-aws-saa"]')
    
    // Start study session
    await page.click('[data-testid="start-study"]')
    await expect(page).toHaveURL(/\/study\//)
    
    // Answer questions
    for (let i = 0; i < 10; i++) {
      await page.click('[data-testid="answer-0"]')
      await page.click('[data-testid="next-question"]')
    }
    
    // View results
    await expect(page.locator('[data-testid="session-complete"]')).toBeVisible()
    await expect(page.locator('[data-testid="score"]')).toContainText('Score:')
  })
})
```

#### Performance Testing

```typescript
// tests/e2e/performance.perf.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Performance', () => {
  test('meets Core Web Vitals targets', async ({ page }) => {
    await page.goto('/')
    
    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          resolve({
            lcp: entries.find(e => e.entryType === 'largest-contentful-paint')?.startTime,
            fid: entries.find(e => e.entryType === 'first-input')?.processingStart,
            cls: entries.reduce((sum, e) => e.entryType === 'layout-shift' ? sum + e.value : sum, 0)
          })
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
      })
    })
    
    expect(metrics.lcp).toBeLessThan(2500) // Good LCP
    expect(metrics.fid).toBeLessThan(100)  // Good FID
    expect(metrics.cls).toBeLessThan(0.1)  // Good CLS
  })
})
```

## Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Unit tests with watch mode (TDD)
npm run test:watch

# Unit tests with coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Performance tests
npm run test:perf

# Accessibility tests
npm run test:a11y

# Visual regression tests
npm run test:visual

# Full test suite
npm run test:all
```

### Test Filtering

```bash
# Run specific test file
npm test QuestionCard

# Run tests matching pattern
npm test -- --grep "auth"

# Run single E2E test
npm run test:e2e -- --grep "login"

# Run tests in specific browser
npm run test:e2e -- --project=firefox
```

### Debugging Tests

```bash
# Debug unit tests
npm run test:debug

# Debug E2E tests with headed browser
npm run test:e2e:debug

# Generate Playwright trace
npm run test:e2e -- --trace on
```

## CI/CD Pipeline

### GitHub Actions Workflow

Our CI/CD pipeline runs on every push and PR:

1. **Lint & Type Check** - Ensures code quality
2. **Unit Tests** - Runs in parallel across 4 shards
3. **E2E Tests** - Tests across 3 browsers in parallel
4. **Coverage Report** - Enforces 85% threshold
5. **Performance Tests** - Validates <200ms responses
6. **Accessibility Tests** - WCAG 2.1 AA compliance
7. **Visual Regression** - Detects UI changes

### PR Comments

The pipeline automatically comments on PRs with:
- Coverage report with percentages
- Performance metrics
- Accessibility violations
- Preview deployment URL

## Best Practices

### General Guidelines

1. **Write tests first** - Follow TDD methodology
2. **Test behavior, not implementation** - Focus on user outcomes
3. **Keep tests isolated** - Each test should be independent
4. **Use factories** - Generate consistent test data
5. **Mock external services** - Use MSW for API mocking
6. **Test edge cases** - Empty states, errors, loading
7. **Maintain test coverage** - Never drop below thresholds

### Component Testing

```typescript
// DO: Test user interactions
it('should allow answer selection', async () => {
  await wrapper.find('[data-testid="answer"]').trigger('click')
  expect(wrapper.emitted('select')).toBeTruthy()
})

// DON'T: Test implementation details
it('should set internal state', () => {
  expect(wrapper.vm.internalState).toBe(true) // Avoid!
})
```

### API Testing

```typescript
// DO: Test response contracts
it('should return question with required fields', async () => {
  const response = await client.get('/api/questions/1')
  expect(response.data).toMatchObject({
    id: expect.any(String),
    text: expect.any(String),
    answers: expect.arrayContaining([
      expect.objectContaining({
        id: expect.any(String),
        text: expect.any(String)
      })
    ])
  })
})

// DO: Test performance requirements
it('should respond within 200ms', async () => {
  const start = Date.now()
  await client.get('/api/questions')
  expect(Date.now() - start).toBeLessThan(200)
})
```

### E2E Testing

```typescript
// DO: Test complete user journeys
test('user can complete exam', async ({ page }) => {
  await loginAs(page, 'user@example.com')
  await startExam(page, 'AWS-SAA')
  await completeQuestions(page, 10)
  await expect(page.locator('[data-testid="results"]')).toBeVisible()
})

// DON'T: Test individual UI elements
test('button is blue', async ({ page }) => {
  // Too granular for E2E - use unit tests instead
})
```

### Test Data

```typescript
// DO: Use factories for consistent data
const user = userFactory.build({
  subscription: 'premium'
})

// DON'T: Use hardcoded test data
const user = {
  id: '123',
  email: 'test@test.com',
  subscription: 'premium'
}
```

### Async Testing

```typescript
// DO: Use proper async/await
it('should load data', async () => {
  const data = await fetchData()
  expect(data).toBeDefined()
})

// DON'T: Forget to await async operations
it('should load data', () => {
  const data = fetchData() // Missing await!
  expect(data).toBeDefined()
})
```

## Troubleshooting

### Common Issues

#### Tests Timing Out
- Increase timeout: `test.setTimeout(30000)`
- Check for missing awaits
- Verify mock server is running

#### Flaky E2E Tests
- Add explicit waits: `await page.waitForSelector()`
- Use data-testid attributes
- Ensure proper test isolation

#### Coverage Not Met
- Run coverage report: `npm run test:coverage`
- Check untested files in coverage/index.html
- Focus on critical paths first

#### Database Conflicts
- Use transactions with rollback
- Clear database between tests
- Use unique test data

### Debug Commands

```bash
# Verbose test output
npm test -- --reporter=verbose

# Show test execution time
npm test -- --reporter=default --reporter=time

# Generate HTML coverage report
npm run test:coverage && open coverage/index.html

# Record Playwright videos
npm run test:e2e -- --video=on

# Save Playwright traces
npm run test:e2e -- --trace=on
```

## Resources

- [Vitest Documentation](https://vitest.dev)
- [Vue Test Utils](https://test-utils.vuejs.org)
- [Playwright Documentation](https://playwright.dev)
- [MSW Documentation](https://mswjs.io)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

## Support

For testing questions or issues:
1. Check this guide first
2. Review existing tests for examples
3. Ask in #testing Slack channel
4. Create an issue in GitHub

---

Remember: **Good tests enable confident deployments!**