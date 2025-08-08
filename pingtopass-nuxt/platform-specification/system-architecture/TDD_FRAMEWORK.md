# Test-Driven Development Framework - PingToPass

## Overview

PingToPass follows strict Test-Driven Development (TDD) practices with comprehensive testing at all levels using Vitest for unit/integration tests and Playwright for E2E tests. All database operations use Drizzle ORM for type-safe testing.

## Testing Philosophy

### TDD Cycle
1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

### Coverage Requirements
- **Critical Paths**: 100% (auth, payments, scoring)
- **API Routes**: 90% coverage
- **UI Components**: 80% coverage
- **Overall Target**: 85% minimum

## Testing Stack

### Tools & Frameworks
- **Unit/Integration**: Vitest + @nuxt/test-utils
- **E2E Testing**: Playwright
- **Database**: Drizzle ORM with in-memory SQLite for tests
- **API Testing**: Supertest-like utilities via Nuxt test utils
- **Component Testing**: @testing-library/vue
- **Coverage**: Vitest coverage with c8

### Installation

```bash
# Install testing dependencies
pnpm add -D vitest @nuxt/test-utils @vitest/ui
pnpm add -D @playwright/test
pnpm add -D @testing-library/vue @testing-library/user-event
pnpm add -D @faker-js/faker
pnpm add -D drizzle-orm better-sqlite3  # For test database
```

## Configuration

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '.nuxt/',
        '.output/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.ts',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 85,
        statements: 85,
      },
    },
    include: ['**/*.{test,spec}.{js,ts,vue}'],
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './'),
      '@': resolve(__dirname, './'),
    },
  },
});
```

### Test Database Setup

```typescript
// tests/setup.ts
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '~/server/database/schema';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

// Create in-memory test database
const sqlite = new Database(':memory:');
export const testDb = drizzle(sqlite, { schema });

beforeAll(async () => {
  // Run migrations on test database
  await migrate(testDb, { migrationsFolder: './server/database/migrations' });
});

beforeEach(async () => {
  // Clear all tables before each test
  await testDb.delete(schema.userAnswers);
  await testDb.delete(schema.studySessions);
  await testDb.delete(schema.userProgress);
  await testDb.delete(schema.answerOptions);
  await testDb.delete(schema.questions);
  await testDb.delete(schema.exams);
  await testDb.delete(schema.users);
});

afterAll(() => {
  sqlite.close();
});

// Mock Turso client for tests
vi.mock('~/server/utils/database', () => ({
  db: testDb,
}));
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Categories

### 1. Unit Tests - Drizzle Schema & Database Operations

```typescript
// tests/unit/database/schema.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { testDb } from '~/tests/setup';
import { users, exams, questions } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import { generateId } from '~/server/utils/ids';

describe('Database Schema - Users', () => {
  it('should create a user with Google OAuth', async () => {
    // Given: User data from Google OAuth
    const userData = {
      id: generateId(),
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'google-123',
    };
    
    // When: Creating user with Drizzle
    const [user] = await testDb
      .insert(users)
      .values(userData)
      .returning();
    
    // Then: User should be created with defaults
    expect(user.email).toBe('test@example.com');
    expect(user.subscriptionTier).toBe('free');
    expect(user.createdAt).toBeDefined();
  });
  
  it('should enforce unique constraints', async () => {
    // Given: Existing user
    await testDb.insert(users).values({
      id: generateId(),
      email: 'unique@example.com',
      googleId: 'google-456',
    });
    
    // When/Then: Inserting duplicate should fail
    await expect(
      testDb.insert(users).values({
        id: generateId(),
        email: 'unique@example.com',
        googleId: 'google-789',
      })
    ).rejects.toThrow(/UNIQUE constraint/);
  });
});

describe('Database Relations', () => {
  it('should cascade delete questions when exam is deleted', async () => {
    // Given: Exam with questions
    const [exam] = await testDb
      .insert(exams)
      .values({
        id: generateId(),
        code: 'TEST-101',
        name: 'Test Exam',
        vendor: 'TestVendor',
        passingScore: 70,
        totalQuestions: 60,
      })
      .returning();
    
    await testDb.insert(questions).values({
      id: generateId(),
      examId: exam.id,
      type: 'single',
      text: 'Test question?',
      difficulty: 3,
    });
    
    // When: Deleting exam
    await testDb.delete(exams).where(eq(exams.id, exam.id));
    
    // Then: Questions should be deleted
    const remainingQuestions = await testDb
      .select()
      .from(questions)
      .where(eq(questions.examId, exam.id));
    
    expect(remainingQuestions).toHaveLength(0);
  });
});
```

### 2. API Route Tests

```typescript
// tests/unit/api/auth.test.ts
import { describe, it, expect, vi } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils';

describe('API - Authentication', () => {
  await setup({
    // Nuxt test setup
  });
  
  it('POST /api/auth/google - should create user and return JWT', async () => {
    // Given: Mock Google OAuth response
    vi.mock('~/server/utils/google', () => ({
      exchangeCodeForTokens: vi.fn().mockResolvedValue({
        access_token: 'mock-token',
      }),
      fetchGoogleUserInfo: vi.fn().mockResolvedValue({
        id: 'google-123',
        email: 'user@gmail.com',
        name: 'John Doe',
      }),
    }));
    
    // When: Calling auth endpoint
    const response = await $fetch('/api/auth/google', {
      method: 'POST',
      body: { code: 'mock-auth-code' },
    });
    
    // Then: Should return token and user
    expect(response.token).toBeDefined();
    expect(response.user.email).toBe('user@gmail.com');
  });
  
  it('GET /api/auth/verify - should verify JWT and return user', async () => {
    // Given: Valid JWT token
    const token = 'valid.jwt.token';
    
    // When: Verifying token
    const response = await $fetch('/api/auth/verify', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    // Then: Should return user data
    expect(response.email).toBeDefined();
  });
});
```

### 3. Service Layer Tests with Drizzle

```typescript
// tests/unit/services/questionService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { QuestionService } from '~/server/services/questionService';
import { testDb } from '~/tests/setup';
import { exams, questions, answerOptions } from '~/server/database/schema';
import { faker } from '@faker-js/faker';

describe('QuestionService', () => {
  let service: QuestionService;
  let testExam: any;
  
  beforeEach(async () => {
    service = new QuestionService(testDb);
    
    // Create test exam
    [testExam] = await testDb
      .insert(exams)
      .values({
        id: generateId(),
        code: 'TEST-EXAM',
        name: 'Test Certification',
        vendor: 'TestVendor',
        passingScore: 70,
        totalQuestions: 60,
      })
      .returning();
  });
  
  describe('getRandomQuestions', () => {
    it('should return random questions for practice mode', async () => {
      // Given: 100 questions in database
      const questionData = Array.from({ length: 100 }, (_, i) => ({
        id: generateId(),
        examId: testExam.id,
        type: 'single' as const,
        text: faker.lorem.sentence(),
        difficulty: faker.number.int({ min: 1, max: 5 }),
      }));
      
      await testDb.insert(questions).values(questionData);
      
      // When: Getting 20 random questions
      const result = await service.getRandomQuestions(testExam.id, 20);
      
      // Then: Should return 20 unique questions
      expect(result).toHaveLength(20);
      const uniqueIds = new Set(result.map(q => q.id));
      expect(uniqueIds.size).toBe(20);
    });
    
    it('should filter by difficulty when specified', async () => {
      // Given: Questions with different difficulties
      await testDb.insert(questions).values([
        { id: '1', examId: testExam.id, type: 'single', text: 'Easy', difficulty: 1 },
        { id: '2', examId: testExam.id, type: 'single', text: 'Medium', difficulty: 3 },
        { id: '3', examId: testExam.id, type: 'single', text: 'Hard', difficulty: 5 },
      ]);
      
      // When: Getting only hard questions
      const result = await service.getRandomQuestions(testExam.id, 10, { difficulty: 5 });
      
      // Then: Should only return hard questions
      expect(result).toHaveLength(1);
      expect(result[0].difficulty).toBe(5);
    });
  });
  
  describe('validateAnswer', () => {
    it('should correctly validate single-choice answers', async () => {
      // Given: Question with answers
      const [question] = await testDb
        .insert(questions)
        .values({
          id: generateId(),
          examId: testExam.id,
          type: 'single',
          text: 'What is 2 + 2?',
          difficulty: 1,
        })
        .returning();
      
      const answers = await testDb
        .insert(answerOptions)
        .values([
          { id: 'a1', questionId: question.id, text: '3', isCorrect: false, order: 0 },
          { id: 'a2', questionId: question.id, text: '4', isCorrect: true, order: 1 },
          { id: 'a3', questionId: question.id, text: '5', isCorrect: false, order: 2 },
        ])
        .returning();
      
      // When/Then: Validating answers
      expect(await service.validateAnswer(question.id, ['a2'])).toBe(true);
      expect(await service.validateAnswer(question.id, ['a1'])).toBe(false);
    });
  });
});
```

### 4. Component Tests

```typescript
// tests/unit/components/QuestionCard.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/vue';
import QuestionCard from '~/components/QuestionCard.vue';
import { createPinia } from 'pinia';

describe('QuestionCard Component', () => {
  const mockQuestion = {
    id: 'q1',
    text: 'What is Vue.js?',
    type: 'single',
    answers: [
      { id: 'a1', text: 'A JavaScript framework', isCorrect: true },
      { id: 'a2', text: 'A database', isCorrect: false },
      { id: 'a3', text: 'A CSS library', isCorrect: false },
    ],
  };
  
  it('should render question and answers', () => {
    // Given/When: Rendering component
    render(QuestionCard, {
      props: { question: mockQuestion },
      global: {
        plugins: [createPinia()],
      },
    });
    
    // Then: Question and answers should be visible
    expect(screen.getByText('What is Vue.js?')).toBeInTheDocument();
    expect(screen.getByText('A JavaScript framework')).toBeInTheDocument();
    expect(screen.getByText('A database')).toBeInTheDocument();
  });
  
  it('should emit answer selection', async () => {
    // Given: Rendered component
    const { emitted } = render(QuestionCard, {
      props: { question: mockQuestion },
      global: {
        plugins: [createPinia()],
      },
    });
    
    // When: Selecting an answer
    const firstAnswer = screen.getByLabelText('A JavaScript framework');
    await fireEvent.click(firstAnswer);
    
    // Then: Should emit selection event
    expect(emitted()['answer-selected']).toBeTruthy();
    expect(emitted()['answer-selected'][0]).toEqual([['a1']]);
  });
  
  it('should show explanation after submission', async () => {
    // Given: Component with explanation
    const questionWithExplanation = {
      ...mockQuestion,
      explanation: 'Vue.js is a progressive JavaScript framework',
    };
    
    const { rerender } = render(QuestionCard, {
      props: { 
        question: questionWithExplanation,
        showExplanation: false,
      },
      global: {
        plugins: [createPinia()],
      },
    });
    
    // When: Showing explanation
    await rerender({ showExplanation: true });
    
    // Then: Explanation should be visible
    expect(screen.getByText(/Vue.js is a progressive/)).toBeInTheDocument();
  });
});
```

### 5. Integration Tests

```typescript
// tests/integration/studySession.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setup, $fetch } from '@nuxt/test-utils';
import { testDb } from '~/tests/setup';
import { users, exams, questions, studySessions } from '~/server/database/schema';

describe('Study Session Flow', () => {
  let authToken: string;
  let testUser: any;
  let testExam: any;
  
  beforeEach(async () => {
    await setup({});
    
    // Create test user with Drizzle
    [testUser] = await testDb
      .insert(users)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
      })
      .returning();
    
    // Create test exam and questions
    [testExam] = await testDb
      .insert(exams)
      .values({
        id: 'exam-1',
        code: 'TEST-101',
        name: 'Test Exam',
        vendor: 'Test',
        passingScore: 70,
        totalQuestions: 3,
      })
      .returning();
    
    // Generate auth token
    authToken = generateTestToken(testUser.id);
  });
  
  it('should complete full study session flow', async () => {
    // Step 1: Start session
    const session = await $fetch('/api/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: {
        examId: testExam.id,
        mode: 'practice',
        questionCount: 3,
      },
    });
    
    expect(session.id).toBeDefined();
    expect(session.mode).toBe('practice');
    
    // Step 2: Get questions
    const questions = await $fetch('/api/questions', {
      query: { examId: testExam.id, limit: 3 },
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    expect(questions).toHaveLength(3);
    
    // Step 3: Submit answers
    for (const question of questions) {
      const answer = await $fetch(`/api/sessions/${session.id}/answer`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {
          questionId: question.id,
          selectedOptionIds: [question.answers[0].id],
          timeSpent: 30,
        },
      });
      
      expect(answer.isCorrect).toBeDefined();
    }
    
    // Step 4: Complete session
    const result = await $fetch(`/api/sessions/${session.id}/complete`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    expect(result.score).toBeDefined();
    expect(result.correctCount).toBeLessThanOrEqual(3);
    
    // Step 5: Verify progress update
    const progress = await $fetch('/api/progress', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    expect(progress).toHaveLength(1);
    expect(progress[0].questionsAnswered).toBe(3);
  });
});
```

### 6. E2E Tests with Playwright

```typescript
// tests/e2e/examFlow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Exam Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.click('button:has-text("Sign in with Google")');
    // Handle OAuth flow...
  });
  
  test('should complete practice exam', async ({ page }) => {
    // Navigate to exam selection
    await page.goto('/exams');
    
    // Select CCNA exam
    await page.click('text=CCNA 200-301');
    
    // Start practice session
    await page.click('button:has-text("Start Practice")');
    
    // Answer questions
    for (let i = 0; i < 10; i++) {
      // Select first answer
      await page.click('input[type="radio"]', { nth: 0 });
      await page.click('button:has-text("Submit Answer")');
      
      // Check explanation is shown
      await expect(page.locator('.explanation')).toBeVisible();
      
      // Next question
      if (i < 9) {
        await page.click('button:has-text("Next Question")');
      }
    }
    
    // Complete session
    await page.click('button:has-text("Finish Session")');
    
    // Verify results page
    await expect(page.locator('h1:has-text("Session Results")')).toBeVisible();
    await expect(page.locator('.score')).toContainText('%');
  });
  
  test('should handle timed exam with countdown', async ({ page }) => {
    await page.goto('/exams/CCNA-200-301');
    
    // Start timed exam
    await page.click('button:has-text("Start Timed Exam")');
    
    // Verify timer is visible
    await expect(page.locator('.timer')).toBeVisible();
    
    // Timer should be counting down
    const initialTime = await page.locator('.timer').textContent();
    await page.waitForTimeout(2000);
    const newTime = await page.locator('.timer').textContent();
    expect(initialTime).not.toBe(newTime);
  });
});
```

## Test Data Management

### Test Factories with Drizzle

```typescript
// tests/factories/index.ts
import { faker } from '@faker-js/faker';
import { testDb } from '~/tests/setup';
import { users, exams, questions, answerOptions } from '~/server/database/schema';
import { generateId } from '~/server/utils/ids';

export const UserFactory = {
  async create(overrides = {}) {
    const [user] = await testDb
      .insert(users)
      .values({
        id: generateId(),
        email: faker.internet.email(),
        name: faker.person.fullName(),
        googleId: faker.string.uuid(),
        ...overrides,
      })
      .returning();
    return user;
  },
};

export const ExamFactory = {
  async create(overrides = {}) {
    const [exam] = await testDb
      .insert(exams)
      .values({
        id: generateId(),
        code: faker.string.alphanumeric(10).toUpperCase(),
        name: faker.company.name() + ' Certification',
        vendor: faker.company.name(),
        passingScore: faker.number.int({ min: 65, max: 85 }),
        totalQuestions: faker.number.int({ min: 40, max: 100 }),
        ...overrides,
      })
      .returning();
    return exam;
  },
};

export const QuestionFactory = {
  async createWithAnswers(examId: string, overrides = {}) {
    const [question] = await testDb
      .insert(questions)
      .values({
        id: generateId(),
        examId,
        type: 'single',
        text: faker.lorem.sentence() + '?',
        difficulty: faker.number.int({ min: 1, max: 5 }),
        ...overrides,
      })
      .returning();
    
    // Create 4 answers, one correct
    const answers = await testDb
      .insert(answerOptions)
      .values(
        Array.from({ length: 4 }, (_, i) => ({
          id: generateId(),
          questionId: question.id,
          text: faker.lorem.sentence(),
          isCorrect: i === 0,
          order: i,
        }))
      )
      .returning();
    
    return { question, answers };
  },
};
```

### Seed Data for Tests

```typescript
// tests/seeds/testData.ts
import { testDb } from '~/tests/setup';
import { ExamFactory, QuestionFactory } from '~/tests/factories';

export async function seedTestDatabase() {
  // Create standard test exams
  const ccna = await ExamFactory.create({
    code: 'CCNA-200-301',
    name: 'Cisco Certified Network Associate',
    vendor: 'Cisco',
    passingScore: 82.5,
    totalQuestions: 102,
  });
  
  // Create 50 questions for CCNA
  for (let i = 0; i < 50; i++) {
    await QuestionFactory.createWithAnswers(ccna.id);
  }
  
  return { ccna };
}
```

## Test Commands

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:watch": "vitest watch",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:ui": "playwright test --ui",
    "test:integration": "vitest run tests/integration",
    "test:api": "vitest run tests/unit/api",
    "test:components": "vitest run tests/unit/components",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage && playwright test",
    "test:all": "pnpm test:unit && pnpm test:e2e"
  }
}
```

## CI/CD Testing

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:unit
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - run: pnpm install --frozen-lockfile
      - run: pnpx playwright install --with-deps
      - run: pnpm build
      - run: pnpm test:e2e
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Performance Testing

### Load Testing with k6

```javascript
// tests/performance/load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function () {
  // Test exam list endpoint
  const examsRes = http.get('https://pingtopass.com/api/exams');
  check(examsRes, {
    'exams status is 200': (r) => r.status === 200,
    'exams response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
  
  // Test question endpoint
  const questionsRes = http.get('https://pingtopass.com/api/questions?examId=ccna&limit=20');
  check(questionsRes, {
    'questions status is 200': (r) => r.status === 200,
    'questions returned': (r) => JSON.parse(r.body).length > 0,
  });
  
  sleep(1);
}
```

## Best Practices

### 1. Test Organization
- Group related tests in describe blocks
- Use clear, descriptive test names
- Follow AAA pattern: Arrange, Act, Assert
- Keep tests independent and isolated

### 2. Database Testing with Drizzle
- Use transactions for test isolation
- Clean up after each test
- Use factories for consistent test data
- Test both success and error cases

### 3. API Testing
- Test authentication and authorization
- Validate response schemas
- Test error handling
- Check performance requirements

### 4. Component Testing
- Test user interactions
- Verify accessibility
- Test loading and error states
- Mock external dependencies

### 5. E2E Testing
- Test critical user journeys
- Use page objects for maintainability
- Test on multiple browsers/devices
- Keep tests stable and reliable

## Debugging Tests

### Vitest Debugging

```bash
# Run tests in debug mode
node --inspect-brk ./node_modules/.bin/vitest run

# Use VS Code debugger
# Add to .vscode/launch.json:
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test:debug"],
  "console": "integratedTerminal"
}
```

### Playwright Debugging

```bash
# Debug mode with browser
pnpm test:e2e:debug

# Headed mode
pnpm playwright test --headed

# Slow motion
pnpm playwright test --headed --slow-mo=1000

# Single test file
pnpm playwright test tests/e2e/auth.spec.ts
```

## Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html

# Coverage badges for README
# Use coverage/coverage-summary.json
```

## Test Documentation

Every test file should include:
1. Purpose of the test suite
2. Setup requirements
3. External dependencies
4. Known limitations

Example:
```typescript
/**
 * @description Tests for exam question delivery API
 * @requires Test database with seeded exam data
 * @mocks Google OAuth, Stripe API
 * @coverage Target: 95% for all API routes
 */
```